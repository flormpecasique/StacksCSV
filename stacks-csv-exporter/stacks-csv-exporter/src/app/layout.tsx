import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stacks CSV Exporter – Export STX Transactions for Taxes",
  description:
    "Free tool to export Stacks (STX) wallet transactions as CSV for crypto tax software like Koinly, CoinTracking, and Awaken. Stacks tax export, STX CSV download, Stacks wallet transactions.",
  keywords: [
    "Stacks tax export",
    "STX CSV",
    "Stacks wallet transactions download",
    "STX transactions CSV",
    "Stacks crypto tax",
    "Koinly Stacks import",
    "CoinTracking STX",
    "Stacks blockchain export",
  ],
  authors: [{ name: "Stacks CSV Exporter" }],
  robots: "index, follow",
  openGraph: {
    title: "Stacks CSV Exporter – Export STX Transactions for Taxes",
    description:
      "Export your Stacks (STX) wallet transactions as CSV. Compatible with Koinly, CoinTracking, and Awaken tax software.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Stacks CSV Exporter – Export STX Transactions for Taxes",
    description:
      "Free tool to export Stacks (STX) wallet transactions for crypto tax reporting.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to Google Fonts for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="noise min-h-screen">{children}</body>
    </html>
  );
}
