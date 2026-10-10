"""
Keyword/heuristic based category classifier across the 10 supported
opportunity categories. Returns the best-matching category plus a
confidence score (0-1) based on keyword hit density.

Priority rules:
  1. Structured job-type fields (e.g. "job type: part-time") always win
     over generic keyword matches — even if the generic category has more hits.
  2. Generic keyword scoring applies only when no structured field matched.
  3. If no category evidence found: returns unclassified (no fallback guessing).

This is intentionally simple (no heavy ML dependency) so it runs instantly
with zero training data. It can later be swapped for a trained text
classifier (e.g. scikit-learn TF-IDF + LogisticRegression) without changing
the calling code.
"""
from typing import Tuple
from ..config import CATEGORIES

# ── Tier 1: Structured job-type field keywords (highest priority) ─────────────
# These represent explicit structured fields like "Job Type: Part-Time".
# A single hit here overrides all generic keyword scoring.
STRUCTURED_FIELD_KEYWORDS = {
    "part_time_job": [
        "job type: part-time", "job type: part time",
        "employment type: part-time", "employment type: part time",
        "work type: part-time", "work type: part time",
        "type: part-time", "type: part time",
    ],
    "internship": [
        "job type: internship", "employment type: internship",
        "work type: internship", "type: internship",
    ],
    "work_from_home": [
        "job type: work from home", "job type: wfh",
        "employment type: work from home", "employment type: wfh",
        "work type: work from home", "work type: wfh",
        "type: work from home", "type: wfh",
    ],
}

# ── Tier 2: Generic keyword scoring ───────────────────────────────────────────
# NOTE: Do NOT include structured-field keywords here — they live in Tier 1.
# NOTE: Removed weak generic terms (data entry job, typing job, etc.) that
# caused false part_time_job classifications for unrelated content.
CATEGORY_KEYWORDS = {
    "internship": [
        "internship", "intern position", "summer internship",
        "internship certificate", "internship offer", "internship opportunity",
        "trainee position",
    ],
    "work_from_home": [
        "work from home", "wfh", "work-from-home", "home based job",
        "home-based job", "remote work opportunity", "work from home job",
    ],
    "part_time_job": [
        "part-time", "part time", "part-time job", "part time job",
        "part-time jobs", "part time jobs", "part-time employment",
        "part time employment", "part-time position", "part time position",
        "part-time work", "part time work",
    ],
    "course_training": [
        "course", "training program", "certification course", "training institute",
        "bootcamp", "workshop", "certification training",
    ],
    "scholarship": [
        "scholarship", "scholarship application", "fellowship", "education grant",
        "merit scholarship", "financial aid scholarship",
    ],
    "government_scheme": [
        "government scheme", "govt scheme", "sarkari yojana", "pm yojana",
        "subsidy scheme", "national scheme", "ministry of",
    ],
    "recruitment": [
        "recruitment drive", "recruiting candidates", "walk-in recruitment",
        "recruitment advertisement", "hiring candidates", "walk-in interview",
        "offer letter", "appointment letter", "recruitment notification", "hiring drive",
    ],
    "certificate": [
        "certificate id", "certificate number", "this is to certify",
        "certificate of completion", "experience certificate", "verification code",
    ],
    "freelance": [
        "freelance", "freelancer", "gig work", "project based job",
        "per project payment", "freelance project",
    ],
    "placement_job_fair": [
        "job fair", "placement drive", "campus recruitment drive",
        "mega placement fair", "walk-in drive",
    ],
}


def detect_category(text: str, hint: str = None) -> Tuple[str, float]:
    """Return (category_slug, confidence_0_to_1).

    Detection order:
      0. Caller hint (trusted) — returned as-is with confidence 1.0
      1. Structured field keywords — "Job Type: X" style fields; confidence 0.95
      2. Generic keyword scoring — most keyword hits wins
      3. Fallback — "unclassified", confidence 0.0
    """
    text_l = (text or "").lower()

    # ── 0. Caller hint (explicitly supplied by the user in the UI) ─────────────
    if hint and hint in CATEGORIES and hint != "unclassified":
        return hint, 1.0

    # ── 1. Structured field keywords (highest priority, single hit wins) ───────
    for cat, structured_kws in STRUCTURED_FIELD_KEYWORDS.items():
        for kw in structured_kws:
            if kw in text_l:
                return cat, 0.95

    # ── 2. Generic keyword scoring ─────────────────────────────────────────────
    scores = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in text_l)
        if hits:
            scores[cat] = hits

    if not scores:
        return "unclassified", 0.0  # Evidence-based: no arbitrary fallback

    best_cat = max(scores, key=scores.get)
    total_hits = sum(scores.values())
    confidence = min(
        1.0,
        scores[best_cat] / max(total_hits, 1) * 0.6
        + 0.4 * min(scores[best_cat] / 3, 1)
    )
    return best_cat, round(confidence, 2)
