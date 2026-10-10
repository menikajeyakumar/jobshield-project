"""
Rule-based entity extraction from free text (OCR output, pasted text, or
fetched page text). This is intentionally regex/heuristic based so it has
zero external dependencies and is easy to extend.
"""
import re
from typing import Dict, Any, List

# ---------------------------------------------------------------------------
# Negation-aware fee keyword detection
# ---------------------------------------------------------------------------
# Strategy: clause-level analysis instead of a fixed token window.
#
# A "clause boundary" is either:
#   (a) Sentence-ending punctuation  → . ! ?
#   (b) An adversative conjunction after a comma that starts a new contrasting
#       clause → ", but", ", however", ", yet", ", although", etc.
#
# Within the current clause (from the last boundary up to the keyword), we
# check if any negation word/phrase is present ANYWHERE before the match.
#
# This correctly handles long lists like:
#   "no registration fee, application fee, training fee, security deposit"
#   → ALL items are inside the same clause, "no" applies to all of them.
#
# And mixed sentences like:
#   "no registration fee, but you must pay ₹2000 security deposit"
#   → ", but" is a boundary: "security deposit" is in a NEW clause (no "no").

_CLAUSE_BOUNDARY_RE = re.compile(
    r'[.!?]'
    r'|(?:,\s*(?:but|however|yet|although|nevertheless|nonetheless|while|whereas|'
    r'though|even\s+though|except\s+that|despite|instead|conversely|on\s+the\s+other\s+hand)\b)',
    re.IGNORECASE,
)

# Words/phrases that signal the fee keyword is being DENIED, not demanded.
NEGATION_TOKENS = frozenset({
    # Single-word negators
    "no", "not", "never", "without", "zero", "none",
    "waived", "waiver", "exempt", "exempted", "free",
    "refrain", "avoid",
    # Contractions
    "don't", "dont", "won't", "wont", "can't", "cant",
    "isn't", "isnt", "aren't", "arent", "wasn't", "wasnt",
    "shouldn't", "shouldnt", "needn't", "neednt",
    # Two-word phrases (substring match inside clause)
    "do not", "does not", "did not", "is not", "are not",
    "will not", "would not", "cannot", "need not",
    "no upfront", "no up-front", "no advance",
    "not required", "not ask", "not charge", "not collect",
    "not demand", "not pay", "not needed",
    # Candidate-facing phrasing
    "candidates are not", "applicants are not", "you are not",
    "we do not", "we never", "we don't", "we won't",
    "company does not", "company will not",
    "no fees", "no charges", "no cost",
    "absolutely no", "strictly no",
    "free of charge", "free of cost", "at no cost", "at no charge",
    "there is no", "there are no",
})


def _is_negated_at(text_lower: str, match_start: int) -> bool:
    """Return True if the fee keyword at *match_start* is within a negated clause.

    Uses clause-level analysis: find the start of the current clause
    (bounded by sentence-end punctuation or adversative conjunctions),
    then check if any NEGATION_TOKEN appears anywhere within that clause
    before the keyword position.

    This correctly handles long comma-separated lists where one "no" negates
    many items, without any fixed token-window size limit.
    """
    preceding = text_lower[:match_start]

    # Find the last clause boundary strictly before the keyword
    clause_start = 0
    for m in _CLAUSE_BOUNDARY_RE.finditer(preceding):
        clause_start = m.end()

    # Text of the current clause up to (but not including) the keyword
    current_clause = preceding[clause_start:]

    # Check for any negation token/phrase in this clause fragment
    return any(neg in current_clause for neg in NEGATION_TOKENS)



PHONE_RE = re.compile(r'(?:(?:\+?91[\-\s]?)|0)?[6-9]\d{9}\b')
EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')
URL_RE = re.compile(r'(https?://[^\s,]+|www\.[^\s,]+)', re.IGNORECASE)
UPI_RE = re.compile(r'\b[a-zA-Z0-9.\-_]{2,256}@(?:ok(?:hdfcbank|icici|sbi|axis)|'
                     r'ybl|paytm|upi|apl|ibl|axl|hdfcbank|icici|sbi|axisbank|'
                     r'okbizaxis|yesbank|fbl|jio|idfcfirst)\b', re.IGNORECASE)
