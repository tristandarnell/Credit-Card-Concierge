import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-inner">
          <div>
            <p className="footer-brand">Concierge</p>
            <p className="footer-note">
              Purpose-built credit card recommendations from your real spending data.
              Not affiliated with any bank or card issuer.
            </p>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <nav className="footer-links" aria-label="Footer platform links">
              <Link href="/">Home</Link>
              <Link href="/upload">Upload Statements</Link>
              <Link href="/recommendations">Recommendations</Link>
              <Link href="/optimizer">Purchase Optimizer</Link>
              <Link href="/extension">Browser Extension</Link>
              <Link href="/guide">Churning Guide</Link>
            </nav>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>

            <p className="footer-copy" style={{ marginTop: "1rem" }}>&copy; {year} Concierge</p>
          </div>
        </div>
        <p className="footer-disclaimer">
          Affiliate disclosure: We may earn commissions when you apply for cards through our recommendations.
          Card rankings are based solely on your spending data analysis, not commission rates.
          Concierge is not a bank, lender, or licensed financial advisor.
          All reward projections are estimates and may differ from actual earned rewards.
        </p>
      </div>
    </footer>
  );
}
