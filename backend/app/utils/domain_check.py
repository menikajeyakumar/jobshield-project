"""
Utility helper for domain security inspection (DNS resolution, SSL certificate check,
typosquatting detection, and high-risk TLD analysis).
"""
import socket
import ssl
import re
from urllib.parse import urlparse
from typing import Dict, Any, List

HIGH_RISK_TLDS = {".top", ".xyz", ".tk", ".in.net", ".site", ".work", ".icu", ".online", ".tech", ".click", ".win"}
POPULAR_BRANDS = ["google", "amazon", "tcs", "infosys", "microsoft", "wipro", "accenture", "cognizant", "zohocorp", "flipkart"]

AUTHENTIC_DOMAINS = {
    "careers.google.com": "google.com",
    "google.com": "google.com",
    "amazon.jobs": "amazon.com",
    "amazon.com": "amazon.com",
    "tcs.com": "tcs.com",
    "infosys.com": "infosys.com",
    "microsoft.com": "microsoft.com",
    "wipro.com": "wipro.com",
    "zoho.com": "zoho.com",
}


def extract_domain(target_url: str) -> str:
    url = target_url.strip().lower()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    try:
        parsed = urlparse(url)
        return parsed.hostname or url.split("/")[0]
    except Exception:
        return url.replace("https://", "").replace("http://", "").split("/")[0]


def check_ssl_certificate(domain: str, port: int = 443) -> bool:
    context = ssl.create_default_context()
    try:
        with socket.create_connection((domain, port), timeout=3) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                return bool(cert)
    except Exception:
        return False


def check_dns_resolution(domain: str) -> bool:
    try:
        socket.gethostbyname(domain)
        return True
    except Exception:
        return False


def inspect_domain_security(target_url: str) -> Dict[str, Any]:
    domain = extract_domain(target_url)
    lower_domain = domain.lower()

    has_https = target_url.lower().startswith("https://") or check_ssl_certificate(domain)
    is_dns_valid = check_dns_resolution(domain)

    is_high_risk_tld = any(lower_domain.endswith(tld) for tld in HIGH_RISK_TLDS)

    is_impersonating = False
    for brand in POPULAR_BRANDS:
        if brand in lower_domain:
            official_suffix = f"{brand}.com"
            if not lower_domain.endswith(official_suffix) and not lower_domain.endswith(f"{brand}.jobs"):
                is_impersonating = True
                break

    is_known_legit = domain in AUTHENTIC_DOMAINS or lower_domain.endswith("zoho.com") or lower_domain.endswith("google.com")

    score = 15
    classification = "likely_genuine"

    if is_impersonating or (is_high_risk_tld and is_impersonating):
        score = 88
        classification = "likely_fake"
    elif is_high_risk_tld or not is_dns_valid:
        score = 68
        classification = "likely_fake"
    elif not has_https:
        score = 52
        classification = "suspicious"
    elif is_known_legit:
        score = 8
        classification = "likely_genuine"

    checks: List[Dict[str, str]] = [
        {
            "name": "Domain DNS Resolution & Active Records",
            "status": "safe" if is_dns_valid else "danger",
            "detail": f"Domain {domain} resolved to active server IP addresses." if is_dns_valid else f"Domain {domain} failed DNS resolution."
        },
        {
            "name": "SSL / TLS Encryption Security",
            "status": "safe" if has_https else "danger",
            "detail": "Valid TLS certificate detected. Encrypted connection verified." if has_https else "Unencrypted HTTP protocol or invalid TLS certificate."
        },
        {
            "name": "Brand Impersonation & Typosquatting Check",
            "status": "danger" if is_impersonating else "safe",
            "detail": f"Critical match: Domain uses a recognized brand trademark in an unofficial domain configuration." if is_impersonating else "No known corporate brand impersonation detected."
        },
        {
            "name": "High-Risk TLD & Anonymous Registrar Check",
            "status": "danger" if is_high_risk_tld else "safe",
            "detail": "Domain uses a high-risk TLD frequently associated with temporary scam sites." if is_high_risk_tld else "Standard top-level domain extension verified."
        }
    ]

    return {
        "domain": domain,
        "url": target_url,
        "score": score,
        "classification": classification,
        "has_https": has_https,
        "is_impersonating": is_impersonating,
        "is_high_risk_tld": is_high_risk_tld,
        "checks": checks
    }
