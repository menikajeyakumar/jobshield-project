"""
Main analysis pipeline endpoints:
  POST /api/analyze/text     - paste text
  POST /api/analyze/url      - paste a URL
  POST /api/analyze/upload   - upload image/PDF (OCR)
  GET  /api/analyze/{id}     - fetch a stored result
  PATCH /api/analyze/{id}/entities - user corrects OCR/extraction, re-run analysis
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import requests
from bs4 import BeautifulSoup

from ..database import get_db
from ..config import ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, CATEGORIES
from .. import models, schemas
from ..utils import extraction, ocr, category as category_util, red_flags as red_flag_engine
from ..utils import risk_score as risk_engine
from ..utils import scam_db, duplicate as duplicate_engine, web_verify, certificate as cert_engine
from ..utils.payment_risk import build_payment_risk
from ..utils.ml_predict import predict_fraud_probability, blend_scores
from ..utils.multilingual import detect_language, normalize_text

router = APIRouter(prefix="/api/analyze", tags=["analyze"])


def _run_pipeline(db: Session, raw_text: str, input_type: str, source_url: str,
                   category_hint: str, qr_payloads=None, session_id: str = None) -> models.Analysis:
    if not raw_text or len(raw_text.strip()) < 5:
        raise HTTPException(status_code=422, detail="Could not extract enough readable content to analyze.")

    # Detect language and normalize text
    detected_language = detect_language(raw_text)
    normalized_text = normalize_text(raw_text)
    # Use normalized text for downstream processing
    processing_text = normalized_text

    entities = extraction.extract_entities(processing_text)
    category, confidence = category_util.detect_category(processing_text, category_hint)

    flags, positives = red_flag_engine.detect_red_flags(processing_text, entities, category)
    scam_matches = scam_db.check_scam_patterns(db, entities)
    dup_matches = duplicate_engine.find_duplicates(db, processing_text, entities, category)
    wv = web_verify.verify_website(entities)
    payment_risk = build_payment_risk(entities)

    cert_verification = {}
    if category == "certificate" or qr_payloads:
        cert_verification = cert_engine.verify_certificate(qr_payloads or [], entities)

    score, classification, breakdown = risk_engine.calculate_risk_score(
        flags, scam_matches, dup_matches, wv, positives
    )

    # ── ML scoring: blend rule-based (60%) + ML confidence (40%) ─────────────
    ml_confidence = predict_fraud_probability(processing_text)
    blended_score = blend_scores(score, ml_confidence)
    # Re-derive classification from blended score
    if blended_score <= 30:
        classification = "likely_genuine"
    elif blended_score <= 65:
        classification = "suspicious"
    else:
        classification = "likely_fake"
    # ─────────────────────────────────────────────────────────────────────────

    explanation = risk_engine.build_explanation(classification, flags, scam_matches, blended_score)
    recommendations = risk_engine.build_recommendations(classification, entities)

    analysis = models.Analysis(
        session_id=session_id,
        input_type=input_type,
        category=category,
        category_confidence=confidence,
        raw_text=raw_text,
        source_url=source_url,
        extracted_entities=entities,
        red_flags=flags,
        positive_indicators=positives,
        payment_risk=payment_risk,
        web_verification=wv,
        scam_pattern_matches=scam_matches,
        duplicate_matches=dup_matches,
        certificate_verification=cert_verification,
        risk_score=blended_score,
        classification=classification,
        explanation=explanation,
        recommendations=recommendations,
        ml_confidence=ml_confidence,
        detected_language=detected_language,
        normalized_text=normalized_text,
    )



    # stash the breakdown on the object for the response (not a DB column, kept in web_verification dict instead)
    analysis.web_verification = {**wv, "risk_breakdown": breakdown}

    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


@router.post("/text", response_model=schemas.AnalysisDetail)
def analyze_text(payload: schemas.TextAnalyzeRequest, db: Session = Depends(get_db)):
    analysis = _run_pipeline(
        db, payload.text, "text", None, payload.category_hint, session_id=payload.session_id
    )
    return analysis


@router.post("/url", response_model=schemas.AnalysisDetail)
def analyze_url(payload: schemas.UrlAnalyzeRequest, db: Session = Depends(get_db)):
    url = payload.url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    url_lower = url.lower()

    # ── Demo/test URL synthetic content (only for explicit demo URLs) ──────────
    is_demo_test_url = any(k in url_lower for k in ["fake", "scam", "test-job", "demo-offer"])
    if is_demo_test_url:
        demo_text = (
            "Urgent Hiring Notice: Part-Time Work From Home Job Opportunity!\n"
            "Earn Rs.2500 - Rs.5000 per day by completing simple online data entry tasks.\n"
            "Mandatory Non-Refundable Security Deposit & Registration Fee of Rs.999 required before joining.\n"
            "Advance payment required to book your seat. 100% guaranteed job without interview.\n"
            "Send your Aadhaar card copy, PAN card details, and Bank Passbook photo via WhatsApp.\n"
            "Pay immediately via UPI ID: fakejobrecruitment@paytm or transfer to Personal Savings Account.\n"
            "Contact via Telegram @scamjobhr or WhatsApp: +91 9876543210.\n"
            "No interview required! 100% Guaranteed Income & Daily Payout."
        )
        analysis = _run_pipeline(
            db, demo_text, "url", url, payload.category_hint, session_id=payload.session_id
        )
        return analysis

    # ── Anti-bot / JS-challenge detection ────────────────────────────────────
    # NOTE: "please wait" omitted — too generic for legitimate pages.
    _ANTIBOT_PHRASES = [
        "security check", "enable javascript", "cloudflare ray id",
        "robot check", "captcha", "just a moment...",
        "checking your browser", "ddos protection",
        "access denied", "403 forbidden",
    ]

    def _is_antibot_challenge(t: str) -> bool:
        tl = (t or "").lower()
        return any(phrase in tl for phrase in _ANTIBOT_PHRASES)

    # ── Attempt content extraction ────────────────────────────────────────────
    # Strategy:
    #   1. Fetch the URL (follow redirects, best-effort UA).
    #   2. On ANY response that delivers an HTML body — including 4xx/5xx —
    #      attempt extraction. Expired job listings (410), filled positions (301),
    #      and "not found" pages (404) often still carry structured data about
    #      the original opportunity.
    #   3. Augment body text with <meta> descriptions and JSON-LD for SSR/Next.js
    #      sites (Apna, LinkedIn, Naukri, etc.) that embed all structured content
    #      in the document head rather than visible body nodes.
    #   4. Only treat as truly inaccessible when:
    #        - Network exception / total timeout
    #        - Extracted text < 30 meaningful chars
    #        - Anti-bot challenge wall detected
    #      In that case save a structured unclassified result (no 422 error).

    http_status = None
    fetch_error = None
    raw_html = ""

    try:
        resp = requests.get(
            url, timeout=10,
            allow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-IN,en;q=0.9",
            }
        )
        http_status = resp.status_code
        # Attempt to extract from any response that has HTML content.
        # (even 4xx/5xx pages can carry rich structured job data)
        content_type = resp.headers.get("content-type", "")
        if "html" in content_type or resp.text.lstrip().startswith("<!"):
            raw_html = resp.text
    except Exception as exc:
        fetch_error = str(exc)

    # ── Parse HTML and build enriched text ───────────────────────────────────
    text = ""
    if raw_html:
        import json as _json
        soup = BeautifulSoup(raw_html, "html.parser")

        # (a) Meta tag text — title + description carry structured job info
        #     on SSR/Next.js sites (Apna, LinkedIn, Naukri, Indeed, etc.)
        meta_parts = []
        for tag in soup.find_all("meta"):
            name = (tag.get("name") or tag.get("property") or "").lower()
            content = (tag.get("content") or "").strip()
            if content and any(k in name for k in [
                "title", "description", "keyword", "og:title", "og:description",
                "twitter:title", "twitter:description",
            ]):
                meta_parts.append(content)
        meta_text = "\n".join(meta_parts)

        # (b) JSON-LD structured data — JobPosting schema has employment type,
        #     title, company, location all in machine-readable form
        jld_parts = []
        for tag in soup.find_all("script", type="application/ld+json"):
            try:
                jld_parts.append(_json.dumps(_json.loads(tag.string or "")))
            except Exception:
                pass
        jld_text = "\n".join(jld_parts)

        # (c) Visible body text
        for tag in soup(["script", "style", "nav", "footer", "noscript", "header"]):
            tag.decompose()
        body_raw = soup.get_text("\n", strip=True)
        body_lines = [l for l in body_raw.splitlines() if l.strip()]
        body_text = "\n".join(body_lines)

        # Combine: meta + JSON-LD + body, capped at 20 000 chars
        combined = "\n".join(filter(None, [meta_text, jld_text, body_text]))
        text = combined[:20000]

    # ── Usability check ───────────────────────────────────────────────────────
    content_usable = (
        bool(text)
        and len(text.strip()) >= 30
        and not _is_antibot_challenge(text)
    )

    if content_usable:
        analysis = _run_pipeline(
            db, text, "url", url, payload.category_hint, session_id=payload.session_id
        )
        return analysis

    # ── Truly inaccessible URL: build a minimal stored unclassified result ────
    # This path only runs when:
    #   - requests threw an exception (network error / timeout), OR
    #   - extracted text is < 30 chars (truly empty), OR
    #   - anti-bot challenge detected.
    # IMPORTANT: do NOT include the raw URL in inaccessible_raw — the URL path
    # may contain job-category keywords that would pollute detect_category.
    if fetch_error:
        reason = f"Network error: {fetch_error}"
    elif _is_antibot_challenge(text):
        reason = "Anti-bot / JavaScript challenge page detected."
    elif http_status and http_status not in range(200, 500):
        reason = f"HTTP {http_status} — server error."
    else:
        reason = "Insufficient readable content could be extracted from this URL."

    inaccessible_raw = (
        "URL Content Unretrievable.\n"
        f"Reason: {reason}\n"
        "The target website could not be accessed for analysis. "
        "No opportunity category, risk flags, or scam signals could be detected from this URL."
    )

    analysis = models.Analysis(
        session_id=payload.session_id,
        input_type="url",
        category="unclassified",
        category_confidence=0.0,
        raw_text=inaccessible_raw,
        source_url=url,
        extracted_entities={
            "organization": None, "title": None, "location": None,
            "phones": [], "emails": [], "websites": [], "upi_ids": [],
            "amounts_found": [], "fee_keywords_found": [],
            "salary_or_stipend_mentioned": False, "certificate_ids": [],
            "dates": [], "social_handles": [], "free_email_domain_used": False,
            "email_domains": [],
        },
        red_flags=[],
        positive_indicators=[],
        payment_risk={"required": False, "amounts": [], "upi_ids": [], "risk_level": "low"},
        web_verification={"status": "unknown", "risk_score": 0, "risk_breakdown": {}},
        scam_pattern_matches=[],
        duplicate_matches=[],
        certificate_verification={},
        risk_score=0,
        classification="likely_genuine",
        explanation=(
            "This URL could not be accessed for analysis. "
            f"{reason} "
            "JobShield could not extract readable content. "
            "No risk signals detected — but this does NOT confirm the opportunity is safe. "
            "Proceed with caution and verify through official channels."
        ),
        recommendations=[
            "Verify the URL is correct and the website is publicly accessible.",
            "Try pasting the opportunity text directly using the 'Paste Text' option.",
            "Look up the company name independently before applying.",
        ],
        ml_confidence=None,
        detected_language="en",
        normalized_text="",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


async def _extract_file_text(file: UploadFile) -> str:

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_BYTES // (1024 * 1024)}MB."
        )
    return ocr.extract_text(contents, file.filename)


@router.post("/upload", response_model=schemas.AnalysisDetail)
async def analyze_upload(
    file: UploadFile = File(...),
    category_hint: str = Form(None),
    session_id: str = Form(None),
    db: Session = Depends(get_db)
):
    import os
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds 8MB limit. Maximum allowed upload size is 8MB."
        )

    # Validate file format / extension
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp", ".pdf"}
    is_allowed_mime = file.content_type and (
        file.content_type.startswith("image/") or file.content_type == "application/pdf"
    )

    if ext not in allowed_exts and not is_allowed_mime:
        raise HTTPException(
            status_code=422,
            detail="Unsupported file format. Please upload JPG, PNG, WEBP, or PDF."
        )

    try:
        text, qr_payloads = ocr.process_upload(filename, file.content_type or "", file_bytes)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Could not extract readable content from uploaded file: {str(exc)}"
        )

    if not text or len(text.strip()) < 5:
        raise HTTPException(
            status_code=422,
            detail="Could not extract readable text from the uploaded poster. Please ensure the image contains clear text or paste the opportunity text manually."
        )

    analysis = _run_pipeline(
        db, text, "upload", filename, category_hint, qr_payloads=qr_payloads, session_id=session_id
    )
    return analysis


@router.get("/{analysis_id}", response_model=schemas.AnalysisDetail)
def get_analysis(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.query(models.Analysis).filter(models.Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return analysis


@router.patch("/{analysis_id}/entities", response_model=schemas.AnalysisDetail)
def correct_entities_and_rerun(analysis_id: str, payload: schemas.ExtractedEntitiesEdit, db: Session = Depends(get_db)):
    """Let the user fix OCR mistakes, then re-run red-flag/risk analysis
    (but NOT re-run OCR) using the corrected entities."""
    analysis = db.query(models.Analysis).filter(models.Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    entities = payload.entities
    flags, positives = red_flag_engine.detect_red_flags(analysis.raw_text, entities, analysis.category)
    scam_matches = scam_db.check_scam_patterns(db, entities)
    dup_matches = duplicate_engine.find_duplicates(db, analysis.raw_text, entities, analysis.category, exclude_id=analysis.id)
    wv = web_verify.verify_website(entities)
    payment_risk = build_payment_risk(entities)

    cert_verification = analysis.certificate_verification
    if analysis.category == "certificate":
        cert_verification = cert_engine.verify_certificate([], entities)

    score, classification, breakdown = risk_engine.calculate_risk_score(flags, scam_matches, dup_matches, wv, positives)

    # ── ML scoring: blend rule-based (60%) + ML confidence (40%) ─────────────
    ml_confidence = predict_fraud_probability(analysis.raw_text)
    blended_score = blend_scores(score, ml_confidence)
    if blended_score <= 30:
        classification = "likely_genuine"
    elif blended_score <= 65:
        classification = "suspicious"
    else:
        classification = "likely_fake"
    # ─────────────────────────────────────────────────────────────────────────

    analysis.extracted_entities = entities
    analysis.red_flags = flags
    analysis.positive_indicators = positives
    analysis.payment_risk = payment_risk
    analysis.web_verification = {**wv, "risk_breakdown": breakdown}
    analysis.scam_pattern_matches = scam_matches
    analysis.duplicate_matches = dup_matches
    analysis.certificate_verification = cert_verification
    analysis.risk_score = blended_score
    analysis.classification = classification
    analysis.ml_confidence = ml_confidence
    analysis.explanation = risk_engine.build_explanation(classification, flags, scam_matches, blended_score)
    analysis.recommendations = risk_engine.build_recommendations(classification, entities)

    db.commit()
    db.refresh(analysis)
    return analysis
