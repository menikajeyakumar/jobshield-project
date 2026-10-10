"""
JobShield ML Setup & Classifier Training Script
Run from backend/ folder:
    python inspect_db.py
"""
import os
import sys
import sqlite3
import subprocess
import json
import re
import shutil

BASE = os.path.dirname(os.path.abspath(__file__))

print("=" * 60)
print("  🛡️  JobShield ML Engine Setup & Training")
print("=" * 60)

# ── 1. Create directories ──────────────────────────────────────────────
ml_dir = os.path.join(BASE, "app", "ml")
data_dir = os.path.join(BASE, "data")
os.makedirs(ml_dir, exist_ok=True)
os.makedirs(data_dir, exist_ok=True)
print("[1/6] Directories verified: app/ml/ and data/")

# ── 2. Locate and copy fake_job_postings.csv if needed ──────────────────
candidates = [
    os.path.join(data_dir, "fake_job_postings.csv"),
    os.path.join(BASE, "..", "fake_job_postings.csv"),
    os.path.join(BASE, "..", "..", "fake_job_postings.csv"),
    os.path.join(BASE, "fake_job_postings.csv"),
]

csv_file = None
for c in candidates:
    norm = os.path.normpath(c)
    if os.path.exists(norm):
        csv_file = norm
        break

if csv_file:
    print(f"[2/6] Found dataset: {csv_file}")
    dest = os.path.normpath(os.path.join(data_dir, "fake_job_postings.csv"))
    if os.path.abspath(csv_file) != os.path.abspath(dest) and not os.path.exists(dest):
        try:
            shutil.copyfile(csv_file, dest)
            print(f"      Copied to: {dest}")
        except Exception as e:
            print(f"      Note: {e}")
else:
    print("[2/6] WARNING: fake_job_postings.csv not found in candidate paths!")

# ── 3. Write app/ml/__init__.py ────────────────────────────────────────
with open(os.path.join(ml_dir, "__init__.py"), "w", encoding="utf-8") as f:
    f.write("# ML package for JobShield\n")
print("[3/6] Created app/ml/__init__.py")

# ── 4. Write app/utils/ml_predict.py ──────────────────────────────────
ml_predict_code = '''"""
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
    text = re.sub(r"[^a-z0-9\\s]", " ", text)
    return re.sub(r"\\s+", " ", text).strip()


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
'''

with open(os.path.join(BASE, "app", "utils", "ml_predict.py"), "w", encoding="utf-8") as f:
    f.write(ml_predict_code)
print("[4/6] Created app/utils/ml_predict.py")

