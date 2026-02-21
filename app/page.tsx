import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { spendingAllocation } from "@/lib/mock-data";

const missedOpportunities = [
  { desc: "Groceries on Citi Double Cash instead of Amex Gold (4x)", amount: "-$312/yr" },
  { desc: "Gas spend not routed to Amex Blue Cash Preferred (3%)", amount: "-$98/yr" },
  { desc: "Uncategorized spend missing travel card bonus multiplier", amount: "-$44/yr" },
];

const features = [
  {
    title: "256-bit TLS Encryption",
    description: "Statements processed in memory. No statement data persisted after analysis.",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    )
  },
  {
    title: "Transparent Scoring Model",
    description: "Every recommendation exposes the exact inputs: category overlap, fee efficiency, and redemption rate.",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    )
  },
  {
    title: "Transaction-Level Optimization",
    description: "Card recommendations at individual purchase granularity, not just annual portfolio rankings.",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    )
  },
  {
    title: "Multi-Card Portfolio View",
    description: "Model your full card stack. Surface overlap, redundancy, and annual fee inefficiency.",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }
];

export default function HomePage() {
  return (
    <>
      {/* Portfolio Summary Bar */}
      <div className="portfolio-bar">
        <div className="portfolio-metric">
          <span className="portfolio-metric-label">Total Rewards Yield</span>
          <span className="portfolio-metric-value positive mono">$1,040<span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)" }}>/yr</span></span>
        </div>
        <div className="portfolio-divider" />
        <div className="portfolio-metric">
          <span className="portfolio-metric-label">Optimization Score</span>
          <span className="portfolio-metric-value mono">74<span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)" }}>/100</span></span>
        </div>
        <div className="portfolio-divider" />
        <div className="portfolio-metric">
          <span className="portfolio-metric-label">Missed Cashback</span>
          <span className="portfolio-metric-value mono" style={{ color: "var(--danger)" }}>$454<span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)" }}>/yr</span></span>
        </div>
        <div className="portfolio-divider" />
        <div className="portfolio-metric">
          <span className="portfolio-metric-label">Cards Analyzed</span>
          <span className="portfolio-metric-value mono">45</span>
        </div>
        <div className="last-updated">
          <span className="last-updated-dot" />
          <span>Last refresh: today · Model v2.1</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2.5rem" }}>
        {/* Optimization Score Panel */}
        <div className="opt-score-panel">
          <div className="opt-score-header">
            <div>
              <div className="opt-score-label">Credit Optimization Score</div>
              <div className="opt-score-value mono">74</div>
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--warning)", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "3px", padding: "0.15rem 0.45rem", fontWeight: 700 }}>
              ROOM TO IMPROVE
            </span>
          </div>
          <div className="opt-score-bar-track">
            <div className="opt-score-bar-fill med" style={{ width: "74%" }} />
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.6rem" }}>
            2 spending categories not optimally routed. Upload a statement to recalculate.
          </p>
        </div>

        {/* Spending Allocation Panel */}
        <div className="panel">
          <SectionHeading title="Reward Allocation by Category" />
          {spendingAllocation.map((row) => (
            <div className="allocation-row" key={row.category}>
              <span className="allocation-label">{row.category}</span>
              <div className="allocation-bar-track">
                <div className="allocation-bar-fill" style={{ width: `${row.pct * 3}%`, background: row.optimized ? "var(--success)" : "var(--danger)" }} />
              </div>
              <span className="allocation-value mono">{row.pct}%</span>
              {!row.optimized && (
                <span style={{ fontSize: "0.65rem", color: "var(--danger)", fontWeight: 700, marginLeft: "0.25rem", whiteSpace: "nowrap" }}>SUB-OPT</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Missed Cashback */}
      <section className="section">
        <SectionHeading title="Optimization Opportunities Identified" subtitle="Suboptimal card routing detected in your spending patterns" />
        <div className="panel">
          {missedOpportunities.map((item) => (
            <div className="opportunity-item" key={item.desc}>
              <div className="opportunity-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <span className="opportunity-desc">{item.desc}</span>
              <span className="opportunity-amount mono">{item.amount}</span>
            </div>
          ))}
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
            <Link href="/recommendations" className="btn btn-primary" style={{ fontSize: "0.82rem" }}>
              View Recommended Allocation Actions
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <SectionHeading title="Platform Capabilities" subtitle="Production-grade analysis from your actual transaction history" />
        <div className="feature-grid">
          {features.map((feature) => (
            <div className="feature-card" key={feature.title}>
              <div className="feature-icon">{feature.icon}</div>
              <div>
                <h4>{feature.title}</h4>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-block">
        <h2>Begin Spending Analysis</h2>
        <p>Upload a PDF or CSV bank statement to generate a personalized card allocation strategy based on your actual transaction history.</p>
        <div className="hero-actions">
          <Link className="btn btn-primary" href="/upload">
            Upload Statement
          </Link>
          <Link className="btn btn-secondary" href="/recommendations">
            View Sample Analysis
          </Link>
        </div>
      </section>
    </>
  );
}
