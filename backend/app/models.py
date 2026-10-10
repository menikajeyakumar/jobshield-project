import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Text, DateTime, JSON, Boolean, ForeignKey
)
from sqlalchemy.orm import relationship
from .database import Base


def gen_id():
    return str(uuid.uuid4())


class User(Base):
    """User account model for persistent user sessions and scan history."""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_id)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    analyses = relationship("Analysis", back_populates="user")
    reports = relationship("Report", back_populates="user")
    scam_reports = relationship("ScamReport", back_populates="user")


class Analysis(Base):
    """One user submission (upload / pasted text / URL) and its full result."""
    __tablename__ = "analyses"

    id = Column(String(36), primary_key=True, default=gen_id)
    session_id = Column(String(64), index=True)  # anonymous device/browser id, no login required
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    input_type = Column(String(20))          # "upload" | "text" | "url"
    category = Column(String(40), index=True)
    category_confidence = Column(Float, default=0.0)

    raw_text = Column(Text)                  # OCR / pasted / fetched text
    source_url = Column(String(1000), nullable=True)

    extracted_entities = Column(JSON, default=dict)   # dict of entities
    red_flags = Column(JSON, default=list)             # list of {code,label,weight,evidence}
    positive_indicators = Column(JSON, default=list)
    payment_risk = Column(JSON, default=dict)
    web_verification = Column(JSON, default=dict)
    scam_pattern_matches = Column(JSON, default=list)
    duplicate_matches = Column(JSON, default=list)
    certificate_verification = Column(JSON, default=dict)

    detected_language = Column(String(20), default="en")  # language code
    normalized_text = Column(Text)  # cleaned text for analysis
    risk_score = Column(Integer, default=0)
    # JSON column to store detailed risk breakdown components
    risk_breakdown = Column(JSON, nullable=True)
    classification = Column(String(20))      # likely_genuine | suspicious | likely_fake
    explanation = Column(Text)
    recommendations = Column(JSON, default=list)
    ml_confidence = Column(Float, nullable=True)   # ML fraud probability 0-1 (None = model not trained yet)

    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="analyses")
    reports = relationship("Report", back_populates="analysis")


class Report(Base):
    """User report of a suspicious scan or scam opportunity."""
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=gen_id)
    analysis_id = Column(String(36), ForeignKey("analyses.id"), nullable=True, index=True)
    category = Column(String(40), nullable=False)
    details = Column(Text, nullable=True)
    reporter_session = Column(String(64), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String(20), default="pending")  # pending | reviewed | rejected | confirmed
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="reports")
    analysis = relationship("Analysis", back_populates="reports")



class ScamPattern(Base):
    """Known-bad indicators contributed by confirmed reports / admin entries."""
    __tablename__ = "scam_patterns"

    id = Column(String(36), primary_key=True, default=gen_id)
    pattern_type = Column(String(30), index=True)   # phone|email|domain|url|upi|org_name|keyword|certificate_id
    value = Column(String(500), index=True)
    category = Column(String(40), nullable=True)
    risk_level = Column(String(10), default="medium")   # low|medium|high
    report_count = Column(Integer, default=1)
    status = Column(String(20), default="unverified")   # unverified|confirmed|rejected
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    source = Column(String(20), default="system")       # system|user_report|admin
    notes = Column(Text, nullable=True)

class ScamIntelligence(Base):
    """Centralized intel for scam‑related entities."""
    __tablename__ = "scam_intelligence"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(30), nullable=False)   # phone, email, website, upi, company, pattern
    value = Column(String(500), nullable=False, index=True)
    category = Column(String(40), nullable=True)
    risk_level = Column(String(10), default="medium")   # low, medium, high
    report_count = Column(Integer, default=0)
    status = Column(String(20), default="PENDING")   # PENDING, REVIEWED, VERIFIED, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScamReport(Base):
    """Community submitted scam report."""
    __tablename__ = "scam_reports"

    id = Column(String(36), primary_key=True, default=gen_id)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    report_type = Column(String(30), nullable=False)  # e.g., phone, email, website, upi, company, job_ad
    value = Column(String(500), nullable=False)        # the reported entity value
    description = Column(Text, nullable=True)
    evidence = Column(String(1000), nullable=True)    # URL or path to uploaded evidence
    admin_notes = Column(Text, nullable=True)  # admin remarks during review
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="scam_reports")


class AdminLog(Base):
    """Log of admin actions for audit purposes."""
    __tablename__ = "admin_logs"

    id = Column(String(36), primary_key=True, default=gen_id)
    admin_id = Column(String(36), nullable=False)  # store admin identifier (e.g., username)
    action = Column(String(50), nullable=False)  # e.g., "add_scam_pattern", "delete_scam_pattern", "review_report"
    target = Column(String(255), nullable=True)   # e.g., pattern ID, report ID
    details = Column(JSON, nullable=True)        # additional context
    timestamp = Column(DateTime, default=datetime.utcnow)

    # No foreign key constraint to avoid missing AdminUser table
    admin = None
