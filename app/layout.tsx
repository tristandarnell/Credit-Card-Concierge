import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { SiteHeader } from "@/components/site-header";

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
        <AppProviders>
          <div className="site-layout">
            <SiteHeader />
            <main className="workspace-main">{children}</main>
            <footer className="workspace-footer">
              &copy; {new Date().getFullYear()} CreditCard Concierge &middot; Affiliate disclosure:
              recommendations are based on spending data analysis, not commission rates &middot; Not a licensed
              financial advisor 


            </footer>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
