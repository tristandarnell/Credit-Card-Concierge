import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Poppins, Noto_Serif } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { SiteHeader } from "@/components/site-header";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-poppins",
  display: "swap",
});

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-noto-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Concierge",
  description: "AI-powered credit card optimization from your real spending behavior."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${poppins.variable} ${notoSerif.variable}`}>
      <body suppressHydrationWarning>
        <AppProviders>
          <div className="site-layout">
            <SiteHeader />
            <main className="workspace-main">{children}</main>
            <footer className="workspace-footer">
              &copy; {new Date().getFullYear()} Concierge &middot; Affiliate disclosure:
              recommendations are based on spending data analysis, not commission rates &middot; Not a licensed
              financial advisor 


            </footer>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
