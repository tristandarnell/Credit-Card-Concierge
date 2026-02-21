"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/guide", label: "Guide" },
  { href: "/upload", label: "Upload" },
  { href: "/recommendations", label: "Recommendations" },
  { href: "/optimizer", label: "Purchase Optimizer" }
];

function CardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link href="/" className="brand-logo" aria-label="CreditCard Concierge Home">
          <CardIcon />
          CreditCard Concierge
        </Link>
        <nav aria-label="Main navigation">
          <ul className="nav-list">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link className={active ? "nav-link active" : "nav-link"} href={link.href}>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
