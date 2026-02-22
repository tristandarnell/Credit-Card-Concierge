import Link from "next/link";

const founders = [
  {
    name: "Kambi Kanu",
    role: "Co-Founder",
    bio: "Passionate about making financial optimization accessible to everyone. Kambi leads product strategy and user experience, ensuring CreditCard Concierge delivers genuine value to every user.",
    initials: "KK",
    accent: "#1A3A6B",
  },
  {
    name: "Tristan Darnell",
    role: "Co-Founder",
    bio: "Full-stack engineer and systems thinker. Tristan architected the rewards analysis engine and the data pipeline that powers our personalized card recommendations.",
    initials: "TD",
    accent: "#C8102E",
  },
  {
    name: "Ethan Liu",
    role: "Co-Founder",
    bio: "Data scientist with a focus on behavioral finance. Ethan built the spending categorization models and the fit-score algorithm that matches users to their ideal cards.",
    initials: "EL",
    accent: "#1B2B4B",
  },
  {
    name: "Charles Zheng",
    role: "Co-Founder",
    bio: "Financial analyst and rewards strategist. Charles maintains our card database, monitors issuer rule changes, and ensures our recommendations reflect real-world value.",
    initials: "CZ",
    accent: "#C49A22",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* ─── Page Header ─── */}
      <div className="page-header">
        <p className="eyebrow">Our Story</p>
        <h1>About CreditCard Concierge</h1>
        <p className="page-subtitle">
          Built by four friends who were frustrated that choosing a credit card required a spreadsheet, a Reddit deep-dive, and a finance degree.
        </p>
      </div>

      {/* ─── Mission ─── */}
      <div className="section">
        <div className="panel" style={{ borderLeft: "4px solid #C8102E", background: "#fff" }}>
          <p className="eyebrow" style={{ marginBottom: "0.75rem" }}>Our Mission</p>
          <h2 style={{ marginBottom: "0.75rem", fontSize: "1.4rem", fontWeight: 700 }}>
            Credit card optimization shouldn&apos;t require an expert.
          </h2>
          <p style={{ maxWidth: "72ch", lineHeight: 1.7, fontSize: "0.92rem" }}>
            Most people leave hundreds of dollars in rewards on the table every year — not because they don&apos;t care, but because the information
            is scattered, biased by affiliate incentives, and impossible to personalize. CreditCard Concierge analyzes your actual spending
            behavior and matches you to the card that maximizes your real-world value. No guesswork, no generic lists, no hidden agendas.
          </p>
        </div>
      </div>

      {/* ─── How It Works ─── */}
      <div className="section">
        <div className="section-heading">
          <h2 className="section-title">How It Works</h2>
        </div>
        <div className="card-grid three">
          {[
            {
              step: "01",
              title: "Upload Your Statements",
              desc: "Import PDFs or CSVs from any major bank. Your data is analyzed in memory and never stored or shared.",
            },
            {
              step: "02",
              title: "We Analyze Your Spending",
              desc: "Our engine categorizes every transaction and builds a precise profile of where and how you spend each month.",
            },
            {
              step: "03",
              title: "Get Your Recommendations",
              desc: "We calculate projected annual value for every card in our database and surface your top matches with full transparency.",
            },
          ].map((item) => (
            <div key={item.step} className="card" style={{ padding: "1.5rem" }}>
              <div style={{
                fontFamily: "Georgia, serif",
                fontSize: "2rem",
                fontWeight: 700,
                color: "#dde1ea",
                lineHeight: 1,
                marginBottom: "0.75rem",
                letterSpacing: "-0.02em"
              }}>
                {item.step}
              </div>
              <h3 style={{ marginBottom: "0.5rem", fontWeight: 700 }}>{item.title}</h3>
              <p style={{ fontSize: "0.84rem" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Founders ─── */}
      <div className="section">
        <div className="section-heading">
          <h2 className="section-title">The Team</h2>
          <p>Four builders who wanted better tools for their own finances — and built them.</p>
        </div>
        <div className="card-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          {founders.map((f) => (
            <div key={f.name} className="card" style={{ padding: "1.5rem", borderTop: `3px solid ${f.accent}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.85rem" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: f.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  letterSpacing: "0.05em",
                  flexShrink: 0,
                }}>
                  {f.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f1724" }}>{f.name}</div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a889a" }}>{f.role}</div>
                </div>
              </div>
              <p style={{ fontSize: "0.84rem", lineHeight: 1.65 }}>{f.bio}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Values ─── */}
      <div className="section">
        <div className="section-heading">
          <h2 className="section-title">Our Principles</h2>
        </div>
        <div className="card-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          {[
            { label: "Transparency First", desc: "We show you exactly how every fit score is calculated. No black boxes, no hidden weighting." },
            { label: "Your Data Stays Yours", desc: "Statement data is processed in memory only. We never store, sell, or transmit your financial information." },
            { label: "No Commission Bias", desc: "Our rankings are based on reward math, not affiliate rates. The best card for you wins, period." },
            { label: "Always Current", desc: "Our card database is updated continuously. Bonus offers, fee changes, and new cards are tracked in real time." },
          ].map((v) => (
            <div key={v.label} className="card" style={{ padding: "1.25rem" }}>
              <h4 style={{ marginBottom: "0.4rem", color: "#1B2B4B" }}>{v.label}</h4>
              <p style={{ fontSize: "0.84rem" }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Built With ─── */}
      <div className="section">
        <div className="panel" style={{ background: "#1a2235", border: "none", borderRadius: "6px", padding: "2rem" }}>
          <p style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#9aaac2",
            marginBottom: "0.75rem"
          }}>
            Built With
          </p>
          <p style={{ color: "#c0ccd e", fontSize: "0.88rem", lineHeight: 1.7, maxWidth: "68ch", color: "#8a9ab8" }}>
            CreditCard Concierge was built using Next.js, Supabase, and TypeScript. Our rewards analysis engine
            was developed with assistance from <strong style={{ color: "#a8c4e0" }}>Claude by Anthropic</strong> — an AI assistant
            that helped us reason through edge cases in rewards logic, draft documentation, and accelerate development.
            We believe in being transparent about the tools that helped us build this product.
          </p>
          <div style={{ marginTop: "1.25rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {["Next.js", "TypeScript", "Supabase", "Claude by Anthropic"].map((tech) => (
              <span key={tech} style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "3px",
                padding: "0.25rem 0.6rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#9aaac2",
              }}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CTA ─── */}
      <div className="cta-block" style={{ textAlign: "center", background: "#f0f2f6" }}>
        <h2 style={{ fontWeight: 700, fontSize: "1.3rem", marginBottom: "0.5rem" }}>Ready to find your best card?</h2>
        <p style={{ marginBottom: "1.25rem" }}>Upload a statement and get personalized recommendations in under 30 seconds.</p>
        <Link href="/upload" className="btn btn-primary" style={{ fontSize: "0.9rem", padding: "0.65rem 1.5rem" }}>
          Get Started
        </Link>
      </div>
    </>
  );
}