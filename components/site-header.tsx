"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Account" },
  { href: "/recommendations", label: "Cards" },
  { href: "/optimizer", label: "Optimization" },
  { href: "/wallet", label: "My Wallet" },
  { href: "/upload", label: "Transactions" },
  { href: "/extension", label: "Extension" },
  { href: "/guide", label: "Guide" },
  { href: "/about", label: "About Us" },
];

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
          <Link href="/" className="brand-logo" aria-label="Concierge Home">
            <BellIcon />
            <span className="brand-wordmark">
              <span className="brand-line1">CONCIERGE</span>
              <span className="brand-tagline">Credit Card Intelligence Platform</span>
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

    </header>
  );
}
