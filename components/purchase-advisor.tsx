"use client";

import { FormEvent, useCallback, useState } from "react";
import { STANDARD_CATEGORIES, type StandardCategory } from "@/lib/rewards/categories";
import type { CardRewardRecord } from "@/lib/rewards/types";
import {
  CATEGORY_LABELS,
  formatDollars,
  getBestCardForAllPurchases,
  getBestCardForPurchase,
} from "@/lib/rewards/scoring";

type PurchaseAdvisorProps = {
  cards: CardRewardRecord[];
};

type Purchase = {
  id: string;
  merchant: string;
  category: StandardCategory;
  amount: number;
};

const SELECTABLE_CATEGORIES = STANDARD_CATEGORIES.filter((category) => category !== "all_other");

export function PurchaseAdvisor({ cards }: PurchaseAdvisorProps) {
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<StandardCategory>("dining");
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const handleAdd = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const purchaseAmount = Number(amount) || 0;
      if (purchaseAmount <= 0 || !merchant.trim()) return;

      setPurchases((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          merchant: merchant.trim(),
          category,
          amount: purchaseAmount,
        },
      ]);
      setMerchant("");
      setAmount("");
    },
    [merchant, amount, category]
  );

  const handleRemove = useCallback((id: string) => {
    setPurchases((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setPurchases([]);
  }, []);

  const bestCardForAll = getBestCardForAllPurchases(
    cards,
    purchases.map((p) => ({ category: p.category, amount: p.amount }))
  );

  const totalOptimalReward = purchases.reduce((sum, p) => {
    const rec = getBestCardForPurchase(cards, p.category, p.amount);
    return sum + (rec?.estimatedRewardValue ?? 0);
  }, 0);

  return (
    <div className="optimizer-panel">
      <div className="panel">
        <form className="grid-form" onSubmit={handleAdd}>
          <label>
            Merchant
            <input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Whole Foods"
              required
            />
          </label>
          <label>
            Amount
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </label>
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value as StandardCategory)}>
              {SELECTABLE_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {CATEGORY_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary">
            Add Purchase
          </button>
        </form>
      </div>

      {purchases.length > 0 && bestCardForAll && (
        <div className="result-card" style={{ marginTop: "1rem" }} aria-live="polite">
          <p className="result-label">Best single card for all purchases combined</p>
          <p>
            Using <strong>{bestCardForAll.cardName}</strong> from <strong>{bestCardForAll.issuer}</strong> for all{" "}
            {purchases.length} purchase{purchases.length === 1 ? "" : "s"} would earn{" "}
            <strong className="result-value">{formatDollars(bestCardForAll.totalRewardValue)}</strong> in rewards.
          </p>
          <p className="muted" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            Using the optimal card per purchase would earn {formatDollars(totalOptimalReward)}
            {totalOptimalReward > bestCardForAll.totalRewardValue
              ? ` — ${formatDollars(totalOptimalReward - bestCardForAll.totalRewardValue)} more with multiple cards`
              : " (same as single card)"}.
          </p>
        </div>
      )}

      <div style={{ marginTop: "1rem" }}>
        {purchases.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClearAll}
              aria-label="Clear all purchases"
            >
              Clear All
            </button>
          </div>
        )}
        <div className="table-wrap">
          <table>
          <thead>
            <tr>
              <th>Merchant</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Best Card</th>
              <th>Expected Rewards</th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted" style={{ padding: "2rem", textAlign: "center" }}>
                  No purchases yet. Add purchases above to see the best card for each.
                </td>
              </tr>
            ) : (
              purchases.map((p) => {
                const recommendation = getBestCardForPurchase(cards, p.category, p.amount);
                return (
                  <tr key={p.id}>
                    <td>{p.merchant}</td>
                    <td>{CATEGORY_LABELS[p.category]}</td>
                    <td>${p.amount.toFixed(2)}</td>
                    <td>{recommendation?.cardName ?? "No match"}</td>
                    <td>{recommendation ? formatDollars(recommendation.estimatedRewardValue) : "-"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "0.3rem 0.5rem", fontSize: "0.78rem" }}
                        onClick={() => handleRemove(p.id)}
                        aria-label={`Remove ${p.merchant}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
