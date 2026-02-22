import { SectionHeading } from "@/components/section-heading";
import { getCleanRewardCards } from "@/lib/rewards/data";
import { getCategorizedTransactionsPath } from "@/lib/rewards/spend-profile";
import { buildSpendProfileFromCsv } from "@/lib/rewards/spend-profile";
import {
  DEFAULT_ANNUAL_SPEND_PROFILE,
  estimateNetAnnualCardValue,
  formatDollars,
  recommendPortfolio,
  topRewardHighlights,
  CATEGORY_LABELS,
} from "@/lib/rewards/scoring";
import type { StandardCategory } from "@/lib/rewards/categories";

export default async function RecommendationsPage() {
  const cards = await getCleanRewardCards(1000);

  const categorizedPath = await getCategorizedTransactionsPath();
  const spendProfile = categorizedPath
    ? (await buildSpendProfileFromCsv(categorizedPath)).profile
    : DEFAULT_ANNUAL_SPEND_PROFILE;
  const hasUserData = !!categorizedPath;
  let profileMeta: { totalSpend: number; monthsOfData: number } | null = null;
  if (categorizedPath) {
    const meta = await buildSpendProfileFromCsv(categorizedPath);
    profileMeta = { totalSpend: meta.totalSpend, monthsOfData: meta.monthsOfData };
  }

  const rankedCards = cards
    .map((card) => ({
      card,
      netAnnualValue: estimateNetAnnualCardValue(card, spendProfile),
    }))
    .sort((left, right) => right.netAnnualValue - left.netAnnualValue);

  const portfolio = recommendPortfolio(cards, spendProfile, 5);
  const topCards = rankedCards.slice(0, 12);
  const issuerCount = new Set(cards.map((card) => card.issuer)).size;
  const maxValue = topCards.length > 0 ? Math.max(...topCards.map((item) => item.netAnnualValue)) : 1;
  const minValue = topCards.length > 0 ? Math.min(...topCards.map((item) => item.netAnnualValue)) : 0;

  const annualizedSpend =
    profileMeta && profileMeta.monthsOfData > 0
      ? Math.round((profileMeta.totalSpend * 12) / profileMeta.monthsOfData)
      : 0;

  const metrics = [
    { label: "Cards in dataset", value: String(cards.length) },
    { label: "Issuers", value: String(issuerCount) },
    ...(hasUserData && profileMeta
      ? [
          {
            label: "Your uploaded spend",
            value: `${profileMeta.monthsOfData} mo · ~$${Math.round(profileMeta.totalSpend).toLocaleString()}`,
          } as const,
          {
            label: "Est. annual spend",
            value: annualizedSpend > 0 ? `~$${annualizedSpend.toLocaleString()}/yr` : "-",
          } as const,
          ...(portfolio.totalProjectedValue >= 0
            ? [
                {
                  label: "Projected rewards",
                  value: formatDollars(portfolio.totalProjectedValue) + "/yr",
                } as const,
              ]
            : []),
        ]
      : []),
  ];

  return (
    <section className="section section-tight">
      <SectionHeading
        title="Personalized Recommendations"
        subtitle={
          hasUserData
            ? "Ranked by your actual transaction history. Upload more statements to refine."
            : "Using default spend profile. Upload statements for personalized rankings."
        }
      />

      <div className="metrics-row">
        {metrics.map((metric) => (
          <article className="metric" key={metric.label}>
            <p>{metric.label}</p>
            <h3>{metric.value}</h3>
          </article>
        ))}
      </div>

      {portfolio.cards.length > 0 && (
        <article className="panel" style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginTop: 0 }}>Recommended portfolio for your spend</h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            {portfolio.totalProjectedValue >= 0 ? (
              <>
                Based on your spend profile ({annualizedSpend > 0 ? `~$${annualizedSpend.toLocaleString()}/yr` : "from your statements"}), these{" "}
                {portfolio.cards.length} cards would earn an estimated{" "}
                <strong>{formatDollars(portfolio.totalProjectedValue)}/year</strong> in rewards
                {portfolio.totalFees > 0 && ` after ${formatDollars(portfolio.totalFees)} in annual fees`}.
              </>
            ) : (
              <>
                Your current spend may not justify cards with annual fees. Consider no-fee cards in the rankings below.
                Best available option: <strong>{formatDollars(portfolio.totalProjectedValue)}/year</strong>.
              </>
            )}
          </p>
          <div className="card-grid three" style={{ marginBottom: "1.5rem" }}>
            {portfolio.cards.map(({ card, netValue, categories }) => (
              <div key={card.id} className="card">
                <div className="card-head">
                  <h3>{card.cardName}</h3>
                  <span className="score">{formatDollars(netValue)}/yr</span>
                </div>
                <p className="muted">{card.issuer} · {card.annualFeeText ?? "Unknown"}</p>
                <ul className="compact-list">
                  {categories.slice(0, 5).map((c) => (
                    <li key={c.category}>
                      {CATEGORY_LABELS[c.category as StandardCategory]}: {c.rateText} → {formatDollars(c.rewardValue)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <details>
            <summary>Category assignments</summary>
            <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Best card</th>
                    <th>Annual spend</th>
                    <th>Rewards</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.categoryAssignments
                    .filter((a) => a.amount > 0 && a.cardName !== "No card")
                    .map((a) => (
                      <tr key={a.category}>
                        <td>{CATEGORY_LABELS[a.category]}</td>
                        <td>{a.cardName}</td>
                        <td>{formatDollars(a.amount)}</td>
                        <td>{formatDollars(a.rewardValue)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        </article>
      )}

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
