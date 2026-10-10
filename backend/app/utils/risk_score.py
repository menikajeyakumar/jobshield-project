"""
Combines red flags, scam-pattern matches, duplicate matches and web
verification results into a single transparent 0-100 risk score and a
3-tier classification. Never outputs "100% fake/genuine" - always the
evidence-based tier language required by the product spec.
"""
from typing import Dict, Any, List, Tuple
from ..utils.risk_weights import get_weights

MAX_SCORE = 100


def calculate_risk_score(
    red_flags: List[Dict[str, Any]],
    scam_pattern_matches: List[Dict[str, Any]],
    duplicate_matches: List[Dict[str, Any]],
    web_verification: Dict[str, Any],
    positive_indicators: List[Dict[str, Any]],
) -> Tuple[int, str, List[Dict[str, Any]]]:
    """Calculate a hybrid risk score.
    Incorporates rule‑based components and configurable weights.
    Scam pattern matches contribute based on their risk_level (low/medium/high).
    """
    breakdown: List[Dict[str, Any]] = []
    score = 0
    weights = get_weights()

    # Red flags (already weighted per flag entry)
    for flag in red_flags:
        w = int(flag.get("weight", 0))
        score += w
        breakdown.append({"label": flag["label"], "impact": f"+{w}", "type": "red_flag"})

    # Scam pattern matches – weight by risk_level using config
    risk_level_to_weight = {
        "low": weights.get("scam_db", 5),
        "medium": weights.get("scam_db", 5) * 2,  # treat medium as double low
        "high": weights.get("scam_db", 5) * 3,    # high triple low
    }
    if scam_pattern_matches:
        for match in scam_pattern_matches:
            level = match.get("risk_level", "medium")
            w = risk_level_to_weight.get(level, weights.get("scam_db", 5))
            score += w
            breakdown.append({
                "label": f"Scam pattern ({match.get('category') or 'general'}): {match.get('value')}",
                "impact": f"+{w}",
                "type": "scam_pattern",
                "risk_level": level,
            })

    # Duplicate detection
    if duplicate_matches:
        best = max(duplicate_matches, key=lambda d: d.get("similarity", 0))
        if best.get("similarity", 0) >= 0.85 and best.get("previous_risk_score", 0) >= 66:
            w = weights.get("duplicate", 5)
            score += w
            breakdown.append({"label": "Near‑duplicate of a high‑risk ad", "impact": f"+{w}", "type": "duplicate"})

    # Web verification
    wv_status = web_verification.get("status")
    if wv_status == "mismatch":
        w = weights.get("website", 10)
        score += w
        breakdown.append({"label": "Website details mismatch", "impact": f"+{w}", "type": "web_verification"})
    elif wv_status == "match":
        w = weights.get("website", 10)
        score -= w
        breakdown.append({"label": "Website details match", "impact": f"-{w}", "type": "web_verification"})

    # Positive indicators provide a small reduction
    pos_reduction = min(15, 3 * len(positive_indicators))
    if pos_reduction:
        score -= pos_reduction
        breakdown.append({"label": f"{len(positive_indicators)} positive indicator(s)", "impact": f"-{pos_reduction}", "type": "positive"})

    # Clamp score
    score = max(0, min(MAX_SCORE, score))

    # Classification based on final score
    if score <= 30:
        classification = "likely_genuine"
    elif score <= 65:
        classification = "suspicious"
    else:
        classification = "likely_fake"

    return score, classification, breakdown


CLASSIFICATION_LABELS = {
    "likely_genuine": "🟢 LIKELY GENUINE",
    "suspicious": "🟡 SUSPICIOUS",
    "likely_fake": "🔴 LIKELY FAKE",
}


def build_explanation(classification: str, red_flags: List[Dict], scam_matches: List[Dict], score: int) -> str:
    n_flags = len(red_flags)
    base = (
        f"This result is based on {n_flags} detected risk indicator(s) in the submitted content, "
        f"{'a match against known suspicious patterns, ' if scam_matches else ''}"
        f"and available verification information. It is NOT a legal or final determination - "
        f"it is an evidence-based estimate to help you decide how much caution to apply."
    )
    if classification == "likely_fake":
        return ("Multiple strong risk indicators were found (such as upfront payment requests, "
                "unrealistic guarantees, or unverifiable organization details). " + base)
    if classification == "suspicious":
        return ("Some risk indicators were found, but not enough to be conclusive either way. "
                "Proceed carefully and verify independently before sharing money or personal information. " + base)
    return ("Few or no strong risk indicators were found in the available information. "
            "This does not guarantee the opportunity is genuine - always verify independently. " + base)


def build_recommendations(classification: str, entities: Dict[str, Any]) -> List[str]:
    recs = [
        "Do not pay any registration, training, security, or onboarding fee until the organization is independently verified.",
        "Never share OTPs, passwords, PINs, or banking credentials with a recruiter or advertiser.",
        "Verify the organization's official website and contact details independently (not just the link provided in the ad).",
    ]
    if entities.get("upi_ids"):
        recs.append("Do not send money to a personal UPI ID for a job, internship, or scholarship application.")
    if classification == "likely_fake":
        recs.append("Avoid proceeding with this opportunity. Consider reporting it using the 'Report This Opportunity' button.")
    elif classification == "suspicious":
        recs.append("Ask for an official offer letter on company letterhead and confirm details via the organization's verified contact channels.")
    else:
        recs.append("Even for likely-genuine opportunities, always confirm final offers through official/verified channels before sharing sensitive documents.")
    return recs
