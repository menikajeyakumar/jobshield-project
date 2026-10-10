from typing import Dict, Any
from .extraction import _is_negated_at


def build_payment_risk(entities: Dict[str, Any]) -> Dict[str, Any]:
    """Perform advanced payment risk analysis.

    Steps:
    1. Load configurable payment patterns from JSON asset.
    2. Detect fee keywords across supported languages.
    3. Extract amounts, currency symbols, and UPI IDs.
    4. Determine payment reason (matched fee type or generic).
    5. Assign risk level based on fee type severity.
    6. Formulate recommendation.
    """
    import json
    import os
    import re

    # Load patterns (cached at module level if possible)
    patterns_path = os.path.join(os.path.dirname(__file__), "payment_patterns.json")
    try:
        with open(patterns_path, "r", encoding="utf-8") as f:
            patterns = json.load(f)
    except Exception:
        # Fallback minimal patterns if file missing
        patterns = {
            "fee_keywords": {},
            "amount_regex": r"(?:₹|Rs\.?|INR|\$)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?",
            "upi_regex": r"[\w.-]+@\w+",
        }

    text_chunks = []
    # Combine relevant textual entities for keyword search
    for key in ["ocr_text", "text", "message", "content"]:
        if isinstance(entities.get(key), str):
            text_chunks.append(entities[key])
    # Also include any extracted strings
    for val in entities.values():
        if isinstance(val, list):
            text_chunks.extend([str(v) for v in val])
        elif isinstance(val, str):
            text_chunks.append(val)
    full_text = " ".join(text_chunks).lower()

    # Detect fee keywords – skip any match preceded by a negation phrase
    matched_fees = []
    reason = None
    for fee_type, keywords in patterns.get("fee_keywords", {}).items():
        for kw in keywords:
            kw_l = kw.lower()
            start = 0
            while True:
                pos = full_text.find(kw_l, start)
                if pos == -1:
                    break
                if not _is_negated_at(full_text, pos):
                    matched_fees.append(fee_type)
                    if not reason:
                        reason = kw
                    break
                start = pos + 1

    # Extract amounts and currency
    amount_regex = re.compile(patterns.get("amount_regex", r"(?:₹|Rs\.?|INR|\$)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?"))
    amounts_found = amount_regex.findall(full_text)
    amount = amounts_found[0] if amounts_found else None
    # Determine currency symbol from amount if present
    currency = None
    if amount:
        currency_match = re.search(r"₹|Rs\.?|INR|\$", amount)
        currency = currency_match.group(0) if currency_match else None
        # Clean amount value (remove currency and commas)
        amount_value = re.sub(r"[^0-9.]", "", amount)
    else:
        amount_value = None

    # Extract UPI IDs
    upi_regex = re.compile(patterns.get("upi_regex", r"[\w.-]+@\w+"))
    upi_ids = upi_regex.findall(full_text)
    upi_id = upi_ids[0] if upi_ids else None

    payment_requested = bool(matched_fees or upi_id)

    # Determine risk level based on fee type severity
    high_risk_fees = {"registration_fee", "processing_fee", "training_fee", "security_deposit", "advance_payment"}
    medium_risk_fees = {"qr_payment", "upi_request", "bank_account_request"}
    if any(fee in high_risk_fees for fee in matched_fees):
        risk = "HIGH"
    elif any(fee in medium_risk_fees for fee in matched_fees):
        risk = "MEDIUM"
    else:
        risk = "LOW"

    recommendation = (
        "Do not make payment until you independently verify the organization."
        if risk == "HIGH"
        else "Proceed with caution and verify the organization if possible."
    )

    return {
        "payment_requested": payment_requested,
        "amount": amount_value,
        "currency": currency,
        "upi_id": upi_id,
        "reason": reason,
        "risk": risk,
        "recommendation": recommendation,
        "note": "Payment risk analysis completed using configurable patterns.",
    }
