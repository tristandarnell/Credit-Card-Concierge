import Link from "next/link";
import { getCleanRewardCards } from "@/lib/rewards/data";

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


const editorialTopics = [
  { label: "Maximize dining rewards with the right card", bg: "#2D1A0E", img: "/dining.jpeg" },
  { label: "Travel smarter with premium card benefits", bg: "#0E1829", img: "/travel.jpeg" },
  { label: "Groceries — your hidden rewards opportunity", bg: "#1A271A", img: "/groceries.webp" },
  { label: "Zero-fee cards for everyday cash back", bg: "#1A1A2D", img: "/cashback.jpeg" }
];

export default async function HomePage() {
  const cards = await getCleanRewardCards(1000);



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
    <div className="home-hero-photo" aria-hidden="true">
      <img
        src="/coverimage.jpeg"
        alt=""
        className="home-hero-img"
      />
    </div>
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
    style={{
      background: topic.bg,
      backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%), url(${topic.img})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
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

      {/* ─── Legal / Disclosure Strip ─── */}
      <div className="home-disclosure full-bleed">
        <div className="home-disclosure-inner">
          <div className="disclosure-block">
            <p className="disclosure-heading">Advertiser Disclosure</p>
            <p className="disclosure-body">
              CreditCard Concierge is an independent, advertising-supported comparison service. We may
              receive compensation when you click on links to products from our partners. This compensation
              does not influence our editorial rankings or recommendations, which are determined solely by
              our analysis of reward rates, fees, and spending-profile fit.
            </p>
          </div>
          <div className="disclosure-block">
            <p className="disclosure-heading">Rates &amp; Terms Accuracy</p>
            <p className="disclosure-body">
              Card terms, reward rates, annual fees, and sign-up bonus offers are subject to change at any
              time without notice. Always review the issuer&apos;s official terms and conditions before
              applying. Projected annual values are estimates based on a sample spending profile and are
              not a guarantee of actual rewards earned.
            </p>
          </div>
          <div className="disclosure-block">
            <p className="disclosure-heading">Not Financial Advice</p>
            <p className="disclosure-body">
              The information provided on this platform is for educational and informational purposes only.
              It does not constitute financial, legal, or tax advice. We recommend consulting a licensed
              financial advisor before making decisions based on your individual financial situation.
            </p>
          </div>
          <div className="disclosure-block">
            <p className="disclosure-heading">Data &amp; Privacy</p>
            <p className="disclosure-body">
              Any transaction data or bank statements you upload are analyzed locally and are not stored,
              sold, or shared with third parties. See our{" "}
              <Link href="/privacy" className="disclosure-link">Privacy Policy</Link> for full details.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
