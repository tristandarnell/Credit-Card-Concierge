"""
Transaction category classifier: TF-IDF + LR baseline and TF-IDF + all-MiniLM embeddings + LR.
Uses merchant-normalized input (canonical merchant names) for cleaner classification signals.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder

from ml.merchant_normalize import normalize_merchant

ModelType = Literal["tfidf_lr", "tfidf_embedding_lr"]


def _to_merchant(text: str) -> str:
    """Normalize raw description to canonical merchant for classification."""
    if not isinstance(text, str) or not text.strip():
        return ""
    return normalize_merchant(text) or ""


class TransactionClassifier:
    """
    Classifies transaction descriptions into:
    Groceries, Restaurants, Coffee Shops, Gas, Public Transport, Airfare,
    Hotels, Streaming, Utilities, Insurance, Electronics, Clothing, Other.
    """

    CATEGORIES = [
        "Airfare",
        "Clothing",
        "Coffee Shops",
        "Electronics",
        "Gas",
        "Groceries",
        "Hotels",
        "Insurance",
        "Other",
        "Public Transport",
        "Restaurants",
        "Streaming",
        "Utilities",
    ]

    def __init__(
        self,
        model_type: ModelType = "tfidf_lr",
        confidence_threshold: float = 0.25,
        semantic_similarity_threshold: float = 0.5,
    ):
        self.model_type = model_type
        self.confidence_threshold = confidence_threshold  # LR: below → try semantic
        self.semantic_similarity_threshold = semantic_similarity_threshold  # Semantic: below → Other
        self._tfidf: TfidfVectorizer | None = None
        self._lr: LogisticRegression | None = None
        self._label_encoder: LabelEncoder | None = None
        self._embedding_model = None  # sentence-transformers
        self._tfidf_dim: int = 0
        self._embedding_dim: int = 0

    def _get_embeddings(self, texts: list[str]) -> np.ndarray:
        """Compute all-MiniLM-L6-v2 sentence embeddings."""
        if self._embedding_model is None:
            from sentence_transformers import SentenceTransformer

            self._embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        cleaned = [_to_merchant(t) for t in texts]
        return self._embedding_model.encode(cleaned, show_progress_bar=False)

    def fit(
        self,
        X: pd.Series | list[str],
        y: pd.Series | list[str],
        tfidf_max_features: int = 5000,
        tfidf_ngram_range: tuple[int, int] = (1, 2),
        lr_max_iter: int = 500,
    ) -> "TransactionClassifier":
        """Train the classifier. Excludes 'Other' from training (reserved for low-confidence at inference)."""
        X = pd.Series(X).astype(str).tolist() if not isinstance(X, list) else [str(x) for x in X]
        y = pd.Series(y).tolist() if not isinstance(y, list) else list(y)
        # Exclude Other – model learns only named categories; Other = low-confidence fallback
        mask = [yi != "Other" for yi in y]
        X = [xi for xi, m in zip(X, mask) if m]
        y = [yi for yi, m in zip(y, mask) if m]
        if not X:
            raise ValueError("No non-Other samples to train on")
        X_clean = [_to_merchant(t) for t in X]

        self._label_encoder = LabelEncoder()
        y_enc = self._label_encoder.fit_transform(y)

        self._tfidf = TfidfVectorizer(
            max_features=tfidf_max_features,
            ngram_range=tfidf_ngram_range,
            min_df=2,
            max_df=0.95,
            sublinear_tf=True,
        )
        X_tfidf = self._tfidf.fit_transform(X_clean)
        self._tfidf_dim = X_tfidf.shape[1]

        if self.model_type == "tfidf_lr":
            X_feat = X_tfidf
        else:
            emb = self._get_embeddings(X)
            self._embedding_dim = emb.shape[1]
            # Concatenate TF-IDF (dense) with embeddings
            X_tfidf_dense = X_tfidf.toarray() if hasattr(X_tfidf, "toarray") else X_tfidf
            X_feat = np.hstack([X_tfidf_dense, emb])

        self._lr = LogisticRegression(
            max_iter=lr_max_iter,
            C=1.0,
            multi_class="multinomial",
            solver="lbfgs",
            random_state=42,
        )
        self._lr.fit(X_feat, y_enc)

        # Build semantic fallback centroids (all-MiniLM) for low-confidence cases
        try:
            from ml.semantic_fallback import build_centroids
            self._centroids, self._centroid_categories = build_centroids(X, y)
        except ImportError:
            self._centroids = np.array([])
            self._centroid_categories = []
        return self

    def _extract_features(self, X: list[str]) -> np.ndarray:
        """Get dense feature matrix for predict."""
        X_clean = [_to_merchant(t) for t in X]
        X_tfidf = self._tfidf.transform(X_clean)
        X_tfidf_dense = X_tfidf.toarray() if hasattr(X_tfidf, "toarray") else np.asarray(X_tfidf)
        if self.model_type == "tfidf_lr":
            return X_tfidf_dense
        emb = self._get_embeddings(X)
        return np.hstack([X_tfidf_dense, emb])

    def predict(self, X: pd.Series | list[str]) -> list[str]:
        """
        Predict categories. Two-stage:
        1. If LR max prob >= threshold → use LR prediction
        2. Else try semantic similarity (all-MiniLM). If similarity >= semantic_threshold → use it
        3. Else → Other
        """
        X_list = pd.Series(X).astype(str).tolist() if not isinstance(X, list) else [str(x) for x in X]
        if not X_list:
            return []
        X_feat = self._extract_features(X_list)
        proba = self._lr.predict_proba(X_feat)
        pred_enc = self._lr.predict(X_feat)
        lr_labels = self._label_encoder.inverse_transform(pred_enc).tolist()
        max_conf = proba.max(axis=1)

        # Stage 1: LR accepts
        result = []
        need_fallback = []
        need_fallback_idx = []
        for i, (lbl, conf) in enumerate(zip(lr_labels, max_conf)):
            if conf >= self.confidence_threshold:
                result.append((i, lbl, conf, "lr"))
            else:
                need_fallback.append(X_list[i])
                need_fallback_idx.append(i)

        if need_fallback and hasattr(self, "_centroids") and self._centroids.size > 0:
            from ml.semantic_fallback import predict_semantic
            sem_labels, sem_sim = predict_semantic(
                need_fallback,
                self._centroids,
                self._centroid_categories,
            )
            for idx, lbl, sim in zip(need_fallback_idx, sem_labels, sem_sim):
                if sim >= self.semantic_similarity_threshold:
                    result.append((idx, lbl, float(sim), "semantic"))
                else:
                    result.append((idx, "Other", float(sim), "rejected"))
        else:
            for idx in need_fallback_idx:
                result.append((idx, "Other", 0.0, "rejected"))

        result.sort(key=lambda r: r[0])
        return [r[1] for r in result]

    def predict_proba(self, X: pd.Series | list[str]) -> np.ndarray:
        """Predict class probabilities."""
        X_list = pd.Series(X).astype(str).tolist() if not isinstance(X, list) else [str(x) for x in X]
        if not X_list:
            return np.array([])
        X_feat = self._extract_features(X_list)
        return self._lr.predict_proba(X_feat)

    def get_feature_matrix_for_monitor(self, X: pd.Series | list[str]) -> np.ndarray:
        """Return dense feature matrix (for confidence monitor). Same as internal features."""
        X_list = pd.Series(X).astype(str).tolist() if not isinstance(X, list) else [str(x) for x in X]
        if not X_list:
            return np.array([]).reshape(0, self._tfidf_dim + self._embedding_dim)
        return np.asarray(self._extract_features(X_list), dtype=np.float64)

    def save(self, path: Path | str) -> None:
        """Save classifier and components."""
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)
        joblib.dump(self._tfidf, path / "tfidf.joblib")
        joblib.dump(self._lr, path / "lr.joblib")
        joblib.dump(self._label_encoder, path / "label_encoder.joblib")
        meta = {
            "model_type": self.model_type,
            "tfidf_dim": self._tfidf_dim,
            "embedding_dim": self._embedding_dim,
            "confidence_threshold": self.confidence_threshold,
            "semantic_similarity_threshold": self.semantic_similarity_threshold,
        }
        joblib.dump(meta, path / "meta.joblib")
        joblib.dump(
            {"centroids": getattr(self, "_centroids", None), "categories": getattr(self, "_centroid_categories", [])},
            path / "semantic_fallback.joblib",
        )

    @classmethod
    def load(cls, path: Path | str) -> "TransactionClassifier":
        """Load classifier."""
        path = Path(path)
        meta = joblib.load(path / "meta.joblib")
        c = cls(
            model_type=meta["model_type"],
            confidence_threshold=meta.get("confidence_threshold", 0.25),
            semantic_similarity_threshold=meta.get("semantic_similarity_threshold", 0.5),
        )
        c._tfidf = joblib.load(path / "tfidf.joblib")
        c._lr = joblib.load(path / "lr.joblib")
        c._label_encoder = joblib.load(path / "label_encoder.joblib")
        c._tfidf_dim = meta["tfidf_dim"]
        c._embedding_dim = meta.get("embedding_dim", 0)
        fallback_path = path / "semantic_fallback.joblib"
        if fallback_path.exists():
            fb = joblib.load(fallback_path)
            c._centroids = fb.get("centroids")
            c._centroid_categories = fb.get("categories", [])
        else:
            c._centroids = np.array([])
            c._centroid_categories = []
        return c
