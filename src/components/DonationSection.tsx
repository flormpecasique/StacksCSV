"use client";

import { useState } from "react";
import { type Lang, useTranslations } from "@/lib/i18n";

const DONATION_ADDRESS = "flor.btc";

export default function DonationSection({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(DONATION_ADDRESS);
    } catch {
      const el = document.createElement("textarea");
      el.value = DONATION_ADDRESS;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <section
      className="rounded-xl p-5 text-center flex flex-col items-center gap-4"
      style={{
        background: "var(--bg-800)",
        border:     "1px solid var(--border)",
      }}
      aria-label="Donation"
    >
      {/* Copy */}
      <p
        className="text-sm max-w-xs leading-relaxed"
        style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
      >
        {t("donationTitle")}
      </p>

      {/* Button */}
      <button
        onClick={copyAddress}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
        style={{
          background: copied
            ? "rgba(74,222,128,0.15)"
            : "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.15) 100%)",
          border:     copied
            ? "1px solid rgba(74,222,128,0.3)"
            : "1px solid rgba(249,115,22,0.3)",
          color:      copied ? "#4ade80" : "var(--brand)",
          fontFamily: "var(--font-display)",
        }}
        aria-label={t("donationBtn")}
      >
        {copied ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {t("copiedDonation")}
          </>
        ) : (
          <>
            🧡 {t("donationBtn")}
          </>
        )}
      </button>
    </section>
  );
}
