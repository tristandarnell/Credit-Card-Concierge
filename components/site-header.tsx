"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/cards", label: "Cards" },
  { href: "/review", label: "Data Review" },
  { href: "/guide", label: "Guide" },
  { href: "/upload", label: "Upload" },
  { href: "/recommendations", label: "Recommendations" },
  { href: "/optimizer", label: "Purchase Optimizer" }
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link href="/" className="brand" aria-label="CreditCard Concierge Home">
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
