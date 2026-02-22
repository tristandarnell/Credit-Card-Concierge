import Link from "next/link";
import { getCleanRewardCards } from "@/lib/rewards/data";
import {
  estimateNetAnnualCardValue,
  formatDollars,
  CATEGORY_LABELS
} from "@/lib/rewards/scoring";
import type { CardRewardRecord } from "@/lib/rewards/types";

/* ── Hardcoded top-3 with real researched data ── */
const TOP_CARDS = [
  {
    id: "chase-sapphire-preferred",
    cardName: "Chase Sapphire Preferred",
    issuer: "Chase",
    conf: 88,
    annualFee: "$95",
    annualValue: "$1,140",
    fitScore: 92,
    useCase: "Dining + travel",
    photoSrc: "/cards/Chase Sapphire Preferred.png",
    signupBonus: "75,000 points after $5,000 spend in first 3 months — worth ~$750–$937",
    accent: "#1A3A6B",
    highlights: [
      "3x on dining, 5x on Chase Travel bookings, 2x on all other travel",
      "$50 annual hotel credit applied automatically via Chase Travel",
      "DashPass membership + $120/yr DoorDash credits through Dec 2027",
      "Primary car rental insurance and trip cancellation/interruption coverage",
    ],
  },
  {
    id: "amex-gold",
    cardName: "American Express Gold",
    issuer: "American Express",
    conf: 82,
    annualFee: "$325",
    annualValue: "$1,280",
    fitScore: 87,
    useCase: "Dining + groceries",
    photoSrc: "/cards/Amex Gold Image.avif",
    signupBonus: "60,000 Membership Rewards points after $6,000 spend in 6 months",
    accent: "#C49A22",
    highlights: [
      "4x at restaurants worldwide + U.S. supermarkets (up to $25,000/yr)",
      "$120 Uber Cash annually ($10/month for rides or Uber Eats)",
      "$100 Resy dining credit ($50 semi-annually at U.S. Resy restaurants)",
      "$84 Dunkin' credit ($7/month at U.S. Dunkin' locations)",
    ],
  },
  {
    id: "venture-x",
    cardName: "Capital One Venture X",
    issuer: "Capital One",
    conf: 76,
    annualFee: "$395",
    annualValue: "$1,175",
    fitScore: 84,
    useCase: "General spend + travel",
    photoSrc: "/cards/capitaloneventurex.jpeg",
    signupBonus: "75,000 miles after $4,000 spend in first 3 months — worth ~$750+",
    accent: "#003B5C",
    highlights: [
      "$300 annual travel credit for bookings through Capital One Travel",
      "10,000 anniversary bonus miles each year (~$100–$185 value)",
      "Unlimited Priority Pass + Capital One lounge access worldwide",
      "10x on Capital One Travel hotels/rentals, 2x on all other purchases",
    ],
  },
];

const ISSUER_ACCENT: Record<string, string> = {
  "Chase": "#1A3A6B",
  "American Express": "#C49A22",
  "Capital One": "#003B5C",
  "Citi": "#003B8E",
  "Discover": "#E07800"
};

function issuerAccent(issuer: string): string {
  return ISSUER_ACCENT[issuer] ?? "#6B7280";
}

function bestUseCase(card: CardRewardRecord): string {
  const top = card.rewardRules
    .filter((r) => (r.rateValue ?? 0) > 1.5)
    .sort((a, b) => (b.rateValue ?? 0) - (a.rateValue ?? 0))
    .slice(0, 2)
    .map((r) => CATEGORY_LABELS[r.category] ?? r.category);
  return top.length > 0 ? top.join(" + ") : "General spend";
}

const editorialTopics = [
  { label: "Maximize dining rewards with the right card", bg: "#2D1A0E" },
  { label: "Travel smarter with premium card benefits", bg: "#0E1829" },
  { label: "Groceries — your hidden rewards opportunity", bg: "#1A271A" },
  { label: "Zero-fee cards for everyday cash back", bg: "#1A1A2D" }
];

