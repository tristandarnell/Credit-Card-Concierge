# Transaction Category Classifier

NLP-based classification of credit card transactions into 13 categories:

**Categories:** Groceries, Restaurants, Coffee Shops, Gas, Public Transport, Airfare, Hotels, Streaming, Utilities, Insurance, Electronics, Clothing, Other

## Models

1. **TF-IDF + Logistic Regression** (baseline) – Fast, interpretable
2. **TF-IDF + all-MiniLM-L6-v2 embeddings + LR** – Richer semantics by concatenating TF-IDF with sentence embeddings

## Confidence Monitor

Detects when real data differs from the synthetic training distribution (OOD). Uses Mahalanobis distance in feature space; flags samples beyond the 99th percentile of training distances. For high-dimensional TF-IDF, uses PCA (200 dims) before fitting.

## Usage

### Train (from project root)

```bash
# Quick: TF-IDF+LR only, 50k samples (~2 min)
npm run train:classifier:sample

# Full: both models, all 500k samples
npm run train:classifier

# Custom
python ml/train.py --data synthetic_credit_card_transactions.csv --sample 10000 --output ml/artifacts --skip-embedding
```

### Predict

```bash
# Single descriptions
python ml/predict.py "DEBIT STARBUCKS 123" "PAYMENT AMAZON 456" --json

# From CSV
python ml/predict.py --csv data/transactions_cleaned.csv --output data/categorized.csv --monitor ml/artifacts/confidence_monitor_tfidf_lr.npz
```

### API

```bash
curl -X POST http://localhost:3000/api/classify \
  -H "Content-Type: application/json" \
  -d '{"descriptions": ["DEBIT STARBUCKS 123", "Mta*Nyct Paygo NEW York NY"]}'
```

Response includes `category`, `confidence`, `confidence_score` (in-distribution), and `is_ood` (true if OOD).

## Dependencies

See `requirements.txt`: pandas, scikit-learn, sentence-transformers, joblib
