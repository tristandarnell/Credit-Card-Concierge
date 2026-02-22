"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function CardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-5" />
      <path d="M9 8V2" />
      <path d="M15 8V2" />
      <path d="M18 8H6v4a6 6 0 0 0 12 0V8z" />
    </svg>
  );
}

const primaryNav: NavItem[] = [
  { href: "/", label: "Overview", icon: <GridIcon /> },
  { href: "/recommendations", label: "Cards", icon: <CardIcon /> },
  { href: "/optimizer", label: "Optimization", icon: <ZapIcon /> },
  { href: "/wallet", label: "My Wallet", icon: <CardIcon /> },
  { href: "/extension", label: "Extension", icon: <PlugIcon /> },
  { href: "/guide", label: "Insights", icon: <TrendingIcon /> },
];

const secondaryNav: NavItem[] = [
  { href: "/upload", label: "Transactions", icon: <UploadIcon /> },
  { href: "/guide", label: "Rewards Guide", icon: <BookIcon /> },
  { href: "/login", label: "Account", icon: <BookIcon /> },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-brand">
        <CardIcon />
        <div>
          <div className="sidebar-brand-name">CC Concierge</div>
          <div className="sidebar-brand-sub">Credit Intelligence</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <p className="sidebar-section-label">Platform</p>
        {primaryNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "sidebar-link active" : "sidebar-link"}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}

        <p className="sidebar-section-label" style={{ marginTop: "0.75rem" }}>Data</p>
        {secondaryNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={active ? "sidebar-link active" : "sidebar-link"}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="sidebar-status-dot" />
          <span>Data current &middot; v2.1.0</span>
        </div>
      </div>
    </aside>
  );
}
