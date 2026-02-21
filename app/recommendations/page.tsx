import { SectionHeading } from "@/components/section-heading";
import { getCleanRewardCards } from "@/lib/rewards/data";
import { estimateNetAnnualCardValue, formatDollars, topRewardHighlights } from "@/lib/rewards/scoring";

export default async function RecommendationsPage() {
  const cards = await getCleanRewardCards(1000);
  const rankedCards = cards
    .map((card) => ({
      card,
      netAnnualValue: estimateNetAnnualCardValue(card)
    }))
    .sort((left, right) => right.netAnnualValue - left.netAnnualValue);

  const topCards = rankedCards.slice(0, 12);
  const issuerCount = new Set(cards.map((card) => card.issuer)).size;
  const averageConfidence =
    cards.length > 0
      ? Math.round((cards.reduce((sum, card) => sum + card.confidenceScore, 0) / cards.length) * 100)
      : 0;
  const maxValue = topCards.length > 0 ? Math.max(...topCards.map((item) => item.netAnnualValue)) : 1;
  const minValue = topCards.length > 0 ? Math.min(...topCards.map((item) => item.netAnnualValue)) : 0;

  const metrics = [
    { label: "Cards in clean dataset", value: String(cards.length) },
    { label: "Issuers represented", value: String(issuerCount) },
    { label: "Average confidence", value: `${averageConfidence}%` }
  ];

  return (
    <section className="section section-tight">
      <SectionHeading
        title="Personalized Recommendations"
        subtitle="Cards are ranked from live reward rules using a default annual spend profile and annual-fee adjustment."
      />

      <div className="metrics-row">
        {metrics.map((metric) => (
          <article className="metric" key={metric.label}>
            <p>{metric.label}</p>
            <h3>{metric.value}</h3>
          </article>
        ))}
      </div>

      {topCards.length === 0 ? (
        <article className="panel">
          <p className="muted">
            No clean card records available yet. Run `rewards:collect` and `rewards:sync`, then refresh this page.
          </p>
        </article>
      ) : null}

      <div className="card-grid three">
        {topCards.map(({ card, netAnnualValue }) => {
          const denominator = Math.max(1, maxValue - minValue);
          const fitScore = Math.round(60 + ((netAnnualValue - minValue) / denominator) * 40);
          const highlights = topRewardHighlights(card, 3);

          return (
            <article className="card" key={card.id}>
              <div className="card-head">
                <h3>{card.cardName}</h3>
                <span className="score">Fit {fitScore}</span>
              </div>
              <p className="muted">{card.issuer}</p>
              <p className="value">{formatDollars(netAnnualValue)}/year</p>
              <p className="muted">Annual fee: {card.annualFeeText ?? "Unknown"}</p>
              <ul className="compact-list">
                {highlights.length > 0 ? (
                  highlights.map((reason) => <li key={reason}>{reason}</li>)
                ) : (
                  <li>No high-confidence reward highlights available</li>
                )}
              </ul>
            </article>
          );
        })}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Card</th>
              <th>Issuer</th>
              <th>Fit Score</th>
              <th>Projected Net Value</th>
              <th>Annual Fee</th>
              <th>Highlights</th>
            </tr>
          </thead>
          <tbody>
            {topCards.map(({ card, netAnnualValue }) => {
              const denominator = Math.max(1, maxValue - minValue);
              const fitScore = Math.round(60 + ((netAnnualValue - minValue) / denominator) * 40);

              return (
                <tr key={`${card.id}-row`}>
                  <td>{card.cardName}</td>
                  <td>{card.issuer}</td>
                  <td>{fitScore}</td>
                  <td>{formatDollars(netAnnualValue)}</td>
                  <td>{card.annualFeeText ?? "Unknown"}</td>
                  <td>{topRewardHighlights(card, 2).join(" | ") || "No highlights"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