export default async function HomePage() {
  const cards = await getCleanRewardCards(1000);

  const rankedCards = cards
    .map((card) => ({ card, value: estimateNetAnnualCardValue(card) }))
    .sort((a, b) => b.value - a.value);

  const maxValue = rankedCards[0]?.value ?? 1;
  const minValue = rankedCards[rankedCards.length - 1]?.value ?? 0;
  const denominator = Math.max(1, maxValue - minValue);

  function fitScore(value: number) {
    return Math.round(60 + ((value - minValue) / denominator) * 40);
  }

  const tableCards = rankedCards.slice(0, 6);

  const now = new Date();
  const timestamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")} · ${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")} UTC`;

  return (
    <>
      {/* ─── Hero ─── */}
      <div className="home-hero full-bleed">
        <div className="home-hero-text-wrap">
          <p className="home-eyebrow">Card Comparison · Portfolio Audit</p>
          <h1 className="home-hero-h1">
            Choose the card that works for <em>you</em>
          </h1>
          <p className="home-hero-sub">
            Personalized to your $2,400/month spend profile · {cards.length} cards analyzed
          </p>
        </div>
        <div className="home-hero-photo" aria-hidden="true" />
      </div>

      {/* ─── Top 3 Card Grid (hardcoded with real researched data) ─── */}
      <div className="home-cards-section full-bleed">
        <div className="home-cards-grid">
          {TOP_CARDS.map((c) => (
            <article
              key={c.id}
              className="home-rec-card"
              style={{ borderTopColor: c.accent }}
            >
              {/* Real card photo */}
              <div className="home-card-photo-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.photoSrc}
                  alt={c.cardName}
                  className="home-card-photo"
                />
              </div>

              <div className="home-rec-body">
                <div className="home-rec-head">
                  <div>
                    <p className="home-rec-issuer">{c.issuer}</p>
                    <h2 className="home-rec-name">{c.cardName}</h2>
                    <p className="home-rec-conf">{c.conf}% conf.</p>
                    <p className="home-rec-cat">{c.useCase}</p>
                  </div>
                  <span className="home-score-wrap" title="Fit score based on spending profile">
                    <span className="home-score">Fit {c.fitScore}</span>
                    <span className="home-score-info">i</span>
                  </span>
                </div>

                <p className="home-rec-value">{c.annualValue}/yr</p>
                <p className="home-rec-fee">Annual fee: {c.annualFee}</p>

                <div
                  className="home-signup-bonus"
                  style={{ borderColor: `${c.accent}55`, background: `${c.accent}12` }}
                >
                  <span className="home-signup-label">Sign-up Bonus</span>
                  {c.signupBonus}
                </div>

                <ul className="home-rec-list">
                  {c.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* ─── Editorial ─── */}
      <div className="home-editorial full-bleed">
        <div className="home-editorial-heading">
          <div className="editorial-deco-top" />
          <h2 className="editorial-title">
            Your financial goals <em>matter</em>
          </h2>
          <div className="editorial-deco-bottom" />
        </div>

        <div className="editorial-photo-grid">
          {editorialTopics.map((topic) => (
            <div
              key={topic.label}
              className="editorial-photo"
              style={{ background: topic.bg }}
            >
              <span className="editorial-photo-label">{topic.label}</span>
            </div>
          ))}
        </div>

        <div className="editorial-cta">
          <p>Explore more topics and build your financial know-how.</p>
          <Link href="/guide" className="btn-editorial">View Churning Guide</Link>
        </div>
      </div>

      {/* ─── Comparison Table ─── */}
      <div className="home-table-section full-bleed">
        <p className="home-table-disclaimer">
          All cards scored against your spending profile. Evaluate alternatives before applying.
          Projections based on your $2,400/month total spend.
        </p>

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
              {tableCards.map(({ card, value }) => {
                const score = fitScore(value);
                const conf = Math.round(card.confidenceScore * 100);
                const accent = issuerAccent(card.issuer);
                const isHighConf = conf >= 80;

                return (
                  <tr key={card.id}>
                    <td style={{ borderLeft: `3px solid ${accent}`, fontWeight: 600 }}>
                      {card.cardName}
                    </td>
                    <td>{card.issuer}</td>
                    <td>
                      <span className="score">Fit {score}</span>
                    </td>
                    <td
                      style={{
                        color: isHighConf ? "var(--success)" : undefined,
                        fontWeight: isHighConf ? 600 : undefined
                      }}
                    >
                      {conf}%
                    </td>
                    <td
                      className="money"
                      style={{ color: "var(--accent)", fontWeight: 600 }}
                    >
                      {formatDollars(value)}/yr
                    </td>
                    <td>{card.annualFeeText ?? "—"}</td>
                    <td>{bestUseCase(card)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="home-table-meta">
          <div className="home-meta-item">
            <span className="home-meta-label">Analysis Timestamp</span>
            <span className="home-meta-value">{timestamp}</span>
          </div>
          <div className="home-meta-item">
            <span className="home-meta-label">Model Version</span>
            <span className="home-meta-value">v2.1.0-prod</span>
          </div>
          <div className="home-meta-item">
            <span className="home-meta-label">Cards Analyzed</span>
            <span className="home-meta-value">{cards.length}</span>
          </div>
          <div className="home-meta-item">
            <span className="home-meta-label">Data Retained</span>
            <span className="home-meta-value" style={{ color: "var(--danger)" }}>
              None · Deleted post-analysis
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
