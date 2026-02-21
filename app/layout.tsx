import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, Arvo } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-mono"
});

// Arvo: closest available substitute for Archer (Hoefler & Co.)
// Used for display headings only — Wells Fargo pattern: slab serif at large sizes, sans-serif for UI body
const arvo = Arvo({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-display"
});

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
    <html lang="en" className={`${inter.variable} ${ibmPlexMono.variable} ${arvo.variable}`}>
      <body suppressHydrationWarning>
        <div className="app-shell">
          <Sidebar />
          <div className="workspace">
            <main className="workspace-main">{children}</main>
            <footer className="workspace-footer">
              &copy; {new Date().getFullYear()} CreditCard Concierge &middot; Affiliate disclosure: recommendations are based on spending data analysis, not commission rates &middot; Not a licensed financial advisor &middot; <a href="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>Privacy Policy</a> &middot; <a href="/terms" style={{ color: "inherit", textDecoration: "underline" }}>Terms</a>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
