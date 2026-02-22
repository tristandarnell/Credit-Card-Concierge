"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mobileLinks = [
  { href: "/", label: "Home" },
  { href: "/recommendations", label: "Recommendations" },
  { href: "/optimizer", label: "Optimizer" },
  { href: "/upload", label: "Upload" },
  { href: "/wallet", label: "Wallet" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="mobile-nav" role="navigation" aria-label="Mobile navigation">
      <div className="mobile-nav-inner">
        {mobileLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className={active ? "mobile-nav-link active" : "mobile-nav-link"}>
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
