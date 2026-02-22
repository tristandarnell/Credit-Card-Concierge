import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";

export default function ExtensionPage() {
  return (
    <section className="section section-tight">
      <SectionHeading
        title="Browser Extension (MVP)"
        subtitle="Checkout recommendation + autofill for compatible payment forms."
      />

      <div className="panel">
        <h3>What It Does</h3>
        <p>
          The extension reads checkout context (merchant + amount), asks this app for the best card from your wallet,
          and autofills card fields on compatible pages.
        </p>
        <p style={{ marginTop: "0.55rem" }}>
          If you are signed in and have cards saved in <Link href="/wallet">My Wallet</Link>, recommendation APIs can
          use that wallet automatically.
        </p>
      </div>

      <div className="panel">
        <h3>Load Unpacked</h3>
        <ol>
          <li>Open <code>chrome://extensions</code> and enable Developer mode.</li>
          <li>Click <strong>Load unpacked</strong>.</li>
          <li>Select the <code>extension</code> folder in this repo.</li>
          <li>Open extension options and set App Base URL (for local dev use <code>http://localhost:3000</code>).</li>
          <li>Load card catalog, add wallet cards, then use the popup on checkout pages.</li>
        </ol>
      </div>

      <div className="panel">
        <h3>Current Limitations</h3>
        <p>
          Hosted payment iframes (Stripe/Shopify/etc.) may block direct field access. In those cases, recommendation
          still works, but autofill may be unavailable.
        </p>
      </div>

      <p>
        <Link href="/optimizer">Use Purchase Optimizer</Link>
      </p>
    </section>
  );
}
