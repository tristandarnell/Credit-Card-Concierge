"use client";

import { FormEvent, useMemo, useState } from "react";
import { STANDARD_CATEGORIES, type StandardCategory } from "@/lib/rewards/categories";
import type { CardRewardRecord } from "@/lib/rewards/types";
import { CATEGORY_LABELS, formatDollars, getBestCardForPurchase } from "@/lib/rewards/scoring";

type PurchaseAdvisorProps = {
  cards: CardRewardRecord[];
};

const SELECTABLE_CATEGORIES = STANDARD_CATEGORIES.filter((category) => category !== "all_other");

export function PurchaseAdvisor({ cards }: PurchaseAdvisorProps) {
  const [merchant, setMerchant] = useState("Airbnb");
  const [amount, setAmount] = useState("285.00");
  const [category, setCategory] = useState<StandardCategory>("travel");
  const [submitted, setSubmitted] = useState(false);

  const recommendation = useMemo(() => {
    const purchaseAmount = Number(amount) || 0;
    if (purchaseAmount <= 0 || cards.length === 0) {
      return null;
    }

    return getBestCardForPurchase(cards, category, purchaseAmount);
  }, [amount, cards, category]);

  const recommendationValue = recommendation ? formatDollars(recommendation.estimatedRewardValue) : "$0";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="panel">
      <form className="grid-form" onSubmit={handleSubmit}>
        <label>
          Merchant
          <input
            value={merchant}
            onChange={(event) => setMerchant(event.target.value)}
            placeholder="e.g. Airbnb"
            required
          />
        </label>
        <label>
          Amount
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            required
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value as StandardCategory)}>
            {SELECTABLE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary">
          Calculate Best Card
        </button>
      </form>

      {submitted ? (
        <div className="result-card" aria-live="polite">
          <p className="result-label">Recommended card for this purchase</p>
          {recommendation ? (
            <>
              <h3>{recommendation.cardName}</h3>
              <p>
                {merchant} ({CATEGORY_LABELS[category]}) should use <strong>{recommendation.cardName}</strong> from{" "}
                <strong>{recommendation.issuer}</strong> for <strong>{recommendation.matchedRule.rateText}</strong>.
              </p>
              <p className="result-value">Estimated reward value: {recommendationValue}</p>
            </>
          ) : (
            <p>No eligible reward rule found for this purchase category yet.</p>
          )}
        </div>
      ) : (
        <p className="muted">
          Run a purchase to preview recommendation behavior from live card reward rules.
        </p>
      )}
    </div>
  );
}
