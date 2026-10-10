"""
Certificate QR verification.

Given QR payloads decoded from an uploaded certificate image, tries to
fetch the verification URL (if the QR contains one) and do a light
comparison against the certificate's extracted entities. Fails gracefully -
never declares a certificate fake purely because the QR could not be
verified.
"""
from typing import Dict, Any, List
import requests
from bs4 import BeautifulSoup

REQUEST_TIMEOUT = 6


def verify_certificate(qr_payloads: List[str], entities: Dict[str, Any]) -> Dict[str, Any]:
    if not qr_payloads:
        return {
            "status": "not_applicable",
            "message": "No QR code was detected on this certificate.",
        }

    qr_url = next((p for p in qr_payloads if p.startswith("http")), None)

    if not qr_url:
        return {
            "status": "could_not_verify",
            "message": "A QR code was found but it does not contain a verification link.",
            "qr_payloads": qr_payloads,
        }

    try:
        resp = requests.get(qr_url, timeout=REQUEST_TIMEOUT, headers={"User-Agent": "JobShieldBot/1.0"})
        resp.raise_for_status()
    except requests.RequestException as e:
        return {
            "status": "could_not_verify",
            "message": f"The QR verification link could not be reached ({e.__class__.__name__}). "
                       f"This does not necessarily mean the certificate is fake.",
            "qr_url": qr_url,
        }

    soup = BeautifulSoup(resp.text, "html.parser")
    page_text = soup.get_text(" ", strip=True).lower()

    matched = []
    mismatched = []

    cert_ids = entities.get("certificate_ids", [])
    for cid in cert_ids:
        if cid.lower() in page_text:
            matched.append("certificate ID")
        else:
            mismatched.append("certificate ID")

    if entities.get("organization") and entities["organization"].lower() in page_text:
        matched.append("organization name")

    if matched and not mismatched:
        status, message = "match", "Certificate details match the QR verification page."
    elif mismatched:
        status, message = "mismatch", "Some certificate details do not match the QR verification page."
    else:
        status, message = "could_not_verify", "Could not confidently compare certificate details with the verification page."

    return {
        "status": status,
        "message": message,
        "qr_url": qr_url,
        "matched_fields": matched,
        "mismatched_fields": mismatched,
    }
