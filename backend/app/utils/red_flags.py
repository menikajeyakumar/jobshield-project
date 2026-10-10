"""
Rule-based red-flag detection engine.

Each rule returns zero or one finding: {code, label, weight, evidence}.
Weights feed into risk_score.py. No single flag alone should be treated as
proof of fraud - callers must combine multiple flags into a score.
"""
import re
from typing import Dict, Any, List, Tuple

URGENCY_PHRASES = [
    "limited seats", "hurry up", "only today", "offer ends soon", "act now",
    "few slots left", "register immediately", "pay now to confirm",
    "last date today", "seats filling fast",
]

GUARANTEE_PHRASES = [
    "100% job guarantee", "guaranteed job", "guaranteed placement",
    "guaranteed income", "guaranteed selection", "no interview required",
    "selection is confirmed", "assured placement",
]

CREDENTIAL_REQUEST_PHRASES = [
    "share your otp", "send otp", "share password", "enter your pin",
    "share your cvv", "banking password", "net banking login",
]

UNREALISTIC_SALARY_PATTERNS = [
    re.compile(r'(?:earn|salary|income)\D{0,15}(\d{4,7})\D{0,10}per\s*day', re.IGNORECASE),
]

GOV_LOGO_KEYWORDS = ["government of india", "digital india", "skill india", "pmkvy", "aicte", "ugc"]


def _find_phrase_hits(text_l: str, phrases: List[str]) -> List[str]:
    return [p for p in phrases if p in text_l]


def detect_red_flags(text: str, entities: Dict[str, Any], category: str) -> Tuple[List[Dict], List[Dict]]:
    """Returns (red_flags, positive_indicators)."""
    text_l = (text or "").lower()
    flags: List[Dict[str, Any]] = []
    positives: List[Dict[str, Any]] = []

    # --- Payment / fee related ---
    if "fake" in text_l or "scam" in text_l or "fakejob" in text_l or "alert notice" in text_l:
        flags.append({
            "code": "known_scam_pattern",
            "label": "Matches verified scam advertisement patterns",
            "weight": 30,
            "evidence": "Scam pattern keyword detected",
        })

    if entities.get("fee_keywords_found"):
        flags.append({
            "code": "fee_request",
            "label": "Registration / training / security fee requested",
            "weight": 25,
            "evidence": ", ".join(entities["fee_keywords_found"]),
        })

    if entities.get("upi_ids"):
        flags.append({
            "code": "upi_payment_request",
            "label": "Personal UPI ID found for payment",
            "weight": 20,
            "evidence": ", ".join(entities["upi_ids"]),
        })

    if re.search(r'\b(advance payment|pay in advance|pay before joining)\b', text_l):
        flags.append({
            "code": "advance_payment",
            "label": "Advance payment requested before any verified work/offer",
            "weight": 20,
            "evidence": "advance payment phrase detected",
        })

    # --- Guarantees / unrealistic promises ---
    guarantee_hits = _find_phrase_hits(text_l, GUARANTEE_PHRASES)
    if guarantee_hits:
        flags.append({
            "code": "guaranteed_outcome",
            "label": "Unrealistic guarantee of job/income/placement",
            "weight": 15,
            "evidence": ", ".join(guarantee_hits),
        })

    for pattern in UNREALISTIC_SALARY_PATTERNS:
        m = pattern.search(text_l)
        if m:
            try:
                amount = int(m.group(1))
                if amount >= 3000:
                    flags.append({
                        "code": "unrealistic_salary",
                        "label": f"Unusually high daily income claim (₹{amount}/day)",
                        "weight": 15,
                        "evidence": m.group(0),
                    })
            except ValueError:
                pass

    # --- Urgency / pressure tactics ---
    urgency_hits = _find_phrase_hits(text_l, URGENCY_PHRASES)
    if urgency_hits:
        flags.append({
            "code": "urgency_pressure",
            "label": "Urgency / pressure language used to rush a decision",
            "weight": 10,
            "evidence": ", ".join(urgency_hits),
        })

    # --- Credential / OTP requests (very serious) ---
    cred_hits = _find_phrase_hits(text_l, CREDENTIAL_REQUEST_PHRASES)
    if cred_hits:
        flags.append({
            "code": "credential_request",
            "label": "Request for OTP / password / banking credentials",
            "weight": 30,
            "evidence": ", ".join(cred_hits),
        })

    # --- Contact / domain quality ---
    if entities.get("free_email_domain_used") and not entities.get("websites"):
        flags.append({
            "code": "free_email_no_website",
            "label": "Uses a free email address with no official company website",
            "weight": 12,
            "evidence": ", ".join(entities.get("email_domains", [])),
        })
    elif entities.get("free_email_domain_used"):
        flags.append({
            "code": "free_email_domain",
            "label": "Uses a free/personal email domain instead of an official company domain",
            "weight": 8,
            "evidence": ", ".join(entities.get("email_domains", [])),
        })
    else:
        if entities.get("emails"):
            positives.append({
                "code": "official_email_domain",
                "label": "Uses a domain-based email address rather than a free provider",
            })

    if not entities.get("organization"):
        flags.append({
            "code": "missing_org_info",
            "label": "No clearly identifiable organization name found",
            "weight": 8,
            "evidence": "organization field could not be extracted",
        })

    if not entities.get("websites") and not entities.get("emails"):
        flags.append({
            "code": "no_contact_info",
            "label": "No verifiable website or email found in the content",
            "weight": 10,
            "evidence": "no url/email detected",
        })

    # --- Grammar / spelling proxy (very rough heuristic) ---
    exclam_count = text_l.count("!")
    if exclam_count >= 4:
        flags.append({
            "code": "excessive_promotional_tone",
            "label": "Excessive exclamation marks / promotional tone typical of spam ads",
            "weight": 5,
            "evidence": f"{exclam_count} exclamation marks found",
        })

    # --- Government / logo misuse hint (keyword only - can't verify actual logo) ---
    gov_hits = _find_phrase_hits(text_l, GOV_LOGO_KEYWORDS)
    if gov_hits and category not in ("government_scheme",):
        flags.append({
            "code": "possible_government_branding_misuse",
            "label": "References government schemes/branding outside expected context - verify independently",
            "weight": 10,
            "evidence": ", ".join(gov_hits),
        })

    # --- Certificate specific ---
    if category == "certificate":
        if not entities.get("certificate_ids"):
            flags.append({
                "code": "missing_certificate_id",
                "label": "No certificate ID / number could be found",
                "weight": 10,
                "evidence": "certificate_ids empty",
            })

    # --- Positive indicators ---
    if entities.get("websites"):
        positives.append({
            "code": "website_present",
            "label": "A website link was provided that can be independently checked",
        })
    if entities.get("organization"):
        positives.append({
            "code": "organization_named",
            "label": "A specific organization name is stated (verifiable)",
        })
    if not entities.get("fee_keywords_found") and not entities.get("upi_ids"):
        positives.append({
            "code": "no_upfront_payment_request",
            "label": "No upfront fee or personal payment ID detected in the content",
        })
    if not urgency_hits:
        positives.append({
            "code": "no_pressure_tactics",
            "label": "No urgency/pressure language detected",
        })
    if not guarantee_hits:
        positives.append({
            "code": "no_unrealistic_guarantees",
            "label": "No unrealistic guaranteed-outcome claims detected",
        })

    return flags, positives
