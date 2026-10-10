"""
ML inference helper. Loaded once at FastAPI startup.
Returns None gracefully when model files do not yet exist.
"""
import logging
import os
import re
from typing import Optional

logger = logging.getLogger(__name__)

_BASE = os.path.dirname(os.path.abspath(__file__))
_ML_DIR = os.path.join(_BASE, "..", "ml")
MODEL_PATH = os.path.normpath(os.path.join(_ML_DIR, "model.pkl"))
VEC_PATH = os.path.normpath(os.path.join(_ML_DIR, "vectorizer.pkl"))

RULES_WEIGHT: float = 0.60
ML_WEIGHT: float = 0.40

_model = None
_vectorizer = None
_load_attempted = False


def _load_models() -> bool:
    global _model, _vectorizer, _load_attempted
    if _load_attempted:
        return _model is not None
    _load_attempted = True
    if not os.path.exists(MODEL_PATH) or not os.path.exists(VEC_PATH):
        logger.warning(
            "[ML] Model files not found at %s / %s. Using rule-based scoring only.",
            MODEL_PATH, VEC_PATH
        )
        return False
    try:
        import joblib
        _model = joblib.load(MODEL_PATH)
        _vectorizer = joblib.load(VEC_PATH)
        logger.info("[ML] Model and vectorizer loaded successfully.")
        return True
    except Exception as exc:
        logger.error("[ML] Failed to load model: %s", exc)
        return False


def _clean(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def predict_fraud_probability(text: str) -> Optional[float]:
    """Return 0.0-1.0 probability posting is fake. None if model unavailable."""
    if not _load_models():
        return None
    try:
        vec = _vectorizer.transform([_clean(text)])
        prob = _model.predict_proba(vec)[0]
        fake_idx = list(_model.classes_).index(1)
        return float(prob[fake_idx])
    except Exception as exc:
        logger.error("[ML] Prediction error: %s", exc)
        return None


def blend_scores(rule_score: int, ml_confidence: Optional[float]) -> int:
    """Blend rule score (0-100 int) with ML confidence (0.0-1.0). Falls back if None."""
    if ml_confidence is None:
        return rule_score
    blended = RULES_WEIGHT * rule_score + ML_WEIGHT * (ml_confidence * 100.0)
    return max(0, min(100, int(round(blended))))
