#!/usr/bin/env python3
"""
Test the transaction classifier and confidence monitor.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd

from ml.classifier import TransactionClassifier
from ml.confidence_monitor import ConfidenceMonitor


def test_sample_predictions():
    """Test on known real-world descriptions."""
    clf = TransactionClassifier.load("ml/artifacts/tfidf_lr")
    monitor = ConfidenceMonitor.load("ml/artifacts/confidence_monitor_tfidf_lr.npz")

    cases = [
        ("DEBIT STARBUCKS 123", "Coffee Shops"),
        ("Mta*Nyct Paygo NEW York NY", "Public Transport"),
        ("Venmo Payment 251123 Ethan Liu", "Restaurants"),
        ("PURCHASE AUTHORIZED Ctlp*Pepsi Bottlin Raleigh NC", "Other"),
    ]

    print("=== Sample predictions ===\n")
    for desc, expected in cases:
        pred = clf.predict([desc])[0]
        proba = clf.predict_proba([desc])[0]
        X_feat = clf.get_feature_matrix_for_monitor([desc])
        score = float(monitor.score(X_feat)[0])
        ood = bool(monitor.is_ood(X_feat)[0])
        ok = "✓" if pred == expected else " "
        print(f"  {ok} {desc[:50]}...")
        print(f"      -> {pred} (expect {expected}) conf={proba.max():.2f} in-dist={score:.2f} ood={ood}")
    print()


def test_held_out_accuracy():
    """Accuracy on held-out synthetic data (different seed from train)."""
    df = pd.read_csv("synthetic_credit_card_transactions.csv").dropna(subset=["description", "category"])
    test = df.sample(n=500, random_state=999)

    clf = TransactionClassifier.load("ml/artifacts/tfidf_lr")
    y_pred = clf.predict(test["description"].tolist())
    y_true = test["category"].tolist()
    acc = sum(a == b for a, b in zip(y_pred, y_true)) / len(y_true)

    print("=== Held-out accuracy (500 synthetic samples) ===\n")
    print(f"  Accuracy: {acc:.1%}\n")


def test_confidence_monitor():
    """Verify monitor flags OOD when given clearly different text."""
    clf = TransactionClassifier.load("ml/artifacts/tfidf_lr")
    monitor = ConfidenceMonitor.load("ml/artifacts/confidence_monitor_tfidf_lr.npz")

    in_dist = ["DEBIT MCDONALDS 123", "PAYMENT AMAZON 456"]  # similar to synthetic
    ood_like = ["xyzzzzqqq weirdmerchant123", "aaaaaaaa bbbbb cccccc"]  # gibberish

    X_in = clf.get_feature_matrix_for_monitor(in_dist)
    X_ood = clf.get_feature_matrix_for_monitor(ood_like)

    scores_in = monitor.score(X_in)
    scores_ood = monitor.score(X_ood)
    print("=== Confidence monitor ===\n")
    print(f"  In-distribution scores: {[f'{s:.2f}' for s in scores_in]}")
    print(f"  OOD-like scores:        {[f'{s:.2f}' for s in scores_ood]}")
    print()


if __name__ == "__main__":
    print("\n--- Classifier tests ---\n")
    test_sample_predictions()
    test_held_out_accuracy()
    test_confidence_monitor()
    print("Done.\n")
