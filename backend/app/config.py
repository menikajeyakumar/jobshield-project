"""
Application configuration, loaded from environment variables / .env file.
Never hardcode secrets here - always read from the environment.
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./jobshield.db"

    admin_username: str = "admin"
    admin_password: str = "change_this_password"
    jwt_secret: str = "insecure-dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 120

    max_upload_mb: int = 8
    tesseract_cmd: str = "tesseract"

    search_api_key: str = ""
    search_api_url: str = ""

    frontend_origin: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_PDF_TYPES = {"application/pdf"}
ALLOWED_UPLOAD_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_PDF_TYPES
MAX_UPLOAD_BYTES = settings.max_upload_mb * 1024 * 1024

CATEGORIES = [
    "part_time_job",
    "internship",
    "work_from_home",
    "course_training",
    "scholarship",
    "government_scheme",
    "recruitment",
    "certificate",
    "freelance",
    "placement_job_fair",
    "unclassified",
]

CATEGORY_LABELS = {
    "part_time_job": "Part-Time Job",
    "internship": "Internship",
    "work_from_home": "Work-From-Home Offer",
    "course_training": "Course / Training Program",
    "scholarship": "Scholarship",
    "government_scheme": "Government / Private Scheme",
    "recruitment": "Recruitment Offer",
    "certificate": "Job / Internship Certificate",
    "freelance": "Freelance Offer",
    "placement_job_fair": "Placement / Job Fair Ad",
    "unclassified": "Unclassified",
}
