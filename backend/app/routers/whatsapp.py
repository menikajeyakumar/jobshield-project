from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from ..database import get_db
from ..utils.whatsapp_detection import analyze_whatsapp_screenshot
from ..utils.auth import require_admin
from sqlalchemy.orm import Session
from ..schemas import WhatsAppDetectionResult
router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

@router.post("/detect", response_model=WhatsAppDetectionResult)
async def detect_whatsapp_screenshot(file: UploadFile = File(...), db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Accept a WhatsApp screenshot image, run the detection pipeline and return analysis.
    The endpoint is admin‑protected for now; adjust security as needed.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")
    try:
        result = analyze_whatsapp_screenshot(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
    return result
