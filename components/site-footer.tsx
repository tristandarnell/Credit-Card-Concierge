export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <p className="footer-brand">CreditCard Concierge</p>
          <p className="footer-note">Purpose-built recommendations from your real spending behavior.</p>
        </div>
        <p className="footer-copy">{year} CreditCard Concierge. Security-first by design.</p>
      </div>
    </footer>
  );
}
