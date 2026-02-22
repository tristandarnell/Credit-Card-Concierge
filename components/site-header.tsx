"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "File Upload" },
  { href: "/guide", label: "Churning Guide" },
  { href: "/about", label: "About Us" },
];

function CardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      {/* Main nav */}
      <div className="main-nav">
        <div className="main-nav-inner">
          <Link href="/" className="brand-logo" aria-label="CreditCard Concierge Home">
            <CardIcon />
            <span className="brand-wordmark">
              <span className="brand-line1">CREDITCARD</span>
              <span className="brand-line2">CONCIERGE</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="main-nav-links">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active ? "main-nav-link active" : "main-nav-link"}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="breadcrumb-bar">
        <div className="breadcrumb-inner">
          <span className="breadcrumb-text">Card Comparison &amp; Portfolio Audit</span>
        </div>
      </div>
    </header>
  );
}