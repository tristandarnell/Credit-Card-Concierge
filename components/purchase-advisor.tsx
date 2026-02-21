"use client";

import { FormEvent, useMemo, useState } from "react";

type Category = "Dining" | "Groceries" | "Travel" | "Transit" | "Gas" | "Shopping" | "Streaming" | "General";

type Rule = {
  card: string;
  rewards: string;
  multiplier: number;
  categories: Category[];
  note?: string;
};

const rules: Rule[] = [
  { card: "American Express Gold", rewards: "4x Membership Rewards points", multiplier: 4, categories: ["Dining", "Groceries"], note: "Best for restaurants and U.S. supermarkets" },
  { card: "Chase Sapphire Preferred", rewards: "3x Ultimate Rewards points", multiplier: 3, categories: ["Travel"], note: "Best for airlines, hotels, and travel portals" },
  { card: "Amex Blue Cash Preferred", rewards: "6% cash back", multiplier: 6, categories: ["Streaming"], note: "Best for select U.S. streaming services" },
  { card: "Amex Blue Cash Preferred", rewards: "3% cash back", multiplier: 3, categories: ["Gas"], note: "Best for U.S. gas stations and transit" },
  { card: "Capital One Venture X", rewards: "2x miles", multiplier: 2, categories: ["Transit", "General", "Shopping"] },
];

const CENTS_PER_POINT = 0.015; // ~1.5 cents per point (conservative UR/MR valuation)

export function PurchaseAdvisor() {
  const [merchant, setMerchant] = useState("Airbnb");
  const [amount, setAmount] = useState("285.00");
  const [category, setCategory] = useState<Category>("Travel");
  const [submitted, setSubmitted] = useState(false);

  const recommendation = useMemo(() => {
    const match = rules.find((rule) => rule.categories.includes(category));
    const numericAmount = Number(amount) || 0;

    if (!match) {
      const fallbackPoints = numericAmount * 2;
      const fallbackValue = (fallbackPoints * CENTS_PER_POINT).toFixed(2);
      return { card: "Capital One Venture X", rewards: "2x miles", estValue: `$${fallbackValue}`, note: "Flat-rate fallback for uncategorized spend" };
    }

    const points = numericAmount * match.multiplier;
    const value = (points * CENTS_PER_POINT).toFixed(2);

    return {
      card: match.card,
      rewards: match.rewards,
      estValue: `$${value}`,
      note: match.note
    };
  }, [amount, category]);

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
          Amount ($)
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
          <select value={category} onChange={(event) => setCategory(event.target.value as Category)}>
            <option>Dining</option>
            <option>Groceries</option>
            <option>Travel</option>
            <option>Transit</option>
            <option>Gas</option>
            <option>Shopping</option>
            <option>Streaming</option>
            <option>General</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary">Find Best Card</button>
      </form>

      {submitted ? (
        <div className="result-card" aria-live="polite">
          <p className="result-label">Best card for this purchase</p>
          <h3>{recommendation.card}</h3>
          <p>
            Use <strong>{recommendation.card}</strong> for <strong>{merchant}</strong> ({category}) to earn <strong>{recommendation.rewards}</strong>.
          </p>
          {recommendation.note && (
            <p className="muted" style={{ fontSize: "0.87rem" }}>{recommendation.note}</p>
          )}
          <p className="result-value">Estimated reward value: {recommendation.estValue}</p>
          <p className="hint">Estimate assumes ~1.5&cent; per point. Actual value depends on redemption method.</p>
        </div>
      ) : (
        <p className="muted">Enter a purchase above to see exactly which card maximizes your rewards for that transaction.</p>
      )}
    </div>
  );
}
