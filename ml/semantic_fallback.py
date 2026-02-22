"""
Semantic similarity fallback using all-MiniLM-L6-v2.
Used when TF-IDF+LR rejects (low confidence). Compares embedding to category centroids.
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np

from ml.merchant_normalize import normalize_merchant


def _get_encoder():
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer("all-MiniLM-L6-v2")
    except ImportError:
        raise ImportError(
            "sentence_transformers required for semantic fallback. "
            "Install with: pip install sentence-transformers"
        )


def _to_merchant(text: str) -> str:
    if not isinstance(text, str) or not text.strip():
        return ""
    return normalize_merchant(text) or ""


def build_centroids(X: list[str], y: list[str]) -> tuple[np.ndarray, list[str]]:
    """
    Build mean embedding (centroid) per category from training data.
    Excludes 'Other'. Returns (centroids, category_order).
    """
    encoder = _get_encoder()
    merchants = [_to_merchant(t) for t in X]
    embeddings = encoder.encode(merchants, show_progress_bar=False)

    categories = sorted(set(c for c in y if c != "all_other"))
    centroids = []
    for cat in categories:
        mask = np.array([yi == cat for yi in y])
        if mask.sum() == 0:
            continue
        cent = embeddings[mask].mean(axis=0)
        centroids.append(cent)
    centroids = np.array(centroids) if centroids else np.zeros((0, embeddings.shape[1]))
    return centroids, categories


def predict_semantic(
    texts: list[str],
    centroids: np.ndarray,
    categories: list[str],
) -> tuple[list[str], np.ndarray]:
    """
    Predict category by cosine similarity to centroids.
    Returns (predicted_labels, max_similarity_per_sample).
    """
    if centroids.size == 0 or not categories:
        return ["all_other"] * len(texts), np.zeros(len(texts))

    encoder = _get_encoder()
    merchants = [_to_merchant(t) for t in texts]
    emb = encoder.encode(merchants, show_progress_bar=False)

    # L2 normalize for cosine similarity
    emb_norm = emb / (np.linalg.norm(emb, axis=1, keepdims=True) + 1e-9)
    cent_norm = centroids / (np.linalg.norm(centroids, axis=1, keepdims=True) + 1e-9)
    sim = emb_norm @ cent_norm.T  # (n, n_categories)

    best_idx = np.argmax(sim, axis=1)
    best_sim = np.max(sim, axis=1)
    labels = [categories[i] for i in best_idx]
    return labels, best_sim
