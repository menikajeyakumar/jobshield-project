import re
import io
from typing import List, Dict, Any

from .ocr import ocr_image_bytes
from .extraction import _is_negated_at

# Simple preprocessing: currently returns original bytes (can be enhanced later)
def preprocess_image(image_bytes: bytes) -> bytes:
    """Placeholder for image preprocessing (e.g., denoise, resize)."""
    return image_bytes

# Regex patterns for extraction
PHONE_REGEX = re.compile(r"(?:\+?91[-\s]?|0)?[6-9]\d{9}")
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+")
UPI_REGEX = re.compile(r"[\w.-]+@\w+", re.IGNORECASE)
AMOUNT_REGEX = re.compile(r"(?:₹|Rs\.?|INR)\\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?")
SALARY_REGEX = re.compile(r"(?:₹|Rs\.?|INR)\\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\\s*(?:per\\s*(?:month|year|day))?", re.IGNORECASE)
WEBSITE_REGEX = re.compile(r"https?://[\w./-]+")

def extract_phone_numbers(text: str) -> List[str]:
    return PHONE_REGEX.findall(text)

def extract_emails(text: str) -> List[str]:
    return EMAIL_REGEX.findall(text)

def extract_upi_ids(text: str) -> List[str]:
    return UPI_REGEX.findall(text)

def extract_payment_amounts(text: str) -> List[str]:
    return AMOUNT_REGEX.findall(text)

def extract_salaries(text: str) -> List[str]:
    return SALARY_REGEX.findall(text)

def extract_websites(text: str) -> List[str]:
    return WEBSITE_REGEX.findall(text)

# Red‑flag keyword groups
RED_FLAG_KEYWORDS = {
    "registration_fee": ["registration fee", "registration charge", "signup fee"],
    "payment_request": ["payment required", "pay now", "transfer amount", "send money", "upi"],
    "urgent_payment": ["urgent payment", "immediate payment", "pay immediately"],
    "immediate_joining": ["join immediately", "start today", "urgent joining"],
    "no_interview": ["no interview", "no interview required", "skip interview"],
    "unrealistic_salary": ["salary ", "earning ", "high salary", "per month", "per day"],
    "whatsapp_only": ["whatsapp only", "contact via whatsapp", "whatsapp only communication"],
}

def detect_red_flags(text: str) -> List[Dict[str, Any]]:
    flags: List[Dict[str, Any]] = []
    lowered = text.lower()
    for flag, keywords in RED_FLAG_KEYWORDS.items():
        for kw in keywords:
            kw_l = kw.lower()
            start = 0
            found = False
            while True:
                pos = lowered.find(kw_l, start)
                if pos == -1:
                    break
                if not _is_negated_at(lowered, pos):
                    found = True
                    break
                start = pos + 1
            if found:
                flags.append({"label": flag.replace('_', ' ').title(), "weight": 5, "type": "whatsapp_red_flag"})
                break
    return flags

def detect_unknown_recruiter(text: str) -> bool:
    """Heuristic: if no corporate email or website is present, mark as unknown recruiter."""
    has_email = bool(EMAIL_REGEX.search(text)) and not any(dom in text.lower() for dom in ["gmail.com", "yahoo.com", "outlook.com"])
    has_website = bool(WEBSITE_REGEX.search(text))
    return not (has_email or has_website)

def analyze_whatsapp_screenshot(image_bytes: bytes) -> Dict[str, Any]:
    """Full pipeline for a WhatsApp screenshot.
    Returns a dict compatible with the existing risk engine output.
    """
    preprocessed = preprocess_image(image_bytes)
    ocr_text = ocr_image_bytes(preprocessed)
    entities = {
        "phone_numbers": extract_phone_numbers(ocr_text),
        "emails": extract_emails(ocr_text),
        "upi_ids": extract_upi_ids(ocr_text),
        "payment_amounts": extract_payment_amounts(ocr_text),
        "salaries": extract_salaries(ocr_text),
        "websites": extract_websites(ocr_text),
    }
    red_flags = detect_red_flags(ocr_text)
    if detect_unknown_recruiter(ocr_text):
        red_flags.append({"label": "Unknown Recruiter", "weight": 10, "type": "whatsapp_red_flag"})
    return {
        "ocr_text": ocr_text,
        "entities": entities,
        "red_flags": red_flags,
    }
