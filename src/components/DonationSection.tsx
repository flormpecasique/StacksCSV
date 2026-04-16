"use client";

import { useState } from "react";

const DONATION_ADDRESS = "flor.btc";

export default function DonationSection() {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(DONATION_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = DONATION_ADDRESS;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <section
      className="rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3"
      style={{
        background: "var(--bg-800)",
        border: "1px solid var(--border)",
      }}
      aria-label="Donation section"
    >
      {/* Heart icon */}
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base"
        style={{ background: "rgba(249,115,22,0.12)" }}
      >
        🧡
      </div>

      {/* Text */}
      <div className="flex-1 text-center sm:text-left">
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          Found this useful?
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Consider sending a small donation to support development
        </p>
      </div>

      {/* Address + Copy */}
      <button
        onClick={copyAddress}
        className="group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
        style={{
          background: "var(--bg-700)",
          border: "1px solid var(--border)",
        }}
        aria-label={copied ? "Address copied!" : "Copy donation address"}
        title={`Copy ${DONATION_ADDRESS}`}
      >
        <span
          className="font-mono text-xs"
          style={{ fontFamily: "var(--font-mono)", color: "var(--brand)" }}
        >
          {DONATION_ADDRESS}
        </span>

        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: "var(--text-muted)" }}
            className="group-hover:text-orange-400 transition-colors">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        )}
      </button>
    </section>
  );
}
