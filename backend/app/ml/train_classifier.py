"""
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
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


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

    print("\n" + "=" * 52)
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
