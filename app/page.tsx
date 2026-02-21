import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { getCleanRewardCards } from "@/lib/rewards/data";

const steps = [
  {
    title: "Connect spending data",
    description:
      "Upload statements from major banks. We normalize categories and detect recurring spend patterns automatically."
  },
  {
    title: "Get ranked card strategy",
    description:
      "See cards ranked by expected annual value, fee impact, and category fit based on your actual transactions."
  },
  {
    title: "Optimize each purchase",
    description:
      "At checkout, see the best card to use and why, with autofill-ready suggestions for faster decision making."
  }
];

const features = [
  "Bank-grade encryption for uploaded statements",
  "Transparent scoring model with clear recommendation reasons",
  "Live purchase-level optimization, not just annual card rankings",
  "Portfolio view for multi-card households"
];

export default async function HomePage() {
  const cards = await getCleanRewardCards(1000);
  const issuerCount = new Set(cards.map((card) => card.issuer)).size;
  const highConfidenceCount = cards.filter((card) => card.confidenceScore >= 0.7).length;

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Credit Strategy Platform</p>
          <h1>Turn raw statements into a smart card strategy.</h1>
          <p className="hero-copy">
            CreditCard Concierge analyzes your real purchase behavior and tells you exactly which cards to keep, add,
            and use at checkout to maximize value.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/upload">
              Upload Statements
            </Link>
            <Link className="btn btn-secondary" href="/recommendations">
              View Sample Recommendations
            </Link>
          </div>
        </div>
        <aside className="hero-panel">
          <h2>Current dataset snapshot</h2>
          <ul>
            <li>
              <span>{cards.length}</span> clean card records
            </li>
            <li>
              <span>{issuerCount}</span> issuers represented
            </li>
            <li>
              <span>{highConfidenceCount}</span> high-confidence cards
            </li>
          </ul>
        </aside>
      </section>

      <section className="section">
        <SectionHeading
          title="How it works"
          subtitle="Designed for people who want precision, not generic credit card listicles."
        />
        <div className="card-grid three">
          {steps.map((step) => (
            <article className="card" key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeading title="Built for trust" subtitle="Security and explainability are part of the product, not an afterthought." />
        <div className="card-grid two">
          {features.map((feature) => (
            <article className="card" key={feature}>
              <p>{feature}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-block">
        <h2>Start with one statement and see immediate value.</h2>
        <p>Upload a PDF or CSV, review your recommendations, and test per-purchase optimization in minutes.</p>
        <Link className="btn btn-primary" href="/upload">
          Start Now
        </Link>
      </section>
    </>
  );
}
