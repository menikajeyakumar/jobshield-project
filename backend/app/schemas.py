from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_serializer
from datetime import datetime, timezone


def _serialize_utc_dt(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime('%Y-%m-%dT%H:%M:%SZ')


class TextAnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=20000)
    category_hint: Optional[str] = None
    session_id: Optional[str] = None


class UrlAnalyzeRequest(BaseModel):
    url: str
    category_hint: Optional[str] = None
    session_id: Optional[str] = None


class ExtractedEntitiesEdit(BaseModel):
    """Sent back by the frontend after the user corrects OCR mistakes."""
    analysis_id: str
    entities: Dict[str, Any]


class AnalysisSummary(BaseModel):
    id: str
    category: str
    organization: Optional[str] = None
    title: Optional[str] = None
    risk_score: int
    classification: str
    created_at: datetime

    @field_serializer('created_at', mode='plain')
    def serialize_created_at(self, dt: datetime) -> str:
        return _serialize_utc_dt(dt)

    class Config:
        from_attributes = True


class AnalysisDetail(BaseModel):
    id: str
    input_type: str
    category: str
    category_confidence: float
    raw_text: str
    source_url: Optional[str] = None
    extracted_entities: Dict[str, Any]
    red_flags: List[Dict[str, Any]]
    positive_indicators: List[Dict[str, Any]]
    payment_risk: Dict[str, Any]
    web_verification: Dict[str, Any]
    scam_pattern_matches: List[Dict[str, Any]]
    duplicate_matches: List[Dict[str, Any]]
    certificate_verification: Dict[str, Any]
    risk_score: int
    classification: str
    explanation: str
    recommendations: List[str]
    ml_confidence: Optional[float] = None   # ML model fraud probability (0.0-1.0)
    is_demo: bool
    created_at: datetime

    @field_serializer('created_at', mode='plain')
    def serialize_created_at(self, dt: datetime) -> str:
        return _serialize_utc_dt(dt)

    class Config:
        from_attributes = True


class ReportCreate(BaseModel):
    analysis_id: Optional[str] = None
    category: str
    details: Optional[str] = None
    session_id: Optional[str] = None


class ReportOut(BaseModel):
    id: str
    analysis_id: Optional[str] = None
    category: str
    details: Optional[str] = None
    status: str = "pending"
    admin_notes: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True



class CommunityReportCreate(BaseModel):
    user_id: str
    report_type: str = Field(..., description="Type e.g., phone, email, website, upi, company, job_ad")
    value: str = Field(..., description="Reported entity value")
    description: Optional[str] = None
    evidence: Optional[str] = None
    session_id: Optional[str] = None

class CommunityReportOut(BaseModel):
    id: str
    user_id: str
    report_type: str
    value: str
    description: Optional[str]
    evidence: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class ScamPatternOut(BaseModel):
    id: str
    pattern_type: str
    value: str
    category: Optional[str]
    risk_level: str
    report_count: int
    status: str

    class Config:
        from_attributes = True


# --- User Authentication Schemas ---
class UserRegisterRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)


class UserLoginRequest(BaseModel):
    email: str
    password: str


class AuthTokenResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    email: str
    user_id: str


class UserOut(BaseModel):
    id: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Verification Schemas ---
class UPIVerifyResponse(BaseModel):
    upi_id: str
    owner_name: str
    account_type: str
    risk_status: str
    message: str
    scam_matches_count: int = 0


class WebsiteVerifyRequest(BaseModel):
    url: str


class CheckStep(BaseModel):
    name: str
    status: str
    detail: str


class WebsiteVerifyResponse(BaseModel):
    domain: str
    url: str
    score: int
    classification: str
    has_https: bool
    is_impersonating: bool
    is_high_risk_tld: bool
    checks: List[CheckStep]


class CertificateVerifyResponse(BaseModel):
    cert_id: str
    recipient: str
    issuer: str
    issue_date: str
    course: str
    status: str
    status_label: str
    badge_color: str
    confidence: int
    timestamp: str
    checks: List[Dict[str, Any]]


class WhatsAppDetectionResult(BaseModel):
    ocr_text: str
    entities: Dict[str, Any]
    red_flags: List[Dict[str, Any]]
    risk_score: Optional[int] = None
    recommendations: Optional[List[str]] = None
    ml_confidence: Optional[float] = None

class QRDetectionResult(BaseModel):
    type: str  # url, upi, text, unknown
    content: str
    analysis: Dict[str, Any]
    risk_score: Optional[int] = None
    recommendations: Optional[List[str]] = None
class ScamIntelligenceCreate(BaseModel):
    type: str = Field(..., description="Entity type: phone, email, website, upi, company, pattern")
    value: str = Field(..., description="Entity value")
    category: Optional[str] = None
    risk_level: Optional[str] = None
    status: Optional[str] = None

class ScamIntelligenceOut(BaseModel):
    id: int
    type: str
    value: str
    category: Optional[str]
    risk_level: str
    report_count: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

