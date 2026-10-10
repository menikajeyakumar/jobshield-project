import re
import unicodedata
from typing import List, Dict

# Unicode ranges for language detection
_TAMIL_REGEX = re.compile(r"[\u0B80-\u0BFF]")
_HINDI_REGEX = re.compile(r"[\u0900-\u097F]")
_LATIN_REGEX = re.compile(r"[A-Za-z]")

# Simple keyword dictionaries for scam detection per language
SCAM_KEYWORDS: Dict[str, List[str]] = {
    "en": [
        "payment", "fee", "registration", "deposit", "guaranteed",
        "immediate", "urgent", "no interview", "click", "offer",
    ],
    "ta": [
        "கட்டணம்", "பதிவு", "உறுதி", "உங்களுக்கு", "உடனடியாக", "மூலமாக", "சொல்",
    ],
    "hi": [
        "पंजीकरण", "शुल्क", "भुगतान", "गैरव्यावसायिक", "तुरंत", "गैरइंटरव्यू",
    ],
    "tanglish": [
        "pay", "registration", "fee", "guaranteed", "pannunga", "pay", "pannunga",
    ],
}

def detect_language(text: str) -> str:
    """Detect the language of the given text.

    Returns one of: 'en' (English), 'ta' (Tamil), 'hi' (Hindi), 'tanglish'.
    """
    has_tamil = bool(_TAMIL_REGEX.search(text))
    has_hindi = bool(_HINDI_REGEX.search(text))
    has_latin = bool(_LATIN_REGEX.search(text))

    if has_tamil:
        # If Tamil characters present together with Latin characters, treat as Tanglish
        if has_latin:
            return "tanglish"
        return "ta"
    if has_hindi:
        return "hi"
    # Default to English for Latin-only or other scripts
    return "en"

def normalize_text(text: str) -> str:
    """Normalize input text for downstream processing.

    Steps:
    1. Unicode NFKC normalization.
    2. Lowercase.
    3. Collapse whitespace.
    4. Strip leading/trailing spaces.
    """
    # Unicode normalization
    text = unicodedata.normalize("NFKC", text)
    # Lowercase (safe for all scripts; non‑alphabetic chars remain unchanged)
    text = text.lower()
    # Collapse any whitespace characters (including newlines, tabs) into a single space
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def get_scam_keywords(language_code: str) -> List[str]:
    """Return the list of scam‑related keywords for the detected language.
    """
    return SCAM_KEYWORDS.get(language_code, SCAM_KEYWORDS["en"])

__all__ = [
    "detect_language",
    "normalize_text",
    "get_scam_keywords",
]