# ── 5. Write app/ml/train_classifier.py ───────────────────────────────
train_code = '''"""
Train Logistic Regression classifier on Kaggle Fake Job Postings dataset.
"""
import os
import json
import re
import csv
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

_candidates = [
    os.path.normpath(os.path.join(BASE_DIR, "..", "..", "data", "fake_job_postings.csv")),
    os.path.normpath(os.path.join(BASE_DIR, "..", "..", "..", "fake_job_postings.csv")),
    os.path.normpath(os.path.join(BASE_DIR, "..", "..", "..", "..", "fake_job_postings.csv")),
]

DATA_PATH = next((p for p in _candidates if os.path.exists(p)), _candidates[0])
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
VEC_PATH = os.path.join(BASE_DIR, "vectorizer.pkl")
METRICS_PATH = os.path.join(BASE_DIR, "metrics.json")


def clean_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[^a-z0-9\\s]", " ", text)
    return re.sub(r"\\s+", " ", text).strip()


def load_dataset(csv_path: str):
    texts = []
    labels = []
    try:
        import pandas as pd
        print(f"[ML] Loading with pandas from: {csv_path}")
        df = pd.read_csv(csv_path)
        cols = ["title", "description", "requirements", "company_profile", "benefits"]
        for c in cols:
            if c not in df.columns:
                df[c] = ""
            df[c] = df[c].fillna("")
        df["text"] = df[cols].apply(lambda r: " ".join(r.values), axis=1).apply(clean_text)
        df = df[df["text"].str.len() > 10].copy()
        texts = df["text"].tolist()
        labels = df["fraudulent"].astype(int).tolist()
    except Exception as e:
        print(f"[ML] Reading using built-in csv module ({e}) ...")
        with open(csv_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                combined = " ".join([
                    row.get("title", "") or "",
                    row.get("description", "") or "",
                    row.get("requirements", "") or "",
                    row.get("company_profile", "") or "",
                    row.get("benefits", "") or "",
                ])
                cleaned = clean_text(combined)
                if len(cleaned) > 10:
                    try:
                        lbl = int(row.get("fraudulent", 0))
                        texts.append(cleaned)
                        labels.append(lbl)
                    except (ValueError, TypeError):
                        continue
    return texts, labels


def train():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset not found at: {DATA_PATH}")

    texts, labels = load_dataset(DATA_PATH)
    n_fake = sum(labels)
    n_real = len(labels) - n_fake
    print(f"[ML] Total valid samples: {len(labels):,} (Fake: {n_fake:,}, Real: {n_real:,})")

    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )
    print(f"[ML] Train set: {len(X_train):,}, Test set: {len(X_test):,}")

    print("[ML] Fitting TF-IDF Vectorizer...")
    vectorizer = TfidfVectorizer(max_features=30000, ngram_range=(1, 2), sublinear_tf=True, min_df=3)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    print("[ML] Training Logistic Regression classifier (balanced class weights)...")
    clf = LogisticRegression(C=1.0, max_iter=1000, class_weight="balanced", solver="lbfgs", random_state=42)
    clf.fit(X_train_vec, y_train)

    y_pred = clf.predict(X_test_vec)
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    cm = confusion_matrix(y_test, y_pred).tolist()

    print("\\n" + "=" * 52)
    print(f"  Accuracy  : {acc:.4f} ({acc*100:.2f}%)")
    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1 Score  : {f1:.4f}")
    print(f"  Confusion Matrix: {cm}")
    print("=" * 52)
    print(classification_report(y_test, y_pred, target_names=["Real", "Fake"]))

    joblib.dump(clf, MODEL_PATH)
    joblib.dump(vectorizer, VEC_PATH)

    metrics = {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "confusion_matrix": cm,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
    }
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"[ML] Saved model: {MODEL_PATH}")
    print(f"[ML] Saved vectorizer: {VEC_PATH}")
    print(f"[ML] Saved metrics: {METRICS_PATH}")
    return metrics


if __name__ == "__main__":
    train()
'''

with open(os.path.join(ml_dir, "train_classifier.py"), "w", encoding="utf-8") as f:
    f.write(train_code)
print("[5/6] Created app/ml/train_classifier.py")

# ── 6. SQLite column migration ─────────────────────────────────────────
db_path = os.path.join(BASE, "jobshield.db")
if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        conn.execute("ALTER TABLE analyses ADD COLUMN ml_confidence REAL")
        conn.commit()
        conn.close()
        print("[6/6] Added ml_confidence column to analyses table in jobshield.db")
    except sqlite3.OperationalError:
        print("[6/6] SQLite analyses.ml_confidence column already exists (OK)")
else:
    print("[6/6] SQLite DB will auto-initialize on server start (OK)")

# Optional pip install
try:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pandas", "joblib", "-q"])
    print("[+] Dependencies verified.")
except Exception:
    pass

# Execute training if dataset available
if csv_file and os.path.exists(csv_file):
    print("\n[+] Training model right now...")
    sys.path.insert(0, BASE)
    from app.ml.train_classifier import train
    train()
    print("\n" + "=" * 60)
    print("  ✅ ML Classifier successfully trained and ready!")
    print("=" * 60)
else:
    print("\n⚠️ Place fake_job_postings.csv into backend/data/ and re-run.")


