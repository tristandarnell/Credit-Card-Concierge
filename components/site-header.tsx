"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Overview" },
  { href: "/recommendations", label: "Cards" },
  { href: "/optimizer", label: "Optimization" },
  { href: "/wallet", label: "My Wallet" },
  { href: "/upload", label: "Transactions" },
  { href: "/extension", label: "Extension" },
  { href: "/guide", label: "Insights" },
  { href: "/login", label: "Account" },
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="main-nav">
        <div className="main-nav-inner">
          <Link href="/" className="brand-logo" aria-label="CreditCard Concierge Home">
            <CardIcon />
            <span className="brand-wordmark">
              <span className="brand-line1">CREDITCARD</span>
              <span className="brand-line2">CONCIERGE</span>
            </span>
          </Link>

          <button
            type="button"
            className="mobile-hamburger-toggle"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span className={menuOpen ? "hamburger-line open" : "hamburger-line"} />
            <span className={menuOpen ? "hamburger-line open" : "hamburger-line"} />
            <span className={menuOpen ? "hamburger-line open" : "hamburger-line"} />
          </button>

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

      <div className={menuOpen ? "mobile-hamburger-panel open" : "mobile-hamburger-panel"}>
        <div className="mobile-hamburger-panel-inner">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={`mobile-${link.href}`}
                href={link.href}
                className={active ? "mobile-hamburger-link active" : "mobile-hamburger-link"}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        className={menuOpen ? "mobile-hamburger-backdrop open" : "mobile-hamburger-backdrop"}
        aria-label="Close menu backdrop"
        onClick={() => setMenuOpen(false)}
      />

      <div className="breadcrumb-bar">
        <div className="breadcrumb-inner">
          <span className="breadcrumb-text">Credit Card Intelligence Platform</span>
        </div>
      </div>
    </header>
  );
}
