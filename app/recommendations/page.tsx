import { SectionHeading } from "@/components/section-heading";
import { topCards } from "@/lib/mock-data";

const metrics = [
  { label: "Estimated annual gain", value: "$1,040" },
  { label: "Cards analyzed", value: "45" },
  { label: "Spending categories mapped", value: "14" }
];

export default function RecommendationsPage() {
  return (
    <section className="section section-tight">
      <SectionHeading
        title="Personalized Recommendations"
        subtitle="Cards are ranked by projected value after fees, category alignment, and redemption efficiency."
      />

      <div className="metrics-row">
        {metrics.map((metric) => (
          <article className="metric" key={metric.label}>
            <p>{metric.label}</p>
            <h3>{metric.value}</h3>
          </article>
        ))}
      </div>

      <div className="card-grid three">
        {topCards.map((card) => (
          <article className="card" key={card.name}>
            <div className="card-head">
              <h3>{card.name}</h3>
              <span className="score">Fit {card.fitScore}</span>
            </div>
            <p className="muted">{card.bestFor}</p>
            <p className="value">{card.projectedValue}</p>
            <p className="muted">Annual fee: {card.annualFee}</p>
            <ul className="compact-list">
              {card.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Card</th>
              <th>Fit Score</th>
              <th>Projected Value</th>
              <th>Annual Fee</th>
              <th>Best Use Case</th>
            </tr>
          </thead>
          <tbody>
            {topCards.map((card) => (
              <tr key={`${card.name}-row`}>
                <td>{card.name}</td>
                <td>{card.fitScore}</td>
                <td>{card.projectedValue}</td>
                <td>{card.annualFee}</td>
                <td>{card.bestFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
