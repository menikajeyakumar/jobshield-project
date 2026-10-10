"""
Checks extracted entities against the ScamPattern table (phones, emails,
domains, URLs, UPI IDs, org names, certificate IDs previously reported /
confirmed as suspicious) and can add new unverified patterns from a
submission's entities (used when a report is filed).
"""
from typing import Dict, Any, List
from urllib.parse import urlparse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime

from ..models import ScamPattern


def _domain_of(url: str) -> str:
    try:
        netloc = urlparse(url if "://" in url else f"//{url}", scheme="http").netloc
        return netloc.lower().lstrip("www.")
    except Exception:
        return url.lower()


def check_scam_patterns(db: Session, entities: Dict[str, Any]) -> List[Dict[str, Any]]:
    candidates: List[tuple] = []
    for p in entities.get("phones", []):
        candidates.append(("phone", p))
    for e in entities.get("emails", []):
        candidates.append(("email", e.lower()))
    for u in entities.get("websites", []):
        candidates.append(("domain", _domain_of(u)))
    for upi in entities.get("upi_ids", []):
        candidates.append(("upi", upi.lower()))
    if entities.get("organization"):
        candidates.append(("org_name", entities["organization"].strip().lower()))
    for cid in entities.get("certificate_ids", []):
        candidates.append(("certificate_id", cid.upper()))

    if not candidates:
        return []

    matches = []
    for ptype, value in candidates:
        if not value:
            continue
        rows = db.query(ScamPattern).filter(
            ScamPattern.pattern_type == ptype,
            ScamPattern.value == value,
        ).all()
        for row in rows:
            matches.append({
                "pattern_type": row.pattern_type,
                "value": row.value,
                "risk_level": row.risk_level,
                "report_count": row.report_count,
                "status": row.status,  # unverified | confirmed | rejected
                "category": row.category,
            })
    return matches


def record_pattern_from_report(db: Session, entities: Dict[str, Any], category: str):
    """Called when a user files a report - stores the reported entities as
    'unverified' patterns (never auto-confirmed from a single report)."""
    def upsert(ptype, value):
        if not value:
            return
        row = db.query(ScamPattern).filter_by(pattern_type=ptype, value=value).first()
        if row:
            row.report_count += 1
            row.last_seen = datetime.utcnow()
        else:
            row = ScamPattern(
                pattern_type=ptype, value=value, category=category,
                risk_level="medium", report_count=1, status="unverified",
                source="user_report",
            )
            db.add(row)

    for p in entities.get("phones", []):
        upsert("phone", p)
    for e in entities.get("emails", []):
        upsert("email", e.lower())
    for u in entities.get("websites", []):
        upsert("domain", _domain_of(u))
    for upi in entities.get("upi_ids", []):
        upsert("upi", upi.lower())
    if entities.get("organization"):
        upsert("org_name", entities["organization"].strip().lower())
    db.commit()
