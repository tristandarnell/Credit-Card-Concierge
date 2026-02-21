import { SectionHeading } from "@/components/section-heading";
import { topCards, comparisonCards } from "@/lib/mock-data";
import { CardVisual } from "@/components/card-visual";

const FIT_SCORE_TOOLTIP =
  "Match score (0–100) derived from: category overlap with your top 5 spend areas (40%), annual fee efficiency relative to projected earnings (35%), average redemption value of the card's reward currency (25%).";

function InfoIcon() {
  return (
    <svg className="info-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function RecommendationsPage() {
  return (
    <section className="section section-tight">
      {/* Concierge Recommendation Panel */}
      <div className="concierge-panel">
        <p className="concierge-eyebrow">Concierge Recommendation &middot; High Confidence</p>
        <p className="concierge-action">Route grocery spend from Citi Double Cash to American Express Gold</p>
        <span className="concierge-gain mono">Expected annual gain: +$312</span>
        <div className="concierge-meta">
          <div className="concierge-meta-item">
            <span className="concierge-meta-label">Current Multiplier</span>
            <span className="concierge-meta-value">2% cash back</span>
          </div>
          <div className="concierge-meta-item">
            <span className="concierge-meta-label">Optimal Multiplier</span>
            <span className="concierge-meta-value">4x MR points</span>
          </div>
          <div className="concierge-meta-item">
            <span className="concierge-meta-label">Monthly Grocery Spend</span>
            <span className="concierge-meta-value mono">$650</span>
          </div>
          <div className="concierge-meta-item">
            <span className="concierge-meta-label">Model Confidence</span>
            <span className="concierge-meta-value">88%</span>
          </div>
        </div>
      </div>

      <SectionHeading
        title="Recommended Allocation"
        subtitle="Cards ranked by projected net value after fees — derived from your actual transaction history, not national averages."
      />

      {/* Metrics row */}
      <div className="metrics-row">
        <div className="metric">
          <p>Estimated Annual Gain</p>
          <h3 className="mono">$1,040</h3>
        </div>
        <div className="metric">
          <p>Cards Analyzed</p>
          <h3 className="mono">45</h3>
        </div>
        <div className="metric">
          <p>Categories Mapped</p>
          <h3 className="mono">14</h3>
        </div>
        <div className="metric">
          <p>Optimization Score</p>
          <h3 className="mono">74/100</h3>
        </div>
      </div>

      {/* Card recommendations */}
      <div className="card-grid three" style={{ marginBottom: "2rem" }}>
        {topCards.map((card) => (
          <div
            className="card rec-card"
            key={card.name}
            style={{ borderLeftColor: card.accentColor }}
          >
            <CardVisual name={card.name} />
            <div className="card-head">
              <div>
                <p className="issuer-label">{card.issuer}</p>
                <h3>{card.name}</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
                <span
                  className="score score-wrap"
                  data-tooltip={FIT_SCORE_TOOLTIP}
                  title={FIT_SCORE_TOOLTIP}
                >
                  Fit {card.fitScore}
                  <InfoIcon />
                </span>
                <span className={`confidence-badge${card.confidence >= 85 ? " high" : ""}`}>
                  {card.confidence}% conf.
                </span>
              </div>
            </div>

            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>{card.bestFor}</p>
            <p className="value mono">{card.projectedValue}</p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Annual fee: {card.annualFee}</p>

            <div className="signup-bonus">
              <span className="signup-bonus-label">Sign-up Bonus</span>
              {card.signUpBonus}
            </div>

            <ul className="compact-list">
              {card.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Full comparison table */}
      <SectionHeading
        title="Full Card Comparison"
        subtitle="All cards scored against your spending profile. Evaluate alternatives before applying."
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Card</th>
              <th>Issuer</th>
              <th>Fit Score</th>
              <th>Confidence</th>
              <th>Projected Value</th>
              <th>Annual Fee</th>
              <th>Best Use Case</th>
            </tr>
          </thead>
          <tbody>
            {comparisonCards.map((card) => (
              <tr key={`${card.name}-row`}>
                <td style={{ fontWeight: 600 }}>
                  <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: card.accentColor, marginRight: "0.45rem", verticalAlign: "middle" }} />
                  {card.name}
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{card.issuer}</td>
                <td><span className="score">{card.fitScore}</span></td>
                <td>
                  <span className={`confidence-badge${card.confidence >= 85 ? " high" : ""}`}>
                    {card.confidence}%
                  </span>
                </td>
                <td className="money" style={{ fontWeight: 600, color: "var(--success)" }}>{card.projectedValue}</td>
                <td>{card.annualFee}</td>
                <td style={{ color: "var(--text-muted)", fontSize: "0.83rem" }}>{card.bestFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit Trail */}
      <div className="audit-trail">
        <div className="audit-item">
          <span className="audit-label">Analysis Timestamp</span>
          <span className="audit-value mono">2026-02-21 &middot; 09:14 UTC</span>
        </div>
        <div className="audit-item">
          <span className="audit-label">Model Version</span>
          <span className="audit-value mono">v2.1.0-prod</span>
        </div>
        <div className="audit-item">
          <span className="audit-label">Transactions Processed</span>
          <span className="audit-value mono">847</span>
        </div>
        <div className="audit-item">
          <span className="audit-label">Data Retained</span>
          <span className="audit-value mono" style={{ color: "var(--success)" }}>None &middot; Deleted post-analysis</span>
        </div>
      </div>

      <p style={{ marginTop: "0.65rem", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
        Projections are model estimates based on your transaction history and published reward rates. Actual values depend on redemption method and issuer terms. We may earn affiliate commissions on approved applications.
      </p>
    </section>
  );
}
