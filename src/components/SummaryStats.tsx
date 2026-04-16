"use client";

import type { TransactionSummary } from "@/lib/date-utils";
import { type Lang, useTranslations } from "@/lib/i18n";

interface SummaryStatsProps {
  summary: TransactionSummary;
  lang:    Lang;
}

function formatStx(value: number): string {
  if (value === 0) return "0";
  return value.toFixed(6).replace(/\.?0+$/, "");
}

export default function SummaryStats({ summary, lang }: SummaryStatsProps) {
  const t = useTranslations(lang);

  const stats = [
    {
      label: t("received"), value: formatStx(summary.received),
      prefix: "+", unit: "STX",
      bg: "rgba(34,197,94,0.07)", border: "rgba(34,197,94,0.18)", color: "#4ade80",
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/>
      </svg>,
    },
    {
      label: t("sent"), value: formatStx(summary.sent),
      prefix: "-", unit: "STX",
      bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.18)", color: "#fb923c",
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 13 12 18 7 13"/><line x1="12" y1="18" x2="12" y2="6"/>
      </svg>,
    },
    {
      label: t("fees"), value: formatStx(summary.fees),
      prefix: "-", unit: "STX",
      bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.07)", color: "var(--text-muted)",
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>,
    },
    {
      label: t("transactions"), value: summary.count.toLocaleString(),
      prefix: "", unit: "",
      bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.07)", color: "var(--text-primary)",
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>,
    },
  ];

  return (
    <div className="rounded-xl p-4 animate-fade-in"
      style={{ background: "var(--bg-800)", border: "1px solid var(--border)" }}>

      <div className="flex items-center gap-2 mb-3">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <p className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}>
          {t("summaryTitle")}
        </p>
      </div>

      {/* 2 cols on mobile, 4 on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1.5 p-3 rounded-lg overflow-hidden"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            {/* Label + icon */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs truncate"
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                {s.label}
              </span>
              <span style={{ flexShrink: 0 }}>{s.icon}</span>
            </div>
            {/* Value */}
            <div className="flex items-baseline gap-0.5 min-w-0">
              {s.prefix && (
                <span className="text-sm font-bold" style={{ color: s.color, fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                  {s.prefix}
                </span>
              )}
              <span
                className="text-sm sm:text-base font-bold leading-tight truncate"
                style={{ color: s.color, fontFamily: "var(--font-mono)" }}
                title={s.value}
              >
                {s.value}
              </span>
              {s.unit && (
                <span className="text-xs ml-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", flexShrink: 0 }}>
                  {s.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
