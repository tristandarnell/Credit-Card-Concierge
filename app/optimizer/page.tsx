import { PurchaseAdvisor } from "@/components/purchase-advisor";
import { SectionHeading } from "@/components/section-heading";
import type { StandardCategory } from "@/lib/rewards/categories";
import { CATEGORY_LABELS, formatDollars, getBestCardForPurchase } from "@/lib/rewards/scoring";
import { getCleanRewardCards } from "@/lib/rewards/data";

const samplePurchases: Array<{ merchant: string; category: StandardCategory; amount: number }> = [
  { merchant: "Whole Foods", category: "groceries", amount: 142.51 },
  { merchant: "United Airlines", category: "airfare", amount: 418.22 },
  { merchant: "Uber", category: "transit", amount: 26.8 },
  { merchant: "Local Cafe", category: "dining", amount: 19.75 }
];

export default async function OptimizerPage() {
  const cards = await getCleanRewardCards(500);
  const purchaseRows = samplePurchases.map((item) => ({
    ...item,
    recommendation: getBestCardForPurchase(cards, item.category, item.amount)
  }));

  return (
    <section className="section section-tight">
      <SectionHeading
        title="Purchase Optimizer"
        subtitle="Enter any merchant and amount to find the card that earns the most on that transaction — instantly."
      />

      <PurchaseAdvisor cards={cards} />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Merchant</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Best Card</th>
              <th>Expected Rewards</th>
            </tr>
          </thead>
          <tbody>
            {purchaseRows.map((item) => (
              <tr key={`${item.merchant}-${item.amount}`}>
                <td>{item.merchant}</td>
                <td>{CATEGORY_LABELS[item.category]}</td>
                <td>${item.amount.toFixed(2)}</td>
                <td>{item.recommendation?.cardName ?? "No match"}</td>
                <td>{item.recommendation ? formatDollars(item.recommendation.estimatedRewardValue) : "-"}</td>
      <div style={{ marginTop: "2rem" }}>
        <SectionHeading
          title="Example Recommendations"
          subtitle="Sample transactions showing how cards are matched to each spend category."
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Best Card</th>
                <th>Expected Rewards</th>
              </tr>
            </thead>
            <tbody>
              {purchaseExamples.map((item) => (
                <tr key={`${item.merchant}-${item.amount}`}>
                  <td style={{ fontWeight: 600 }}>{item.merchant}</td>
                  <td>{item.category}</td>
                  <td>${item.amount.toFixed(2)}</td>
                  <td>
                    <span className="card-chip">{item.card}</span>
                  </td>
                  <td>{item.rewards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: "0.6rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Reward values estimated at ~1.5&cent;/point for transferable currencies and face value for cash back. Actual value varies by redemption method.
        </p>
      </div>
    </section>
  );
}
