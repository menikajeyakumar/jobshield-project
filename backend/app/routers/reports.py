from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel

from ..database import get_db
from .. import models, schemas
from ..utils.scam_db import record_pattern_from_report

router = APIRouter(prefix="/api/reports", tags=["reports"])

VALID_CATEGORIES = {
    "asked_for_money", "fake_company", "fake_internship", "fake_scholarship",
    "fake_recruitment", "fake_certificate", "suspicious_website", "payment_scam", "other",
}


@router.post("", response_model=schemas.ReportOut)
def create_report(payload: schemas.ReportCreate, db: Session = Depends(get_db)):
    if payload.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=422, detail="Invalid report category.")

    analysis = None
    if payload.analysis_id:
        analysis = db.query(models.Analysis).filter(models.Analysis.id == payload.analysis_id).first()
        if not analysis:
            raise HTTPException(status_code=404, detail="Referenced analysis not found.")

    report = models.Report(
        analysis_id=payload.analysis_id,
        category=payload.category,
        details=payload.details,
        reporter_session=payload.session_id,  # never exposed via public endpoints
        status="pending",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # A single report contributes an "unverified" scam-pattern entry for admin review.
    if analysis:
        record_pattern_from_report(db, analysis.extracted_entities or {}, analysis.category)

    return report


class CommunityReportPayload(BaseModel):
    opportunity_name: str
    company_name: Optional[str] = None
    category: str = "other"
    description: str
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    payment_details: Optional[str] = None
    reason: Optional[str] = None
    session_id: Optional[str] = None


@router.post("/community")
def submit_community_report(payload: CommunityReportPayload, db: Session = Depends(get_db)):
    details_str = (
        f"Opportunity: {payload.opportunity_name}\n"
        f"Company: {payload.company_name or 'N/A'}\n"
        f"Phone: {payload.phone or 'N/A'} | Email: {payload.email or 'N/A'}\n"
        f"Website: {payload.website or 'N/A'}\n"
        f"Payment Details: {payload.payment_details or 'N/A'}\n"
        f"Reason: {payload.reason or 'N/A'}\n"
        f"Description: {payload.description}"
    )

    report = models.Report(
        analysis_id=None,
        category=payload.category if payload.category in VALID_CATEGORIES else "other",
        details=details_str,
        reporter_session=payload.session_id,
        status="pending",
    )
    db.add(report)

    # If phone or email provided, record candidate pattern
    if payload.phone:
        db.add(models.ScamPattern(
            pattern_type="phone",
            value=payload.phone.strip(),
            category=payload.category,
            risk_level="high" if payload.payment_details else "medium",
            status="unverified",
            source="community_report",
            notes=f"Community reported: {payload.opportunity_name}"
        ))
    if payload.email:
        db.add(models.ScamPattern(
            pattern_type="email",
            value=payload.email.strip().lower(),
            category=payload.category,
            risk_level="medium",
            status="unverified",
            source="community_report",
            notes=f"Community reported: {payload.opportunity_name}"
        ))

    db.commit()
    db.refresh(report)
    return {"status": "success", "report_id": report.id, "message": "Thank you. Your report has been submitted to JobShield database."}


@router.get("/scam-patterns", response_model=List[schemas.ScamPatternOut])
def get_public_scam_patterns(
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.ScamPattern)
    if status and status != 'all':
        query = query.filter(models.ScamPattern.status == status)
    if risk_level and risk_level != 'all':
        query = query.filter(models.ScamPattern.risk_level == risk_level)
    if category and category != 'all':
        query = query.filter(models.ScamPattern.category == category)
    if q and q.strip():
        search_term = f"%{q.strip()}%"
        query = query.filter(
            (models.ScamPattern.value.ilike(search_term)) |
            (models.ScamPattern.notes.ilike(search_term))
        )
    return query.order_by(desc(models.ScamPattern.last_seen)).limit(100).all()


@router.get("/{scan_id}/pdf", response_class=StreamingResponse)
def get_report_pdf(scan_id: str, db: Session = Depends(get_db)):
    # Retrieve the analysis record
    analysis = db.query(models.Analysis).filter(models.Analysis.id == scan_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Scan not found")

    # Prepare data for the report
    created = analysis.created_at.strftime("%Y-%m-%d %H:%M:%S") if analysis.created_at else ""
    scan_type = analysis.input_type or "N/A"
    risk_score = analysis.risk_score or 0
    risk_level = analysis.classification or "N/A"
    ai_confidence = f"{analysis.ml_confidence * 100:.1f}%" if analysis.ml_confidence is not None else "N/A"
    risk_breakdown = analysis.risk_breakdown or {}
    red_flags = analysis.red_flags or []
    extracted = analysis.extracted_entities or {}
    payment = analysis.payment_risk or {}
    website = analysis.web_verification or {}
    company = extracted.get("organization") or extracted.get("company") or "N/A"
    duplicate = analysis.duplicate_matches or []
    scam_intel = analysis.scam_pattern_matches or []
    safety_recs = analysis.recommendations or []

    # Build an HTML template for the PDF
    html_template = """
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1, h2 { color: #2c3e50; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <h1>JobShield AI Report</h1>
        <p><strong>AI-Powered Opportunity Verification</strong></p>
        <div class="section"><span class="label">Scan Date:</span> {{created}}</div>
        <div class="section"><span class="label">Scan Type:</span> {{scan_type}}</div>
        <div class="section"><span class="label">Risk Score:</span> {{risk_score}}</div>
        <div class="section"><span class="label">Risk Level:</span> {{risk_level}}</div>
        <div class="section"><span class="label">AI Confidence:</span> {{ai_confidence}}</div>

        <h2>Risk Breakdown</h2>
        {% if risk_breakdown %}
        <table>
            <tr><th>Component</th><th>Score</th></tr>
            {% for k, v in risk_breakdown.items() %}
            <tr><td>{{k}}</td><td>{{v}}</td></tr>
            {% endfor %}
        </table>
        {% else %}<p>No detailed breakdown available.</p>{% endif %}

        <h2>Detected Red Flags</h2>
        {% if red_flags %}
        <ul>
            {% for flag in red_flags %}
            <li>{{flag.get('label', flag)}}</li>
            {% endfor %}
        </ul>
        {% else %}<p>None detected.</p>{% endif %}

        <h2>Extracted Information</h2>
        <ul>
            <li><strong>Company Name:</strong> {{company}}</li>
            {% for key, val in extracted.items() %}
            <li><strong>{{key|capitalize}}:</strong> {{val}}</li>
            {% endfor %}
        </ul>

        <h2>Payment Analysis</h2>
        {% if payment %}
        <pre>{{payment}}</pre>
        {% else %}<p>No payment data.</p>{% endif %}

        <h2>Website Analysis</h2>
        {% if website %}
        <pre>{{website}}</pre>
        {% else %}<p>No website data.</p>{% endif %}

        <h2>Company Analysis</h2>
        <p>Company related details are included in Extracted Information.</p>

        <h2>Duplicate Detection</h2>
        {% if duplicate %}
        <pre>{{duplicate}}</pre>
        {% else %}<p>No duplicates found.</p>{% endif %}

        <h2>Scam Intelligence Match</h2>
        {% if scam_intel %}
        <pre>{{scam_intel}}</pre>
        {% else %}<p>No matches.</p>{% endif %}

        <h2>Safety Recommendations</h2>
        {% if safety_recs %}
        <ul>
            {% for rec in safety_recs %}
            <li>{{rec}}</li>
            {% endfor %}
        </ul>
        {% else %}<p>No specific recommendations.</p>{% endif %}

        <hr/>
        <p><em>JobShield AI provides automated risk analysis and does not provide a legal determination of fraud.</em></p>
    </body>
    </html>
    """
    try:
        from jinja2 import Template
        from weasyprint import HTML
        rendered_html = Template(html_template).render(
            created=created,
            scan_type=scan_type,
            risk_score=risk_score,
            risk_level=risk_level,
            ai_confidence=ai_confidence,
            risk_breakdown=risk_breakdown,
            red_flags=red_flags,
            extracted=extracted,
            company=company,
            payment=payment,
            website=website,
            duplicate=duplicate,
            scam_intel=scam_intel,
            safety_recs=safety_recs,
        )
        pdf_bytes = HTML(string=rendered_html).write_pdf()
        pdf_stream = BytesIO(pdf_bytes)
    except Exception:
        # Fallback to ReportLab when Weasyprint/cairo binary DLLs are missing
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors

            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
            styles = getSampleStyleSheet()
            story = []

            title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=18, leading=22, textColor=colors.HexColor('#1E293B'))
            heading_style = ParagraphStyle('HeadingStyle', parent=styles['Heading2'], fontSize=13, leading=16, textColor=colors.HexColor('#0F172A'), spaceBefore=10, spaceAfter=4)
            normal_style = ParagraphStyle('NormalStyle', parent=styles['Normal'], fontSize=10, leading=14, textColor=colors.HexColor('#334155'))

            story.append(Paragraph("JobShield AI — Opportunity Verification Report", title_style))
            story.append(Spacer(1, 10))
            story.append(Paragraph(f"<b>Scan Date:</b> {created} | <b>Input Type:</b> {scan_type}", normal_style))
            story.append(Paragraph(f"<b>Risk Score:</b> {risk_score}/100 | <b>Classification:</b> {risk_level.upper()}", normal_style))
            story.append(Paragraph(f"<b>AI Confidence:</b> {ai_confidence}", normal_style))
            story.append(Spacer(1, 12))

            story.append(Paragraph("Company & Extracted Details", heading_style))
            story.append(Paragraph(f"<b>Organization / Company:</b> {company}", normal_style))
            for k, v in extracted.items():
                if isinstance(v, (str, int, float)):
                    story.append(Paragraph(f"<b>{k.capitalize()}:</b> {v}", normal_style))
            story.append(Spacer(1, 12))

            story.append(Paragraph("Detected Red Flags", heading_style))
            if red_flags:
                for flag in red_flags:
                    lbl = flag.get('label', str(flag)) if isinstance(flag, dict) else str(flag)
                    story.append(Paragraph(f"• {lbl}", normal_style))
            else:
                story.append(Paragraph("No critical red flags detected.", normal_style))
            story.append(Spacer(1, 12))

            story.append(Paragraph("Safety Recommendations", heading_style))
            if safety_recs:
                for rec in safety_recs:
                    story.append(Paragraph(f"• {rec}", normal_style))
            else:
                story.append(Paragraph("Verify official domain and contact details before proceeding.", normal_style))
            story.append(Spacer(1, 16))

            story.append(Paragraph("<i>JobShield AI provides automated risk analysis and does not provide a legal determination of fraud.</i>", normal_style))

            doc.build(story)
            buffer.seek(0)
            pdf_stream = buffer
        except Exception as fallback_err:
            raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(fallback_err)}")

    return StreamingResponse(pdf_stream, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=scan_{scan_id}_report.pdf"})

