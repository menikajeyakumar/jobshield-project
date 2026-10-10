"""
Website Verification API router:
  POST /api/website/verify - Perform live domain security inspection (DNS, SSL, Typosquatting, High-risk TLD)
"""
from fastapi import APIRouter, HTTPException
from .. import schemas
from ..utils import domain_check

router = APIRouter(prefix="/api/website", tags=["website"])


@router.post("/verify", response_model=schemas.WebsiteVerifyResponse)
def verify_website_domain(payload: schemas.WebsiteVerifyRequest):
    url = payload.url.strip()
    if not url or len(url) < 4:
        raise HTTPException(status_code=422, detail="Please enter a valid website URL or domain name.")

    try:
        result = domain_check.inspect_domain_security(url)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Website security inspection failed: {str(exc)}")
