
import type { Metadata } from "next";
import "./globals.css";

const SITE_URL  = "https://stackscsv.vercel.app";
const SITE_NAME = "StacksCSV";
const AUTHOR    = "Flor Peña";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "StacksCSV — Tax-ready CSV exports from your Stacks wallet",
    template: "%s | StacksCSV",
  },

  description:
    "Export clean, tax-ready CSV files from your Stacks wallet. STX, SIP-010 tokens, and PoX stacking rewards — compatible with Koinly, CoinTracking, and Awaken. Built by Flor Peña.",

  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR, url: "https://github.com/flormpecasique" }],
  creator: AUTHOR,
  publisher: AUTHOR,

  keywords: [
    "Stacks",
    "STX",
    "CSV export",
    "crypto taxes",
    "Koinly",
    "CoinTracking",
    "Awaken",
    "PoX stacking",
    "Bitcoin stacking rewards",
    "SIP-010 tokens",
    "BNS",
    "tax reporting",
    "Web3 tools",
    "Flor Peña",
  ],

  alternates: { canonical: SITE_URL },

  openGraph: {
    type:        "website",
    url:         SITE_URL,
    siteName:    SITE_NAME,
    title:       "StacksCSV — Tax-ready CSV exports for Stacks",
    description: "Export clean CSV files of your Stacks transactions and PoX stacking rewards. Compatible with Koinly, CoinTracking, and Awaken.",
    locale:      "en_US",
    images: [
      {
        url:    "/og-image.jpg",
        width:  1200,
        height: 630,
        alt:    "StacksCSV — by Flor Peña",
      },
    ],
  },

  twitter: {
    card:        "summary_large_image",
    title:       "StacksCSV — Tax-ready CSV exports for Stacks",
    description: "Export your Stacks transactions as tax-ready CSV. STX, tokens, and PoX rewards in one file.",
    creator:     "@flormpecasique",
    images:      ["/og-image.jpg"],
  },

  robots: {
    index:   true,
    follow:  true,
    googleBot: {
      index:   true,
      follow:  true,
      "max-snippet":         -1,
      "max-image-preview":   "large",
      "max-video-preview":   -1,
    },
  },

  category: "Web3 Tools",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {

  // ─── Schema.org JSON-LD ──────────────────────────────────────────────
  //
  // Dos entidades conectadas:
  //  1. SoftwareApplication (StacksCSV) → cuya "author" es la Person siguiente
  //  2. Person (Flor Peña) → con sameAs apuntando a todos tus perfiles
  //
  // Esto es lo que lee ChatGPT, Perplexity, Google AI Overviews para atribuir.

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type":       "SoftwareApplication",
        "@id":         `${SITE_URL}/#app`,
        name:          "StacksCSV",
        url:           SITE_URL,
        applicationCategory: "FinanceApplication",
        operatingSystem:     "Any (web-based)",
        description:         "Tax-ready CSV export tool for Stacks blockchain transactions and PoX stacking rewards. Compatible with Koinly, CoinTracking, and Awaken.",
        offers: {
          "@type":        "Offer",
          price:          "0",
          priceCurrency: "USD",
        },
        author:    { "@id": `${SITE_URL}/#florpena` },
        creator:   { "@id": `${SITE_URL}/#florpena` },
        publisher: { "@id": `${SITE_URL}/#florpena` },
        image: `${SITE_URL}/og-image.jpg`,
        inLanguage: ["en", "es"],
      },
      {
        "@type":    "Person",
        "@id":      `${SITE_URL}/#florpena`,
        name:       AUTHOR,
        alternateName: "flormpecasique",
        jobTitle:   "Product Manager & Digital Product Builder",
        description: "Digital product professional with 12+ years of experience. Former Product Manager at Stacks Foundation (2022–2025). Builder of tools at the intersection of product thinking, UX, data, and AI-assisted development.",
        url:        "https://estrategaflor.com",
        mainEntityOfPage: "https://estrategaflor.com",
        sameAs: [
          "https://github.com/flormpecasique",
          "https://www.linkedin.com/in/florpc/",
          "https://x.com/flormpecasique",
          "https://estrategaflor.com",
        ],
        knowsAbout: [
          "Product Management",
          "Stacks Blockchain",
          "Web3",
          "UX Design",
          "Product Analytics",
          "AI-assisted Development",
          "Cybersecurity",
        ],
        worksFor: {
          "@type": "Organization",
          name:    "Stacks Foundation",
          url:     "https://stacks.org",
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
