from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..utils.auth import require_admin

router = APIRouter(prefix="/api/intel", tags=["Scam Intelligence"])

@router.post("/", response_model=schemas.ScamIntelligenceOut)
def create_record(payload: schemas.ScamIntelligenceCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    record = models.ScamIntelligence(**payload.dict())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/search", response_model=List[schemas.ScamIntelligenceOut])
def search(value: str, type: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.ScamIntelligence).filter(models.ScamIntelligence.value.ilike(f"%{value}%"))
    if type:
        q = q.filter(models.ScamIntelligence.type == type)
    return q.all()

@router.patch("/{record_id}", response_model=schemas.ScamIntelligenceOut)
def update_record(record_id: int, payload: schemas.ScamIntelligenceCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    rec = db.query(models.ScamIntelligence).filter(models.ScamIntelligence.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Record not found")
    for key, val in payload.dict(exclude_unset=True).items():
        setattr(rec, key, val)
    db.commit()
    db.refresh(rec)
    return rec

@router.delete("/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    rec = db.query(models.ScamIntelligence).filter(models.ScamIntelligence.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(rec)
    db.commit()
    return {"deleted": True}

