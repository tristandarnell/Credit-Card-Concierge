"""
Confidence monitor to detect when real data differs from synthetic training distribution.
Uses embedding-space statistics (mean, covariance) and Mahalanobis distance.
For high-dimensional features (>200), uses PCA to avoid huge covariance matrices.
"""

import numpy as np
from pathlib import Path


class ConfidenceMonitor:
    """
    Detects distribution shift: flags samples that fall far from the synthetic training
    distribution in embedding/TF-IDF space.
    """

    def __init__(self, percentile_threshold: float = 99.0, max_dim: int = 200):
        """
        Args:
            percentile_threshold: Samples beyond this percentile of training distances
                are flagged as OOD. Default 99 = top 1% furthest = suspicious.
            max_dim: Max feature dim before PCA reduction (avoids huge covariance).
        """
        self.percentile_threshold = percentile_threshold
        self.max_dim = max_dim
        self._mean: np.ndarray | None = None
        self._cov_inv: np.ndarray | None = None
        self._threshold: float | None = None
        self._use_covariance = True
        self._pca = None

    def fit(self, X: np.ndarray) -> "ConfidenceMonitor":
        """Fit on synthetic training features (embeddings or TF-IDF+embeddings)."""
        X = np.asarray(X, dtype=np.float64)
        if X.shape[1] > self.max_dim:
            from sklearn.decomposition import PCA

            n_components = min(self.max_dim, X.shape[0], X.shape[1])
            self._pca = PCA(n_components=n_components, random_state=42)
            X = self._pca.fit_transform(X)
        self._mean = np.mean(X, axis=0)

        # Mahalanobis: need inverse covariance. Add small diag for stability.
        cov = np.cov(X, rowvar=False)
        reg = 1e-4 * np.eye(cov.shape[0])
        try:
            self._cov_inv = np.linalg.inv(cov + reg)
            self._use_covariance = True
        except np.linalg.LinAlgError:
            # Fall back to Euclidean (diagonal covariance)
            self._cov_inv = np.diag(1.0 / (np.var(X, axis=0) + 1e-6))
            self._use_covariance = False

        # Compute distance for each training sample, get percentile threshold
        distances = self._mahalanobis(X, transform=False)
        self._threshold = float(np.percentile(distances, self.percentile_threshold))
        return self

    def _transform(self, X: np.ndarray) -> np.ndarray:
        """Apply PCA if fitted (for new data)."""
        if self._pca is not None:
            return self._pca.transform(X)
        return X

    def _mahalanobis(self, X: np.ndarray, *, transform: bool = True) -> np.ndarray:
        """Compute Mahalanobis distance. Set transform=False if X is already in reduced space."""
        assert self._mean is not None and self._cov_inv is not None
        X = np.asarray(X, dtype=np.float64)
        if transform and self._pca is not None:
            X = self._pca.transform(X)
        centered = X - self._mean
        # d^2 = (x - mu)^T Sigma^{-1} (x - mu)
        return np.sqrt(np.maximum(0, np.einsum("ij,jk,ik->i", centered, self._cov_inv, centered)))

    def score(self, X: np.ndarray) -> np.ndarray:
        """
        Return confidence score 0–1 per sample.
        1 = in-distribution, 0 = far OOD.
        Based on inverse of normalized distance.
        """
        distances = self._mahalanobis(X)
        if self._threshold is None or self._threshold <= 0:
            return np.ones(len(distances))
        # Normalize: 0 at threshold, 1 at 0 distance
        normalized = 1.0 - np.minimum(1.0, distances / self._threshold)
        return normalized

    def is_ood(self, X: np.ndarray) -> np.ndarray:
        """Boolean mask: True = out-of-distribution (suspicious)."""
        distances = self._mahalanobis(X)
        return distances > self._threshold if self._threshold is not None else np.zeros(len(X), dtype=bool)

    def fit_transform_scores(self, X: np.ndarray) -> np.ndarray:
        """Fit on X, return confidence scores for X (for calibration)."""
        self.fit(X)
        return self.score(X)

    def save(self, path: Path | str) -> None:
        """Persist monitor state."""
        import joblib

        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        # Use joblib for PCA; npz for arrays
        base = str(path).replace(".npz", "") if str(path).endswith(".npz") else str(path)
        np.savez(
            base + ".npz",
            mean=self._mean,
            cov_inv=self._cov_inv,
            threshold=self._threshold,
            percentile_threshold=self.percentile_threshold,
            use_covariance=self._use_covariance,
        )
        if self._pca is not None:
            joblib.dump(self._pca, base + "_pca.joblib")

    @classmethod
    def load(cls, path: Path | str) -> "ConfidenceMonitor":
        """Load persisted monitor."""
        import joblib

        path = Path(path)
        base = str(path).replace(".npz", "") if str(path).endswith(".npz") else str(path)
        data = np.load(base + ".npz", allow_pickle=True)
        mon = cls(percentile_threshold=float(data["percentile_threshold"]))
        mon._mean = data["mean"]
        mon._cov_inv = data["cov_inv"]
        mon._threshold = float(data["threshold"])
        mon._use_covariance = bool(data["use_covariance"])
        pca_path = Path(base + "_pca.joblib")
        if pca_path.exists():
            mon._pca = joblib.load(pca_path)
        return mon
