#!/usr/bin/env python3
"""
Predict transaction categories and confidence scores.
Usage:
  python ml/predict.py "DEBIT STARBUCKS 123" "PAYMENT AMAZON 456"
  python ml/predict.py --csv data/transactions_cleaned.csv --output data/transactions_categorized.csv
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ml.classifier import TransactionClassifier
from ml.confidence_monitor import ConfidenceMonitor


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict transaction categories")
    parser.add_argument(
        "descriptions",
        nargs="*",
        help="Transaction descriptions to classify",
    )
    parser.add_argument(
        "--csv",
        type=Path,
        help="Input CSV with 'description' column",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Output CSV with predictions (when using --csv)",
    )
    parser.add_argument(
        "--model",
        type=Path,
        default=Path("ml/artifacts/tfidf_lr"),
        help="Classifier model directory",
    )
    parser.add_argument(
        "--embedding-model",
        type=Path,
        default=None,
        help="Use TF-IDF+embedding model instead (path to tfidf_embedding_lr)",
    )
    parser.add_argument(
        "--monitor",
        type=Path,
        default=None,
        help="Confidence monitor .npz (optional, for OOD detection)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON",
    )
    args = parser.parse_args()

    model_path = args.embedding_model or args.model
    if not model_path.exists():
        print(f"Model not found: {model_path}", file=sys.stderr)
        print("Run: python ml/train.py [--sample 50000] first", file=sys.stderr)
        sys.exit(1)

    clf = TransactionClassifier.load(model_path)
    monitor = None
    if args.monitor and args.monitor.exists():
        monitor = ConfidenceMonitor.load(args.monitor)

    if args.csv:
        df = pd.read_csv(args.csv)
        if "description" not in df.columns:
            print("CSV must have 'description' column", file=sys.stderr)
            sys.exit(1)
        X = df["description"].astype(str)
        pred = clf.predict(X)
        proba = clf.predict_proba(X)
        results = []
        for desc, cat, p in zip(X, pred, proba):
            r = {"description": desc, "category": cat, "confidence": float(p.max())}
            if monitor is not None:
                X_feat = clf.get_feature_matrix_for_monitor([desc])
                r["confidence_score"] = float(monitor.score(X_feat)[0])
                r["is_ood"] = bool(monitor.is_ood(X_feat)[0])
            results.append(r)
        if args.json:
            print(json.dumps(results))
            return
        df["category"] = pred
        df["category_confidence"] = proba.max(axis=1)
        if monitor is not None:
            X_feat = clf.get_feature_matrix_for_monitor(X)
            df["confidence_score"] = monitor.score(X_feat)
            df["is_ood"] = monitor.is_ood(X_feat)
        if args.output:
            df.to_csv(args.output, index=False)
            print(f"Saved to {args.output}")
        else:
            print(df.to_string())
        return

    if not args.descriptions:
        parser.print_help()
        sys.exit(0)

    X = args.descriptions
    pred = clf.predict(X)
    proba = clf.predict_proba(X)
    results = []
    for desc, cat, p in zip(X, pred, proba):
        r = {
            "description": desc,
            "category": cat,
            "confidence": float(p.max()),
        }
        if monitor is not None:
            X_feat = clf.get_feature_matrix_for_monitor([desc])
            r["confidence_score"] = float(monitor.score(X_feat)[0])
            r["is_ood"] = bool(monitor.is_ood(X_feat)[0])
        results.append(r)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        for r in results:
            ood = f" [OOD]" if r.get("is_ood") else ""
            print(f"{r['description'][:60]}... -> {r['category']} (conf={r['confidence']:.2f}){ood}")


if __name__ == "__main__":
    main()
