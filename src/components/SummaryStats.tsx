"use client";

import type { TransactionSummary } from "@/lib/date-utils";
import { type Lang, useTranslations } from "@/lib/i18n";

interface SummaryStatsProps {
  summary: TransactionSummary;
  lang: Lang;
}

/** Formats a STX number cleanly: up to 6 decimals, trailing zeros stripped. */
function formatStx(value: number): string {
  if (value === 0) return "0";
  return value.toFixed(6).replace(/\.?0+$/, "");
}

export default function SummaryStats({ summary, lang }: SummaryStatsProps) {
  const t = useTranslations(lang);

  const stats = [
    {
      label: t("received"),
      value: formatStx(summary.received),
      unit:  "STX",
      color: "#4ade80", // green
    },
    {
      label: t("sent"),
      value: formatStx(summary.sent),
      unit:  "STX",
      color: "#fb923c", // orange
    },
    {
      label: t("fees"),
      value: formatStx(summary.fees),
      unit:  "STX",
      color: "var(--text-muted)",
    },
    {
      label: t("transactions"),
      value: summary.count.toLocaleString(),
      unit:  "",
      color: "var(--text-primary)",
    },
  ];

  return (
    <div
      className="rounded-xl p-4 animate-fade-in"
      style={{
        background: "var(--bg-800)",
        border:     "1px solid var(--border)",
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}
      >
        {t("summaryTitle")}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-0.5 p-3 rounded-lg"
            style={{ background: "var(--bg-700)" }}
          >
            <span
              className="text-xs"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
            >
              {s.label}
            </span>
            <span
              className="text-base font-bold"
              style={{
                color:      s.color,
                fontFamily: "var(--font-mono)",
                lineHeight: 1.2,
              }}
            >
              {s.value}
              {s.unit && (
                <span
                  className="text-xs font-normal ml-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s.unit}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
