"""
Transaction category classifier: TF-IDF + LR baseline and TF-IDF + all-MiniLM embeddings + LR.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder

ModelType = Literal["tfidf_lr", "tfidf_embedding_lr"]


def _clean_text(text: str) -> str:
    """Light normalization for classifier input (aligns with our NLP pipeline)."""
    if not isinstance(text, str) or not text.strip():
        return ""
    t = text.lower().strip()
    t = re.sub(r"[^\w\s]", " ", t)
    t = re.sub(r"\b[s]?\d{10,}\b", "", t, flags=re.I)
    t = re.sub(r"\bcard\s*\d{4}\b", "", t, flags=re.I)
    t = re.sub(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


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

    def __init__(self, model_type: ModelType = "tfidf_lr"):
        self.model_type = model_type
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
        cleaned = [_clean_text(t) for t in texts]
        return self._embedding_model.encode(cleaned, show_progress_bar=False)

    def fit(
        self,
        X: pd.Series | list[str],
        y: pd.Series | list[str],
        tfidf_max_features: int = 5000,
        tfidf_ngram_range: tuple[int, int] = (1, 2),
        lr_max_iter: int = 500,
    ) -> "TransactionClassifier":
        """Train the classifier."""
        X = pd.Series(X).astype(str).tolist() if not isinstance(X, list) else [str(x) for x in X]
        y = pd.Series(y).tolist() if not isinstance(y, list) else list(y)
        X_clean = [_clean_text(t) for t in X]

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
        return self

    def _extract_features(self, X: list[str]) -> np.ndarray:
        """Get dense feature matrix for predict."""
        X_clean = [_clean_text(t) for t in X]
        X_tfidf = self._tfidf.transform(X_clean)
        X_tfidf_dense = X_tfidf.toarray() if hasattr(X_tfidf, "toarray") else np.asarray(X_tfidf)
        if self.model_type == "tfidf_lr":
            return X_tfidf_dense
        emb = self._get_embeddings(X)
        return np.hstack([X_tfidf_dense, emb])

    def predict(self, X: pd.Series | list[str]) -> list[str]:
        """Predict categories."""
        X_list = pd.Series(X).astype(str).tolist() if not isinstance(X, list) else [str(x) for x in X]
        if not X_list:
            return []
        X_feat = self._extract_features(X_list)
        pred_enc = self._lr.predict(X_feat)
        return self._label_encoder.inverse_transform(pred_enc).tolist()

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
        }
        joblib.dump(meta, path / "meta.joblib")

    @classmethod
    def load(cls, path: Path | str) -> "TransactionClassifier":
        """Load classifier."""
        path = Path(path)
        c = cls(model_type=joblib.load(path / "meta.joblib")["model_type"])
        c._tfidf = joblib.load(path / "tfidf.joblib")
        c._lr = joblib.load(path / "lr.joblib")
        c._label_encoder = joblib.load(path / "label_encoder.joblib")
        meta = joblib.load(path / "meta.joblib")
        c._tfidf_dim = meta["tfidf_dim"]
        c._embedding_dim = meta.get("embedding_dim", 0)
        return c
