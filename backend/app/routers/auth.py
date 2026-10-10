"""
Authentication API endpoints:
  POST /api/auth/register - User registration
  POST /api/auth/login    - User login
  GET  /api/auth/me       - Get current user profile
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from ..database import get_db
from .. import models, schemas
from ..config import settings
from ..utils.auth import hash_password, verify_password, create_access_token, get_current_user_optional

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.AuthTokenResponse)
def register_user(payload: schemas.UserRegisterRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=422, detail="Please enter a valid email address.")

    existing = db.query(models.User).filter(models.User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email address is already registered.")

    hashed_pw = hash_password(payload.password)
    user = models.User(email=email_clean, password_hash=hashed_pw)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id, role="user")
    return schemas.AuthTokenResponse(token=token, email=user.email, user_id=user.id)


@router.post("/login", response_model=schemas.AuthTokenResponse)
def login_user(payload: schemas.UserLoginRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email_clean).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(subject=user.id, role="user")
    return schemas.AuthTokenResponse(token=token, email=user.email, user_id=user.id)


@router.get("/me", response_model=schemas.UserOut)
def get_me(user: models.User = Depends(get_current_user_optional)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    return user
