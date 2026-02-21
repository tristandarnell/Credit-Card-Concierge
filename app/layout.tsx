import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "CreditCard Concierge",
  description: "AI-powered credit card optimization from your real spending behavior."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <div className="app-shell">
          <Sidebar />
          <div className="workspace">
            <main className="workspace-main">{children}</main>
            <footer className="workspace-footer">
              &copy; {new Date().getFullYear()} CreditCard Concierge &middot; Affiliate disclosure:
              recommendations are based on spending data analysis, not commission rates &middot; Not a licensed
              financial advisor &middot;{" "}
              <Link href="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>
                Privacy Policy
              </Link>{" "}
              &middot;{" "}
              <Link href="/terms" style={{ color: "inherit", textDecoration: "underline" }}>
                Terms
              </Link>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
