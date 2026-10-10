from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from .. import models, schemas
from ..config import settings
from ..utils.auth import verify_password, create_access_token, require_role, hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/login")
def admin_login(payload: schemas.AdminLoginRequest, db: Session = Depends(get_db)):
    """Simple env-configured admin login for the final-year-project scope.
    In production, store admins in the AdminUser table with hashed passwords
    instead of comparing against a plain .env value."""
    if payload.username == settings.admin_username and payload.password == settings.admin_password:
        token = create_access_token(subject=payload.username, role="admin")
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid admin credentials.")


@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    import os, json
    ml_info = {"status": "not_trained"}
    metrics_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "ml", "metrics.json"))
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r", encoding="utf-8") as f:
                metrics = json.load(f)
            ml_info = {"status": "active", **metrics}
        except Exception:
            pass

    return {
        "total_users_sessions": db.query(models.Analysis.session_id).distinct().count(),
        "total_analyses": db.query(models.Analysis).count(),
        "total_reports": db.query(models.Report).count(),
        "pending_reports": db.query(models.Report).filter(models.Report.status == "pending").count(),
        "scam_patterns": db.query(models.ScamPattern).count(),
        "confirmed_patterns": db.query(models.ScamPattern).filter(models.ScamPattern.status == "confirmed").count(),
        "ml_info": ml_info,
    }


# Admin endpoints for community scam reports
@router.get("/community-reports", response_model=List[schemas.CommunityReportOut])
def list_community_reports(status: Optional[str] = None, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    q = db.query(models.ScamReport)
    if status:
        q = q.filter(models.ScamReport.status == status)
    return q.order_by(desc(models.ScamReport.created_at)).all()


class CommunityReportReviewUpdate(BaseModel):
    status: str  # UNDER_REVIEW, VERIFIED_SUSPICIOUS, REJECTED, PENDING
    admin_notes: Optional[str] = None


@router.patch("/community-reports/{report_id}")
def review_community_report(report_id: str, payload: CommunityReportReviewUpdate, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    if payload.status not in {"PENDING", "UNDER_REVIEW", "VERIFIED_SUSPICIOUS", "REJECTED"}:
        raise HTTPException(status_code=422, detail="Invalid status.")
    report = db.query(models.ScamReport).filter(models.ScamReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Community report not found.")
    report.status = payload.status
    report.admin_notes = payload.admin_notes
    db.commit()
    return {"updated": True}


@router.get("/reports", response_model=List[schemas.ReportOut])
def list_reports(status: Optional[str] = None, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    q = db.query(models.Report)
    if status:
        q = q.filter(models.Report.status == status)
    return q.order_by(desc(models.Report.created_at)).all()


class ReportReviewUpdate(BaseModel):
    status: str  # reviewed | rejected | confirmed
    admin_notes: Optional[str] = None


@router.patch("/reports/{report_id}")
def review_report(report_id: str, payload: ReportReviewUpdate, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    if payload.status not in {"reviewed", "rejected", "confirmed"}:
        raise HTTPException(status_code=422, detail="Invalid status.")
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    report.status = payload.status
    report.admin_notes = payload.admin_notes
    report.reviewed_at = datetime.utcnow()
    db.commit()

    # If admin confirms a report, escalate any linked scam patterns from
    # "unverified" to "confirmed" and bump their risk level.
    if payload.status == "confirmed" and report.analysis_id:
        analysis = db.query(models.Analysis).filter(models.Analysis.id == report.analysis_id).first()
        if analysis:
            entities = analysis.extracted_entities or {}
            values = set(
                entities.get("phones", []) + [e.lower() for e in entities.get("emails", [])]
                + entities.get("upi_ids", [])
            )
            if values:
                patterns = db.query(models.ScamPattern).filter(models.ScamPattern.value.in_(values)).all()
                for p in patterns:
                    p.status = "confirmed"
                    p.risk_level = "high"
                db.commit()

    return {"updated": True}


@router.get("/scam-patterns", response_model=List[schemas.ScamPatternOut])
def list_scam_patterns(status: Optional[str] = None, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    q = db.query(models.ScamPattern)
    if status:
        q = q.filter(models.ScamPattern.status == status)
    return q.order_by(desc(models.ScamPattern.last_seen)).all()


class ScamPatternCreate(BaseModel):
    pattern_type: str
    value: str
    category: Optional[str] = None
    risk_level: str = "medium"
    notes: Optional[str] = None


@router.post("/scam-patterns", response_model=schemas.ScamPatternOut)
def add_scam_pattern(payload: ScamPatternCreate, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    row = models.ScamPattern(
        pattern_type=payload.pattern_type,
        value=payload.value.lower() if payload.pattern_type != "certificate_id" else payload.value.upper(),
        category=payload.category,
        risk_level=payload.risk_level,
        status="confirmed",
        source="admin",
        notes=payload.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/scam-patterns/{pattern_id}")
def delete_scam_pattern(pattern_id: str, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    row = db.query(models.ScamPattern).filter(models.ScamPattern.id == pattern_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Pattern not found.")
    db.delete(row)
    db.commit()
    return {"deleted": True}


@router.patch("/scam-patterns/{pattern_id}/reject")
def reject_scam_pattern(pattern_id: str, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    row = db.query(models.ScamPattern).filter(models.ScamPattern.id == pattern_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Pattern not found.")
    row.status = "rejected"
    db.commit()
    return {"updated": True}
