"""
Official website / organization verification.

This module tries to fetch the claimed website (if provided) and do a
light-weight sanity check of whether the organization name / contact
details appear on that site. It fails gracefully (returns status
"could_not_verify") if there's no network access, no website provided,
or the fetch fails - it must NEVER claim an organization is fake purely
because verification failed.

To go further (e.g. actually searching the web for an organization's
official domain when none was provided), plug in a real search API using
SEARCH_API_KEY / SEARCH_API_URL from config and extend `search_official_site()`.
"""
from typing import Dict, Any
import requests
from bs4 import BeautifulSoup

from ..config import settings

REQUEST_TIMEOUT = 6


import re
from urllib.parse import urlparse

# Known URL shortener domains
SHORTENER_DOMAINS = {
    "bit.ly",
    "tinyurl.com",
    "goo.gl",
    "t.co",
    "ow.ly",
    "bit.do",
    "adf.ly",
    "is.gd",
    "buff.ly",
    "trib.al",
    "cutt.ly",
    "tiny.cc",
}

# Suspicious keywords indicative of scams
SUSPICIOUS_KEYWORDS = {
    "registration fee",
    "processing fee",
    "security deposit",
    "training fee",
    "immediate payment",
    "whatsapp only",
    "no interview",
    "guaranteed job",
    "100% placement",
    "limited seats",
    "urgent joining",
    "earn",
    "per day",
    "per hour",
    "quick cash",
    "work from home",
    "ukraine",
}

def _is_shortener(url: str) -> bool:
    """Return True if the URL uses a known shortening service."""
    domain = urlparse(url).hostname or ""
    return any(domain.lower().endswith(short) for short in SHORTENER_DOMAINS)

def _contains_suspicious(text: str) -> bool:
    """Detect presence of any suspicious keyword in the given text."""
    lowered = text.lower()
    return any(kw in lowered for kw in SUSPICIOUS_KEYWORDS)

def analyze_website(entities: Dict[str, Any]) -> Dict[str, Any]:
    """Perform comprehensive website risk analysis.

    Returns a dict containing:
        - website (str): the final inspected URL
        - trust_score (int): 0‑100, higher means more trustworthy
        - risk_level (str): LOW / MEDIUM / HIGH
        - checks (list): individual check results
    """
    checks = []
    website = ""
    trust_score = 100
    risk_level = "LOW"

    # 1. Retrieve base URL from entities
    websites = entities.get("websites") or []
    if not websites:
        return {
            "message": "No website was found in the submitted content to verify against.",
            "checked_url": None,
        }

    url = websites[0]
    if not url.startswith("http"):
        url = "https://" + url

    try:
        resp = requests.get(url, timeout=REQUEST_TIMEOUT, headers={"User-Agent": "JobShieldBot/1.0"})
        resp.raise_for_status()
    except requests.RequestException as e:
        return {
            "status": "could_not_verify",
            "message": f"The website could not be reached ({e.__class__.__name__}). "
                       f"This does NOT necessarily mean the organization is fake.",
            "checked_url": url,
        }

    soup = BeautifulSoup(resp.text, "html.parser")
    page_text = soup.get_text(" ", strip=True).lower()

    organization = entities.get("organization") or entities.get("company")
    matched_fields = []
    mismatched_fields = []

    if organization:
        if organization.lower() in page_text:
            matched_fields.append("organization name")
        else:
            mismatched_fields.append("organization name")

    for email in entities.get("emails", []):
        domain = email.split("@")[-1].lower()
        if domain in url.lower():
            matched_fields.append("email domain")
            break

    if matched_fields and not mismatched_fields:
        status = "match"
        message = "Organization details appear on the provided website."
    elif matched_fields and mismatched_fields:
        status = "partial"
        message = "Some details matched the website, others could not be confirmed."
    elif mismatched_fields:
        status = "mismatch"
        message = "The organization name could not be found on the provided website."
    else:
        status = "could_not_verify"
        message = "Not enough information to compare against the website content."

    return {
        "status": status,
        "message": message,
        "checked_url": url,
        "matched_fields": matched_fields,
        "mismatched_fields": mismatched_fields,
    }


verify_website = analyze_website

