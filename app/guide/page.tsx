import Link from "next/link";

const processSteps = [
  {
    num: "01",
    title: "Choose the right offer",
    detail: "Compare elevated public offers, bank pre-approvals, and transfer-partner value before you apply.",
  },
  {
    num: "02",
    title: "Confirm eligibility",
    detail: "Check issuer limits and anti-churning rules first. Rules vary by bank and can change frequently.",
  },
  {
    num: "03",
    title: "Plan minimum spend",
    detail: "Map organic expenses to your bonus window so you do not overspend or miss the target.",
  },
  {
    num: "04",
    title: "Execute and monitor",
    detail: "Set autopay immediately, verify bonus posting, and schedule a review before annual fee renewal.",
  },
];

const issuerNotes = [
  { issuer: "Chase", rule: "5/24 gates most approvals. Prioritize Chase applications early in your strategy." },
  { issuer: "Amex", rule: "Welcome-bonus language can restrict repeat eligibility — read terms carefully." },
  { issuer: "Citi / Barclays / US Bank / BoA / Capital One", rule: "Each has distinct approval and bonus-repeat behavior. Research individually." },
  { issuer: "All issuers", rule: "Shutdown risk increases with aggressive behavior, unusual spend patterns, or policy abuse." },
];

const resources = [
  { label: "r/churning Wiki Index", href: "https://www.reddit.com/r/churning/wiki/index/", description: "The most comprehensive community guide to card churning strategy" },
  { label: "Anti-Churning Rules by Issuer", href: "https://www.reddit.com/r/churning/wiki/index/#wiki_anti-churning_rules", description: "Chase 5/24, Amex once-per-lifetime, and other issuer-specific limits" },
  { label: "Acronyms & Glossary", href: "https://www.reddit.com/r/churning/wiki/glossary", description: "SUB, MSR, MDD, PC — defined with context" },
  { label: "The Points Guy", href: "https://thepointsguy.com/credit-cards/", description: "Valuations, reviews, and side-by-side comparisons of top rewards cards" },
  { label: "NerdWallet Card Finder", href: "https://www.nerdwallet.com/credit-cards", description: "Unbiased card comparisons with editorial ratings" },
  { label: "Card Recommendation Flowchart", href: "https://m16p-churning.s3.us-east-2.amazonaws.com/Card+Recommendation+Flowchart+Latest.html", description: "Community decision tree for sequencing card applications" },
];

export default function GuidePage() {
  return (
    <div className="guide-page">

      {/* ── Hero ── */}
      <div className="guide-hero">
        <p className="guide-eyebrow">Credit Card Strategy</p>
        <h1 className="guide-title">The Churning Guide</h1>
        <p className="guide-lead">
          A practical introduction to earning signup bonuses and maximizing rewards — with clear rules on risk and pace.
        </p>
      </div>

      {/* ── Intro ── */}
      <div className="guide-intro-block">
        <p>
          Churning means earning credit-card signup bonuses and category rewards in a controlled, repeatable way.
          Done well, it&apos;s a disciplined process. Done poorly, it can damage credit, trigger fees, or lead to issuer shutdowns.
        </p>
        <p>
          Start conservative. Track everything. Scale only after your process is reliable.
        </p>
      </div>

      {/* ── Two-col checklist ── */}
      <div className="guide-two-col">
        <div className="guide-checklist-block">
          <h2 className="guide-section-title">Beginner Checklist</h2>
          <ul className="guide-list">
            <li>Pay every statement in full and on time before attempting any signup-bonus strategy.</li>
            <li>Pause churning if you are preparing for a mortgage or major loan in the next 12 months.</li>
            <li>Choose 1–2 cards with bonuses you can earn through normal spending.</li>
            <li>Track application date, bonus deadline, annual fee date, and downgrade/cancel window.</li>
          </ul>
        </div>
        <div className="guide-checklist-block">
          <h2 className="guide-section-title">Risk Controls</h2>
          <ul className="guide-list">
            <li>Never carry a balance to earn points.</li>
            <li>Avoid manufactured spend unless you fully understand issuer policy and tax implications.</li>
            <li>Keep clean records in case an issuer requests documentation.</li>
            <li>Start slow and scale only after your process is reliable.</li>
          </ul>
        </div>
      </div>

      {/* ── Execution steps ── */}
      <div className="guide-section">
        <h2 className="guide-section-title">Execution Framework</h2>
        <p className="guide-section-sub">Use this order for every new card application cycle.</p>
        <div className="guide-steps">
          {processSteps.map((step) => (
            <div className="guide-step" key={step.num}>
              <span className="guide-step-num">{step.num}</span>
              <div>
                <h3 className="guide-step-title">{step.title}</h3>
                <p className="guide-step-detail">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 90-day plan ── */}
      <div className="guide-section">
        <h2 className="guide-section-title">Quick 90-Day Plan</h2>
        <p className="guide-section-sub">A conservative pace for first-time churners.</p>
        <div className="guide-table-wrap">
          <table className="guide-table">
            <thead>
              <tr>
                <th>Window</th>
                <th>Focus</th>
                <th>Output</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Days 1–7</td>
                <td>Pick one target card and verify eligibility rules</td>
                <td>Single approved application with tracking sheet created</td>
              </tr>
              <tr>
                <td>Days 8–45</td>
                <td>Complete minimum spend with normal expenses</td>
                <td>Progress checkpoint at 50% and 80% of spend goal</td>
              </tr>
              <tr>
                <td>Days 46–75</td>
                <td>Confirm bonus posted and evaluate next issuer</td>
                <td>Decision memo: continue, pause, or optimize setup</td>
              </tr>
              <tr>
                <td>Days 76–90</td>
                <td>Review card portfolio and renewal calendar</td>
                <td>Downgrade/cancel watchlist and next-quarter plan</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Issuer rules ── */}
      <div className="guide-section">
        <h2 className="guide-section-title">Issuer Rule Awareness</h2>
        <p className="guide-section-sub">Treat bank rules as hard constraints, not suggestions.</p>
        <div className="guide-issuer-list">
          {issuerNotes.map((item) => (
            <div className="guide-issuer-row" key={item.issuer}>
              <span className="guide-issuer-name">{item.issuer}</span>
              <span className="guide-issuer-rule">{item.rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Resources ── */}
      <div className="guide-section">
        <h2 className="guide-section-title">Primary Resources</h2>
        <p className="guide-section-sub">Use these for current rules, definitions, and strategy updates.</p>
        <div className="guide-resources">
          {resources.map((r) => (
            <a key={r.href} href={r.href} target="_blank" rel="noreferrer noopener" className="guide-resource-row">
              <div>
                <span className="guide-resource-label">{r.label}</span>
                <span className="guide-resource-desc">{r.description}</span>
              </div>
              <span className="guide-resource-arrow">→</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="guide-cta">
        <h2>Put this guide into practice.</h2>
        <p>Upload your statements, get personalized card rankings, and optimize every purchase.</p>
        <div className="guide-cta-actions">
          <Link href="/upload" className="btn btn-primary">Upload Statements</Link>
          <Link href="/optimizer" className="btn btn-secondary">Open Optimizer</Link>
        </div>
      </div>

    </div>
  );
}
