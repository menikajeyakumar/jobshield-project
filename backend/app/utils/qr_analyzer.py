import re
from typing import Dict, Any, List, Optional

from .ocr import extract_qr_codes  # reuse QR extraction helper if needed

try:
    from pyzbar.pyzbar import decode
except ImportError:
    decode = None  # qr decoding will be unavailable without pyzbar

# Simple URL detection regex
URL_REGEX = re.compile(r'^https?://', re.IGNORECASE)

# Simple UPI ID detection regex (e.g., username@bank)
UPI_REGEX = re.compile(r'^[\w.-]+@[\w.-]+$')

# Known shortener domains
SHORTENER_DOMAINS = {
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'bit.do', 'cutt.ly', 'tiny.cc'
}

# Suspicious keywords often used in phishing URLs
SUSPICIOUS_KEYWORDS = {
    'login', 'secure', 'verify', 'update', 'payment', 'bank', 'confirm', 'account', 'login', 'auth'
}


def _decode_qr(image_bytes: bytes) -> List[str]:
    """Decode QR codes from image bytes using pyzbar.
    Returns a list of decoded string payloads.
    """
    if decode is None:
        raise RuntimeError('pyzbar not installed; QR decoding unavailable')
    from PIL import Image
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    results = decode(img)
    return [r.data.decode('utf-8', errors='ignore') for r in results]


def _classify_content(content: str) -> str:
    """Classify decoded QR content into one of: url, upi, text, unknown."""
    if URL_REGEX.match(content):
        return 'url'
    if UPI_REGEX.match(content):
        return 'upi'
    if content.strip():
        return 'text'
    return 'unknown'


def _analyze_url(url: str) -> Dict[str, Any]:
    analysis: Dict[str, Any] = {}
    analysis['https'] = url.lower().startswith('https://')
    # Domain extraction
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
    except Exception:
        domain = ''
    analysis['shortener'] = any(domain.endswith(d) for d in SHORTENER_DOMAINS)
    lowered = url.lower()
    analysis['suspicious_keywords'] = any(kw in lowered for kw in SUSPICIOUS_KEYWORDS)
    # Simple risk heuristic
    risk_score = 0
    if not analysis['https']:
        risk_score += 10
    if analysis['shortener']:
        risk_score += 5
    if analysis['suspicious_keywords']:
        risk_score += 10
    analysis['risk_score'] = risk_score
    return analysis


def _analyze_upi(content: str, db_session) -> Dict[str, Any]:
    analysis: Dict[str, Any] = {}
    # Validate format
    analysis['format_valid'] = bool(UPI_REGEX.match(content))
    # Check scam DB match (using ScamPattern model if available)
    try:
        from ..models import ScamPattern
        match = db_session.query(ScamPattern).filter(
            ScamPattern.pattern_type == 'upi',
            ScamPattern.value == content.lower()
        ).first()
        analysis['scam_db_match'] = bool(match)
    except Exception:
        analysis['scam_db_match'] = False
    # Payment context heuristic – look for money related keywords
    lowered = content.lower()
    analysis['payment_context_suspicious'] = any(kw in lowered for kw in {'pay', 'payment', 'transfer', 'request', 'amount'})
    # Final risk determination (simple rules)
    if not analysis['format_valid']:
        risk = 'high'
    elif analysis['scam_db_match'] or analysis['payment_context_suspicious']:
        risk = 'medium'
    else:
        risk = 'low'
    analysis['final_risk'] = risk
    return analysis


def analyze_qr_image(image_bytes: bytes, db_session) -> Dict[str, Any]:
    """Full QR analysis pipeline.
    Returns a dict containing the decoded content, identified type, and a structured analysis.
    """
    decoded = _decode_qr(image_bytes)
    if not decoded:
        raise ValueError('No QR code detected in the image')
    # For simplicity, take the first payload if multiple are present
    content = decoded[0]
    content_type = _classify_content(content)
    analysis_result: Dict[str, Any] = {
        'type': content_type,
        'content': content,
    }
    if content_type == 'url':
        analysis_result['analysis'] = _analyze_url(content)
    elif content_type == 'upi':
        analysis_result['analysis'] = _analyze_upi(content, db_session)
    else:
        analysis_result['analysis'] = {}
    return analysis_result
