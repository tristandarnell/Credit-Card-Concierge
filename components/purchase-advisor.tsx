"use client";

import { FormEvent, useMemo, useState } from "react";

type Category = "Dining" | "Groceries" | "Travel" | "Transit" | "General";

type Rule = {
  card: string;
  rewards: string;
  categories: Category[];
};

const rules: Rule[] = [
  { card: "Amex Gold", rewards: "4x points", categories: ["Dining", "Groceries"] },
  { card: "Chase Sapphire Preferred", rewards: "2x points", categories: ["Travel"] },
  { card: "Capital One Venture X", rewards: "2x miles", categories: ["Transit", "General"] }
];

export function PurchaseAdvisor() {
  const [merchant, setMerchant] = useState("Airbnb");
  const [amount, setAmount] = useState("285.00");
  const [category, setCategory] = useState<Category>("Travel");
  const [submitted, setSubmitted] = useState(false);

  const recommendation = useMemo(() => {
    const match = rules.find((rule) => rule.categories.includes(category));
    if (!match) {
      return { card: "Capital One Venture X", rewards: "2x miles", estValue: "$5.70" };
    }

    const numericAmount = Number(amount) || 0;
    const multiplier = Number(match.rewards.charAt(0)) || 2;
    const points = numericAmount * multiplier;
    const centsPerPoint = 0.015;
    const value = (points * centsPerPoint) / 100;

    return {
      card: match.card,
      rewards: match.rewards,
      estValue: `$${value.toFixed(2)}`
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
          <select value={category} onChange={(event) => setCategory(event.target.value as Category)}>
            <option>Dining</option>
            <option>Groceries</option>
            <option>Travel</option>
            <option>Transit</option>
            <option>General</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary">Calculate Best Card</button>
      </form>

      {submitted ? (
        <div className="result-card" aria-live="polite">
          <p className="result-label">Recommended card for this purchase</p>
          <h3>{recommendation.card}</h3>
          <p>
            {merchant} ({category}) should use <strong>{recommendation.card}</strong> for <strong>{recommendation.rewards}</strong>.
          </p>
          <p className="result-value">Estimated reward value: {recommendation.estValue}</p>
        </div>
      ) : (
        <p className="muted">Run a purchase to preview how autofill recommendations will work in your checkout flow.</p>
      )}
    </div>
  );
}
