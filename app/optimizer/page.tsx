import { PurchaseAdvisor } from "@/components/purchase-advisor";
import { SectionHeading } from "@/components/section-heading";
import { purchaseExamples } from "@/lib/mock-data";

export default function OptimizerPage() {
  return (
    <section className="section section-tight">
      <SectionHeading
        title="Purchase Optimizer"
        subtitle="Recommend the best card for each transaction and feed the result into checkout autofill workflows."
      />

      <PurchaseAdvisor />

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
                <td>{item.merchant}</td>
                <td>{item.category}</td>
                <td>${item.amount.toFixed(2)}</td>
                <td>{item.card}</td>
                <td>{item.rewards}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
