import { SectionHeading } from "@/components/section-heading";
import { SpendingTrendsChart } from "@/components/spending-trends-chart";
import { CardVisual } from "@/components/card-visual";
import { buildRewardsInsights } from "@/lib/rewards/insights";
import { getCleanRewardCards } from "@/lib/rewards/data";
import { getCategorizedTransactionsPath, buildSpendingTrendsFromCsv } from "@/lib/rewards/spend-profile";
import { buildSpendProfileFromCsv } from "@/lib/rewards/spend-profile";
import {
  buildPortfolioParetoFrontier,
  DEFAULT_ANNUAL_SPEND_PROFILE,
  estimateNetAnnualCardValue,
  formatDollars,
  recommendPortfolio,
  topRewardHighlights,
  CATEGORY_LABELS,
} from "@/lib/rewards/scoring";

export default async function RecommendationsPage() {
  const cards = await getCleanRewardCards(1000);

  const categorizedPath = await getCategorizedTransactionsPath();
  const spendProfileFromCsv = categorizedPath ? await buildSpendProfileFromCsv(categorizedPath) : null;
  const spendProfile = spendProfileFromCsv?.profile ?? DEFAULT_ANNUAL_SPEND_PROFILE;
  const hasUserData = !!categorizedPath;
  const profileMeta = spendProfileFromCsv
    ? {
        totalSpend: spendProfileFromCsv.totalSpend,
        monthsOfData: spendProfileFromCsv.monthsOfData,
        daysOfData: spendProfileFromCsv.daysOfData,
      }
    : null;
  const spendingTrends = categorizedPath ? await buildSpendingTrendsFromCsv(categorizedPath) : null;

  const rankedCards = cards
    .map((card) => ({
      card,
      netAnnualValue: estimateNetAnnualCardValue(card, spendProfile),
    }))
    .sort((left, right) => right.netAnnualValue - left.netAnnualValue);

  const portfolio = recommendPortfolio(cards, spendProfile, 5);
  const portfolioFrontier = buildPortfolioParetoFrontier(cards, spendProfile, {
    maxCardsPerCombo: 4,
    candidatePoolSize: 12,
  });
  const insights = await buildRewardsInsights({
    cards,
    spendProfile,
    categorizedCsvPath: categorizedPath,
    frontier: portfolioFrontier,
  });

  const topCards = rankedCards.slice(0, 12);
  const issuerCount = new Set(cards.map((card) => card.issuer)).size;
  const maxValue = topCards.length > 0 ? Math.max(...topCards.map((item) => item.netAnnualValue)) : 1;
  const minValue = topCards.length > 0 ? Math.min(...topCards.map((item) => item.netAnnualValue)) : 0;

  const annualizedSpend =
    profileMeta && profileMeta.daysOfData > 0
      ? Math.round((profileMeta.totalSpend * 365) / profileMeta.daysOfData)
      : 0;

  const maxRewardPoint =
    portfolioFrontier.points.length > 0
      ? [...portfolioFrontier.points].sort(
          (left, right) =>
            right.totalRewards - left.totalRewards || left.annualFee - right.annualFee || left.cardCount - right.cardCount
        )[0]
      : null;

  const efficiencyThreshold = 0.9;
  const efficientPoint = maxRewardPoint
    ? portfolioFrontier.frontier
        .filter((point) => point.totalRewards >= maxRewardPoint.totalRewards * efficiencyThreshold)
        .sort(
          (left, right) =>
            left.cardCount - right.cardCount || left.annualFee - right.annualFee || right.totalRewards - left.totalRewards
        )[0] ?? maxRewardPoint
    : null;

  const chartPoints = [
    ...portfolioFrontier.points
      .filter((point) => !point.onParetoFrontier)
      .sort((left, right) => right.totalRewards - left.totalRewards || left.annualFee - right.annualFee)
      .slice(0, 220),
    ...portfolioFrontier.frontier,
  ];
  const frontierPreview = portfolioFrontier.frontier.slice(0, 6);
  const feeRange = Math.max(1, portfolioFrontier.maxAnnualFee - portfolioFrontier.minAnnualFee);
  const rewardsRange = Math.max(1, portfolioFrontier.maxRewardsValue);

  let paretoInsight: string | null = null;
  if (maxRewardPoint && efficientPoint) {
    const rewardsPercent =
      maxRewardPoint.totalRewards > 0 ? Math.round((efficientPoint.totalRewards / maxRewardPoint.totalRewards) * 100) : 0;
    const complexityRatio = efficientPoint.cardCount / Math.max(1, maxRewardPoint.cardCount);
    const complexityText =
      complexityRatio <= 0.5
        ? "with half the complexity"
        : complexityRatio < 1
          ? `with ${Math.round((1 - complexityRatio) * 100)}% less complexity`
          : "with the same complexity";
    paretoInsight = `${efficientPoint.cardCount}-card setup gets ${rewardsPercent}% of max rewards ${complexityText}.`;
  }

  const metrics = [
    { label: "Cards in dataset", value: String(cards.length) },
    { label: "Issuers", value: String(issuerCount) },
    ...(hasUserData && profileMeta
      ? [
          {
            label: "Your uploaded spend",
            value: `${
              profileMeta.daysOfData < 31
                ? `${profileMeta.daysOfData} days`
                : `${profileMeta.monthsOfData.toFixed(1)} mo`
            } · ~$${Math.round(profileMeta.totalSpend).toLocaleString()}`,
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

  const topSubscriptionActions = insights.subscriptionOpportunities.slice(0, 4);
  const rewardLeakBreakdown = [
    {
      key: "wrong-card",
      label: "wrong card",
      points: insights.rewardLeakScore.wrongCardPoints,
      leak: insights.rewardLeakScore.wrongCardLeak,
    },
    {
      key: "missed-categories",
      label: "missed categories",
      points: insights.rewardLeakScore.missedCategoryPoints,
      leak: insights.rewardLeakScore.missedCategoryLeak,
    },
    {
      key: "annual-fee",
      label: "annual fee mismatch",
      points: insights.rewardLeakScore.annualFeeMismatchPoints,
      leak: insights.rewardLeakScore.annualFeeMismatchLeak,
    },
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

      {spendingTrends?.monthly?.length ? (
        <SpendingTrendsChart trends={spendingTrends} />
      ) : null}

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
                <CardVisual name={card.cardName} />
                <div className="card-head">
                  <h3>{card.cardName}</h3>
                  <span className="score">{formatDollars(netValue)}/yr</span>
                </div>
                <p className="muted">
                  {card.issuer} · {card.annualFeeText ?? "Unknown"}
                </p>
                <ul className="compact-list">
                  {categories.slice(0, 5).map((c) => (
                    <li key={c.category}>
                      {CATEGORY_LABELS[c.category]}: {c.rateText} → {formatDollars(c.rewardValue)}
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

      {portfolioFrontier.points.length > 0 && (
        <article className="panel pareto-panel">
          <h2 style={{ marginTop: 0 }}>Card Portfolio Optimizer</h2>
          <p className="muted" style={{ marginBottom: "0.5rem" }}>
            Pareto frontier of card combinations. X axis is annual fee, Y axis is projected rewards value.
          </p>
          {paretoInsight ? <p className="pareto-insight">{paretoInsight}</p> : null}

          <div className="pareto-layout">
            <div>
              <div className="pareto-chart-shell">
                <div className="pareto-y-scale">
                  <span>{formatDollars(portfolioFrontier.maxRewardsValue)}</span>
                  <span>$0</span>
                </div>
                <div className="pareto-chart">
                  {chartPoints.map((point) => {
                    const x =
                      portfolioFrontier.maxAnnualFee === portfolioFrontier.minAnnualFee
                        ? 50
                        : ((point.annualFee - portfolioFrontier.minAnnualFee) / feeRange) * 100;
                    const y = portfolioFrontier.maxRewardsValue <= 0 ? 50 : 100 - (point.totalRewards / rewardsRange) * 100;

                    const className = [
                      "pareto-point",
                      point.onParetoFrontier ? "frontier" : "",
                      efficientPoint?.id === point.id ? "efficient" : "",
                      maxRewardPoint?.id === point.id ? "max" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <span
                        key={point.id}
                        className={className}
                        style={{ left: `${x}%`, top: `${y}%` }}
                        title={`${point.cardCount} cards · ${formatDollars(point.annualFee)} fee · ${formatDollars(point.totalRewards)} rewards · ${point.cardNames.join(", ")}`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="pareto-x-scale">
                <span>{formatDollars(portfolioFrontier.minAnnualFee)}</span>
                <span>{formatDollars(portfolioFrontier.maxAnnualFee)}</span>
              </div>
              <p className="pareto-axis-label">Annual fee</p>

              <div className="pareto-legend">
                <span>
                  <i className="dot frontier-dot" />Pareto frontier
                </span>
                <span>
                  <i className="dot efficient-dot" />Efficient setup
                </span>
                <span>
                  <i className="dot max-dot" />Max rewards
                </span>
              </div>
            </div>

            <div className="pareto-summary">
              <p className="muted">
                Simulated <strong>{portfolioFrontier.points.length.toLocaleString()}</strong> unique card combos from{" "}
                <strong>{portfolioFrontier.candidateCardPoolSize}</strong> candidate cards (up to{" "}
                <strong>{portfolioFrontier.maxCardsPerCombo}</strong> cards per setup).
              </p>
              <div className="pareto-frontier-list">
                {frontierPreview.map((point) => (
                  <div className="pareto-frontier-item" key={`frontier-${point.id}`}>
                    <div>
                      <strong>{point.cardCount} cards</strong> · {point.cardNames.join(" + ")}
                    </div>
                    <div className="muted">
                      {formatDollars(point.totalRewards)} rewards · {formatDollars(point.annualFee)} fee
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      )}

      <div className="insights-grid">
        <article className="panel insight-panel">
          <h2 style={{ marginTop: 0 }}>Subscription Waste + Reward Inefficiency</h2>
          <p className="muted" style={{ marginBottom: "0.75rem" }}>
            Recurring charges that look monthly and likely under-optimized at a baseline 1x earn rate.
          </p>
          {topSubscriptionActions.length > 0 ? (
            <ul className="subscription-actions">
              {topSubscriptionActions.map((opportunity) => (
                <li key={`${opportunity.merchant}-${opportunity.category}`}>
                  <span>
                    <strong>{opportunity.merchant}</strong> is likely on a 1x card. Switching to{" "}
                    <strong>{opportunity.recommendedCardName ?? "your best bonus card"}</strong> can add{" "}
                    <strong>+{formatDollars(opportunity.incrementalRewards)}/year</strong>.
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No strong recurring-subscription patterns detected yet. Upload more monthly statements.</p>
          )}
        </article>

        <article className="panel insight-panel">
          <h2 style={{ marginTop: 0 }}>Spending Personality Profile</h2>
          <p className="personality-title">{insights.personality.title}</p>
          <p className="muted" style={{ marginBottom: "0.75rem" }}>
            {insights.personality.summary}
          </p>
          {insights.personality.traits.length > 0 ? (
            <div className="trait-chip-row">
              {insights.personality.traits.map((trait) => (
                <span className="trait-chip" key={trait}>
                  {trait}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">Collect a few more months to unlock richer personality traits.</p>
          )}
          {insights.personality.monthlyVolatility != null ? (
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              Monthly spend volatility: <strong>{Math.round(insights.personality.monthlyVolatility * 100)}%</strong>
            </p>
          ) : null}
        </article>
      </div>

      <div className="insights-grid">
        <article className="panel insight-panel reward-leak-panel">
          <h2 style={{ marginTop: 0 }}>Reward Leak Score</h2>
          <div className="reward-leak-score">
            <span className="reward-leak-score-value">{insights.rewardLeakScore.score}</span>
            <span className="reward-leak-score-max">/ 100</span>
          </div>
          <p className="muted" style={{ marginBottom: "0.75rem" }}>
            Reward efficiency estimated from your spend mix and category-to-card optimization gaps.
          </p>
          <div className="reward-leak-list">
            {rewardLeakBreakdown.map((item) => (
              <div className="reward-leak-item" key={item.key}>
                <span className="reward-leak-label">{item.label}</span>
                <span className="reward-leak-points">-{item.points} pts</span>
                <span className="reward-leak-value">{formatDollars(item.leak)} leak</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel insight-panel">
          <h2 style={{ marginTop: 0 }}>Predictive Card Recommendation</h2>
          {insights.predictiveRecommendation ? (
            <>
              <p className="muted" style={{ marginBottom: "0.6rem" }}>
                Based on your trend history, <strong>{CATEGORY_LABELS[insights.predictiveRecommendation.category]}</strong> spend is rising{" "}
                <strong>{Math.round(insights.predictiveRecommendation.growthPercent)}%</strong>.
              </p>
              <p className="predictive-callout">
                {insights.predictiveRecommendation.cardName} ({insights.predictiveRecommendation.issuer}) turns ROI positive in{" "}
                <strong>{insights.predictiveRecommendation.monthsToPositive} months</strong>.
              </p>
              <p className="muted" style={{ marginTop: "0.7rem" }}>
                Forecast spend: {formatDollars(insights.predictiveRecommendation.predictedAnnualSpend)}/yr in{" "}
                {CATEGORY_LABELS[insights.predictiveRecommendation.category]} · Estimated net lift:{" "}
                <strong>{formatDollars(insights.predictiveRecommendation.netAnnualLift)}/yr</strong>.
              </p>
            </>
          ) : (
            <p className="muted">
              Not enough trend signal yet. Upload at least 4 months of statements to enable category growth forecasts.
            </p>
          )}
        </article>
      </div>

      {topCards.length === 0 ? (
        <article className="panel">
          <p className="muted">
            No clean card records available yet. Run `rewards:collect` and `rewards:sync`, then refresh this page.
          </p>
        </article>
      ) : null}

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
