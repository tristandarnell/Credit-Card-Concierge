export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-inner">
          <div>
            <p className="footer-brand">CreditCard Concierge</p>
            <p className="footer-note">
              Purpose-built credit card recommendations from your real spending data.
              Not affiliated with any bank or card issuer.
            </p>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <nav className="footer-links" aria-label="Footer platform links">
              <a href="/">Home</a>
              <a href="/upload">Upload Statements</a>
              <a href="/recommendations">Recommendations</a>
              <a href="/optimizer">Purchase Optimizer</a>
              <a href="/guide">Churning Guide</a>
            </nav>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <nav className="footer-links" aria-label="Footer legal links">
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
            </nav>
            <p className="footer-copy" style={{ marginTop: "1rem" }}>&copy; {year} CreditCard Concierge</p>
          </div>
        </div>
        <p className="footer-disclaimer">
          Affiliate disclosure: We may earn commissions when you apply for cards through our recommendations.
          Card rankings are based solely on your spending data analysis, not commission rates.
          CreditCard Concierge is not a bank, lender, or licensed financial advisor.
          All reward projections are estimates and may differ from actual earned rewards.
        </p>
      </div>
    </footer>
  );
}
