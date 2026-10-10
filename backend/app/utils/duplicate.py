"""
Duplicate / near-duplicate advertisement detection.

Compares the new submission's text against previously stored analyses using
TF-IDF + cosine similarity (scikit-learn) as the primary text signal, plus
exact-match boosts for shared contact fields (phone/email/website), which
are strong duplicate signals even when the wording is reworded.
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models import Analysis

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


def find_duplicates(db: Session, new_text: str, new_entities: Dict[str, Any],
                     category: str, exclude_id: str = None,
                     limit_compare: int = 300) -> List[Dict[str, Any]]:
    if not new_text or len(new_text.strip()) < 10:
        return []

    q = db.query(Analysis).filter(Analysis.category == category)
    if exclude_id:
        q = q.filter(Analysis.id != exclude_id)
    prior = q.order_by(desc(Analysis.created_at)).limit(limit_compare).all()

    if not prior:
        return []

    results = []

    if SKLEARN_AVAILABLE:
        corpus = [new_text] + [p.raw_text or "" for p in prior]
        try:
            vec = TfidfVectorizer(stop_words="english", max_features=3000)
            tfidf = vec.fit_transform(corpus)
            sims = cosine_similarity(tfidf[0:1], tfidf[1:]).flatten()
        except ValueError:
            sims = [0.0] * len(prior)
    else:
        # fallback: crude Jaccard similarity on word sets
        def jaccard(a, b):
            sa, sb = set(a.lower().split()), set(b.lower().split())
            if not sa or not sb:
                return 0.0
            return len(sa & sb) / len(sa | sb)
        sims = [jaccard(new_text, p.raw_text or "") for p in prior]

    new_contacts = set(new_entities.get("phones", []) + new_entities.get("emails", []) + new_entities.get("upi_ids", []))

    for p, sim in zip(prior, sims):
        contact_boost = 0.0
        p_entities = p.extracted_entities or {}
        p_contacts = set(p_entities.get("phones", []) + p_entities.get("emails", []) + p_entities.get("upi_ids", []))
        if new_contacts and p_contacts and (new_contacts & p_contacts):
            contact_boost = 0.25

        final_sim = min(1.0, float(sim) + contact_boost)
        if final_sim >= 0.55:
            matching_fields = []
            if new_contacts & p_contacts:
                matching_fields.append("contact info")
            if new_entities.get("organization") and new_entities.get("organization") == p_entities.get("organization"):
                matching_fields.append("organization name")
            if final_sim >= 0.55:
                matching_fields.append("text content")

            results.append({
                "analysis_id": p.id,
                "similarity": round(final_sim, 2),
                "previous_analysis_date": p.created_at.isoformat() if p.created_at else None,
                "matching_fields": matching_fields,
                "previous_risk_score": p.risk_score,
                "previous_classification": p.classification,
            })

    results.sort(key=lambda r: r["similarity"], reverse=True)
    return results[:5]
