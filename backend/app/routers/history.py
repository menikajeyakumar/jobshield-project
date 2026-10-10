from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=List[schemas.AnalysisSummary])
def get_history(session_id: str = Query(...), limit: int = 50, db: Session = Depends(get_db)):
    rows = (
        db.query(models.Analysis)
        .filter(models.Analysis.session_id == session_id)
        .order_by(desc(models.Analysis.created_at))
        .limit(limit)
        .all()
    )
    out = []
    for r in rows:
        entities = r.extracted_entities or {}
        cat = r.category if (r.category and (r.category_confidence or 0.0) > 0.2 and r.category != "unclassified") else "unclassified"
        out.append(schemas.AnalysisSummary(
            id=r.id, category=cat,
            organization=entities.get("organization"),
            title=entities.get("title"),
            risk_score=r.risk_score, classification=r.classification,
            created_at=r.created_at,
        ))
    return out


@router.delete("/{analysis_id}")
def delete_history_item(analysis_id: str, session_id: str = Query(...), db: Session = Depends(get_db)):
    row = db.query(models.Analysis).filter(
        models.Analysis.id == analysis_id, models.Analysis.session_id == session_id
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    db.delete(row)
    db.commit()
    return {"deleted": True}
