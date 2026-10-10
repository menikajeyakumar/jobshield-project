from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from collections import Counter

from ..database import get_db
from .. import models
from ..config import CATEGORY_LABELS
from ..utils.auth import require_admin

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])



@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(models.Analysis.id)).scalar() or 0

    def count_by_classification(cls):
        return db.query(func.count(models.Analysis.id)).filter(models.Analysis.classification == cls).scalar() or 0

    likely_genuine = count_by_classification("likely_genuine")
    suspicious = count_by_classification("suspicious")
    likely_fake = count_by_classification("likely_fake")

    total_reports = db.query(func.count(models.Report.id)).scalar() or 0

    scam_pattern_matches = db.query(models.Analysis).filter(
        func.json_array_length(models.Analysis.scam_pattern_matches) > 0
    ).count() if db.bind.dialect.name == "sqlite" else sum(
        1 for a in db.query(models.Analysis).all() if a.scam_pattern_matches
    )

    duplicate_matches = sum(1 for a in db.query(models.Analysis).all() if a.duplicate_matches)
    payment_risk_cases = sum(
        1 for a in db.query(models.Analysis).all()
        if (a.payment_risk or {}).get("payment_request_detected")
    )

    category_counts = Counter(a.category for a in db.query(models.Analysis.category).all())
    category_distribution = [
        {"category": CATEGORY_LABELS.get(cat, cat), "count": count}
        for cat, count in category_counts.items()
    ]

    risk_distribution = [
        {"label": "Likely Genuine", "count": likely_genuine},
        {"label": "Suspicious", "count": suspicious},
        {"label": "Likely Fake", "count": likely_fake},
    ]

    monthly = Counter(
        a.created_at.strftime("%Y-%m") for a in db.query(models.Analysis.created_at).all() if a.created_at
    )
    monthly_analysis = [{"month": m, "count": c} for m, c in sorted(monthly.items())]

    flag_counter = Counter()
    for a in db.query(models.Analysis.red_flags).all():
        for f in (a.red_flags or []):
            flag_counter[f.get("label", "Unknown")] += 1
    most_common_flags = [{"label": lbl, "count": c} for lbl, c in flag_counter.most_common(8)]

    return {
        "total_checked": total,
        "likely_genuine": likely_genuine,
        "suspicious": suspicious,
        "likely_fake": likely_fake,
        "total_reports": total_reports,
        "scam_pattern_matches": scam_pattern_matches,
        "duplicate_matches": duplicate_matches,
        "payment_risk_cases": payment_risk_cases,
        "category_distribution": category_distribution,
        "risk_distribution": risk_distribution,
        "monthly_analysis": monthly_analysis,
        "most_common_red_flags": most_common_flags,
    }

@router.get("/admin-logs")
def admin_logs(limit: int = 100, db: Session = Depends(get_db), admin=Depends(require_admin)):

    logs = db.query(models.AdminLog).order_by(models.AdminLog.timestamp.desc()).limit(limit).all()
    return [{
        "id": log.id,
        "admin_id": log.admin_id,
        "action": log.action,
        "target": log.target,
        "details": log.details,
        "timestamp": log.timestamp,
    } for log in logs]

