#!/usr/bin/env python3
"""
Train transaction category classifiers and confidence monitors.
Usage:
  python ml/train.py [--data PATH] [--sample N] [--output DIR]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure project root is on path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd

from ml.classifier import TransactionClassifier
from ml.confidence_monitor import ConfidenceMonitor


def main() -> None:
    parser = argparse.ArgumentParser(description="Train transaction classifiers")
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("synthetic_brand_name_merchant_credit_card_transactions.csv"),
        help="Path to synthetic CSV (date, description, amount, category)",
    )
    parser.add_argument(
        "--sample",
        type=int,
        default=None,
        help="Subsample N rows for faster training (default: use all)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("ml/artifacts"),
        help="Directory to save models and monitors",
    )
    parser.add_argument(
        "--skip-embedding",
        action="store_true",
        help="Skip embedding model (faster, TF-IDF+LR only)",
    )
    parser.add_argument(
        "--confidence-threshold",
        type=float,
        default=0.25,
        help="LR: below this probability, try semantic fallback (default: 0.25)",
    )
    parser.add_argument(
        "--semantic-threshold",
        type=float,
        default=0.5,
        help="Semantic: below this similarity, label as Other (default: 0.5)",
    )
    args = parser.parse_args()

    print("Loading data...")
    df = pd.read_csv(args.data)
    df = df.dropna(subset=["description", "category"])
    if args.sample:
        df = df.sample(n=min(args.sample, len(df)), random_state=42)
    X = df["description"]
    y = df["category"]
    print(f"Training on {len(X):,} samples, {y.nunique()} categories")

    out = args.output
    out.mkdir(parents=True, exist_ok=True)

    # ---- Baseline: TF-IDF + LR ----
    print(f"\n--- Training TF-IDF + LR + semantic fallback (lr_threshold={args.confidence_threshold}, semantic_threshold={args.semantic_threshold}) ---")
    clf_baseline = TransactionClassifier(
        model_type="tfidf_lr",
        confidence_threshold=args.confidence_threshold,
        semantic_similarity_threshold=args.semantic_threshold,
    )
    clf_baseline.fit(X, y)
    clf_baseline.save(out / "tfidf_lr")

    # Confidence monitor on baseline features
    print("Fitting confidence monitor (baseline)...")
    X_feat_baseline = clf_baseline.get_feature_matrix_for_monitor(X)
    mon_baseline = ConfidenceMonitor(percentile_threshold=99.0)
    mon_baseline.fit(X_feat_baseline)
    mon_baseline.save(out / "confidence_monitor_tfidf_lr.npz")

    # ---- Enhanced: TF-IDF + all-MiniLM embeddings + LR ----
    if not args.skip_embedding:
        print("\n--- Training TF-IDF + embedding + LR ---")
        clf_embed = TransactionClassifier(
            model_type="tfidf_embedding_lr",
            confidence_threshold=args.confidence_threshold,
            semantic_similarity_threshold=args.semantic_threshold,
        )
        clf_embed.fit(X, y)
        clf_embed.save(out / "tfidf_embedding_lr")

        print("Fitting confidence monitor (embedding)...")
        X_feat_embed = clf_embed.get_feature_matrix_for_monitor(X)
        mon_embed = ConfidenceMonitor(percentile_threshold=99.0)
        mon_embed.fit(X_feat_embed)
        mon_embed.save(out / "confidence_monitor_tfidf_embedding_lr.npz")

    # ---- Quick eval ----
    pred = clf_baseline.predict(X.head(5))
    print("\nSample predictions (baseline):")
    for desc, cat, p in zip(X.head(5), y.head(5), pred):
        print(f"  {desc[:50]}... -> {p} (true: {cat})")

    scores = mon_baseline.score(X_feat_baseline[:100])
    ood = mon_baseline.is_ood(X_feat_baseline[:100])
    print(f"\nConfidence monitor: mean score={scores.mean():.3f}, OOD rate={ood.sum()}/100")

    print(f"\nArtifacts saved to {out}")


if __name__ == "__main__":
    main()