AMOUNT_RE = re.compile(
    r'(?:₹|rs\.?|inr)\s?([0-9][0-9,]{1,10}(?:\.\d{1,2})?)'
    r'|([0-9][0-9,]{2,10})\s?(?:rs\.?|inr|rupees)',
    re.IGNORECASE
)
CERT_ID_RE = re.compile(r'\b(?:cert(?:ificate)?\s*(?:id|no\.?|number)?\s*[:\-]?\s*)([A-Z0-9\-/]{5,30})', re.IGNORECASE)
DATE_RE = re.compile(
    r'\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|'
    r'\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b',
    re.IGNORECASE
)
SOCIAL_RE = re.compile(r'(?:@|instagram\.com/|facebook\.com/|t\.me/)([A-Za-z0-9_.]{3,40})')

FEE_KEYWORDS = [
    "registration fee", "training fee", "security deposit", "course fee",
    "processing fee", "admission fee", "onboarding fee", "verification fee",
    "refundable deposit", "advance payment", "activation fee", "kit fee",
]

SALARY_KEYWORDS = [
    "salary", "stipend", "per day", "per month", "per week", "income",
    "earn", "earning", "pay",
]

FREE_EMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "rediffmail.com",
    "icloud.com", "protonmail.com", "aol.com",
}


def _first_or_none(matches: List[str]):
    return matches[0].strip() if matches else None


def _find_fee_keywords_with_negation(text: str) -> List[str]:
    """Return fee keywords that are genuinely demanded (not negated).

    For each keyword in FEE_KEYWORDS we scan every occurrence in the
    lowercased text. An occurrence is kept only if it is NOT in a negated
    clause (checked via _is_negated_at using clause-boundary analysis).
    """
    text_l = text.lower()
    matched: List[str] = []
    for kw in FEE_KEYWORDS:
        start = 0
        found_affirmative = False
        while True:
            pos = text_l.find(kw, start)
            if pos == -1:
                break
            if not _is_negated_at(text_l, pos):
                found_affirmative = True
                break
            start = pos + 1
        if found_affirmative:
            matched.append(kw)
    return matched


def extract_entities(text: str) -> Dict[str, Any]:
    """Extract structured fields from raw text. Returns a dict the frontend
    can display and let the user correct before analysis continues."""
    text = text or ""

    phones = sorted(set(m.replace(" ", "") for m in PHONE_RE.findall(text)))
    emails = sorted(set(EMAIL_RE.findall(text)))
    urls = sorted(set(u.rstrip('.,)') for u in URL_RE.findall(text)))
    upi_ids = sorted(set(UPI_RE.findall(text)))

    amounts = []
    for m in AMOUNT_RE.finditer(text):
        val = m.group(1) or m.group(2)
        if val:
            amounts.append(val.replace(",", ""))

    fees_found = _find_fee_keywords_with_negation(text)
    salary_mentioned = any(kw in text.lower() for kw in SALARY_KEYWORDS)

    cert_ids = sorted(set(CERT_ID_RE.findall(text)))
    dates = sorted(set(DATE_RE.findall(text)))
    socials = sorted(set(SOCIAL_RE.findall(text)))

    email_domains = {e.split("@")[-1].lower() for e in emails}
    free_email_used = bool(email_domains & FREE_EMAIL_DOMAINS)

    # naive org name guess: look for "at <Org>", "Company:", "Organi[sz]ation:"
    org_match = re.search(
        r'(?:company|organi[sz]ation|institute|firm)\s*[:\-]\s*([A-Za-z0-9&.,\-\s]{3,60})',
        text, re.IGNORECASE
    )
    organization = org_match.group(1).strip() if org_match else None

    title_match = re.search(
        r'(?:position|role|job title|internship title|course)\s*[:\-]\s*([A-Za-z0-9&.,\-\s]{3,80})',
        text, re.IGNORECASE
    )
    title = title_match.group(1).strip() if title_match else None

    location_match = re.search(
        r'(?:location|address|based in)\s*[:\-]\s*([A-Za-z0-9,.\-\s]{3,100})',
        text, re.IGNORECASE
    )
    location = location_match.group(1).strip() if location_match else None

    return {
        "organization": organization,
        "title": title,
        "location": location,
        "phones": phones,
        "emails": emails,
        "websites": urls,
        "upi_ids": upi_ids,
        "amounts_found": amounts,
        "fee_keywords_found": fees_found,
        "salary_or_stipend_mentioned": salary_mentioned,
        "certificate_ids": cert_ids,
        "dates": dates,
        "social_handles": socials,
        "free_email_domain_used": free_email_used,
        "email_domains": sorted(email_domains),
    }
