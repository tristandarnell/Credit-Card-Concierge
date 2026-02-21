import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";

const starterChecklist = [
  "Pay every statement in full and on time before attempting any signup-bonus strategy.",
  "Pause churning if you are preparing for a mortgage or other major loan in the next 12 months.",
  "Choose 1-2 cards with bonuses you can earn through normal spending.",
  "Track application date, bonus deadline, annual fee date, and downgrade/cancel window."
];

const processSteps = [
  {
    title: "1) Choose the right offer",
    detail:
      "Compare elevated public offers, bank pre-approvals, and transfer-partner value before you apply."
  },
  {
    title: "2) Confirm eligibility",
    detail:
      "Check issuer limits and anti-churning rules first. Rules vary by bank and can change frequently."
  },
  {
    title: "3) Plan minimum spend",
    detail:
      "Map organic expenses to your bonus window so you do not overspend or miss the target."
  },
  {
    title: "4) Execute and monitor",
    detail:
      "Set autopay immediately, verify bonus posting, and schedule a review before annual fee renewal."
  }
];

const issuerNotes = [
  "Chase: 5/24 is a common gating rule used by churners. Prioritize Chase strategy earlier if relevant.",
  "Amex: welcome-bonus and velocity language can restrict repeat eligibility.",
  "Citi/Barclays/US Bank/BoA/Capital One/Discover: each has separate approval and bonus-repeat behavior.",
  "All issuers: account shutdown risk increases with aggressive behavior, unusual spend patterns, or policy abuse."
];

const riskControls = [
  "Never carry a balance to earn points.",
  "Avoid manufactured spend unless you fully understand issuer policy and tax/legal implications.",
  "Keep clean records in case an issuer asks for documentation.",
  "Start slow and scale only after your process is reliable."
];

const resources = [
  { label: "r/churning Wiki Index", href: "https://www.reddit.com/r/churning/wiki/index/", description: "The most comprehensive community guide to card churning strategy" },
  { label: "Anti-Churning Rules by Issuer", href: "https://www.reddit.com/r/churning/wiki/index/#wiki_anti-churning_rules", description: "Chase 5/24, Amex once-per-lifetime, and other issuer-specific limits" },
  { label: "Acronyms & Glossary", href: "https://www.reddit.com/r/churning/wiki/glossary", description: "SUB, MSR, MDD, PC — defined with context" },
  { label: "The Points Guy Card Comparisons", href: "https://thepointsguy.com/credit-cards/", description: "Valuations, reviews, and side-by-side comparisons of top rewards cards" },
  { label: "NerdWallet Credit Card Finder", href: "https://www.nerdwallet.com/credit-cards", description: "Unbiased card comparisons with editorial ratings" },
  { label: "Card Recommendation Flowchart", href: "https://m16p-churning.s3.us-east-2.amazonaws.com/Card+Recommendation+Flowchart+Latest.html", description: "Community decision tree for sequencing card applications" }
];

export default function GuidePage() {
  return (
    <section className="section section-tight">
      <SectionHeading
        title="Credit Card Churning Guide"
        subtitle="A practical starter guide based on the r/churning wiki structure, adapted for clear execution and risk control."
      />

      <article className="guide-intro panel">
        <p>
          Churning means earning credit-card signup bonuses and category rewards in a controlled way. Done well, it is
          a disciplined process. Done poorly, it can damage credit, trigger fees, or lead to issuer shutdowns.
        </p>
        <p>
          If your priority is stable finances and predictable approvals, use a conservative pace and follow strict
          tracking.
        </p>
      </article>

      <div className="card-grid two">
        <article className="card">
          <h3>Beginner Checklist</h3>
          <ul className="compact-list">
            {starterChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h3>Risk Controls</h3>
          <ul className="compact-list">
            {riskControls.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <section className="section guide-section">
        <SectionHeading title="Execution Framework" subtitle="Use this order for every new card application cycle." />
        <div className="card-grid two">
          {processSteps.map((step) => (
            <article className="card" key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section guide-section">
        <SectionHeading title="Issuer Rule Awareness" subtitle="Treat bank rules as hard constraints, not suggestions." />
        <article className="card">
          <ul className="compact-list">
            {issuerNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="section guide-section">
        <SectionHeading title="Quick 90-Day Plan" subtitle="A conservative pace for first-time churners." />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Window</th>
                <th>Focus</th>
                <th>Output</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Days 1-7</td>
                <td>Pick one target card and verify eligibility rules</td>
                <td>Single approved application with tracking sheet created</td>
              </tr>
              <tr>
                <td>Days 8-45</td>
                <td>Complete minimum spend with normal expenses</td>
                <td>Progress checkpoint at 50% and 80% of spend goal</td>
              </tr>
              <tr>
                <td>Days 46-75</td>
                <td>Confirm bonus posted and evaluate next issuer</td>
                <td>Decision memo: continue, pause, or optimize setup</td>
              </tr>
              <tr>
                <td>Days 76-90</td>
                <td>Review card portfolio and renewal calendar</td>
                <td>Downgrade/cancel watchlist and next-quarter plan</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section guide-section">
        <SectionHeading title="Primary Resources" subtitle="Use these for current rules, definitions, and strategy updates." />
        <div className="resource-list">
          {resources.map((resource) => (
            <a key={resource.href} href={resource.href} target="_blank" rel="noreferrer noopener" className="resource-item">
              <div>
                <span style={{ display: "block", fontWeight: 700 }}>{resource.label}</span>
                <span style={{ display: "block", fontSize: "0.83rem", fontWeight: 400, color: "var(--text-muted)", marginTop: "0.15rem" }}>{resource.description}</span>
              </div>
              <span className="resource-arrow">Open &rarr;</span>
            </a>
          ))}
        </div>
      </section>

      <section className="cta-block">
        <h2>Put this guide into workflow.</h2>
        <p>Upload statements, get ranked card recommendations, and then optimize each purchase in your dashboard.</p>
        <div className="hero-actions">
          <Link href="/upload" className="btn btn-primary">
            Upload Statements
          </Link>
          <Link href="/optimizer" className="btn btn-secondary">
            Open Purchase Optimizer
          </Link>
        </div>
      </section>
    </section>
  );
}
