"use client";

import type { Summary } from "@/lib/date-utils";
import { type Lang, useTranslations } from "@/lib/i18n";

interface Props {
  summary: Summary;
  lang:    Lang;
}

const VISIBLE_TOKEN_LIMIT = 4;

function fmt(n: number, decimals = 6): string {
  if (n === 0) return "0";
  return n
    .toFixed(decimals)
    .replace(/\.?0+$/, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function SummaryStats({ summary, lang }: Props) {
  const t = useTranslations(lang);
  const { totalReceived, totalSent, totalFees, txCount, tokenSummary, btcRewards } = summary;

  const btcEntry    = tokenSummary.find(e => e.currency === "BTC");
  const otherTokens = tokenSummary.filter(e => e.currency !== "BTC");

  // Build the visible token list (first N, then "+M more")
  const visibleSymbols = otherTokens.slice(0, VISIBLE_TOKEN_LIMIT).map(tk => tk.currency);
  const hiddenCount    = Math.max(0, otherTokens.length - VISIBLE_TOKEN_LIMIT);
  const symbolsLine    = hiddenCount > 0
    ? `${visibleSymbols.join(" · ")} · +${hiddenCount} ${t("moreTokens")}`
    : visibleSymbols.join(" · ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* ── STX Summary ── */}
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px", padding: "16px",
      }}>
        <div style={{
          fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: "12px",
        }}>
          STX
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <StatCard label={t("received")}     value={`+${fmt(totalReceived)}`} color="#4ade80" />
          <StatCard label={t("sent")}         value={`-${fmt(totalSent)}`}     color="#f87171" />
          <StatCard label={t("fees")}         value={`-${fmt(totalFees)}`}     color="#fb923c" />
          <StatCard label={t("transactions")} value={txCount.toString()}        color="rgba(255,255,255,0.7)" />
        </div>
      </div>

      {/* ── Stacking Rewards (BTC) ── */}
      {btcEntry && btcEntry.received > 0 && (
        <div style={{
          background: "rgba(247,147,26,0.08)", border: "1px solid rgba(247,147,26,0.25)",
          borderRadius: "12px", padding: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ fontSize: "18px" }}>₿</span>
            <span style={{
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em",
              color: "rgba(247,147,26,0.9)", textTransform: "uppercase",
            }}>
              {t("stackingRewards")}
            </span>
          </div>

          <div style={{
            background: "rgba(247,147,26,0.12)", borderRadius: "8px", padding: "12px 14px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
              {t("btcReceived")}
            </span>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#f7931a", fontFamily: "monospace" }}>
              +{fmt(btcRewards, 8)} BTC
            </span>
          </div>

          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "8px", marginBottom: 0 }}>
            {t("stackingRewardsNote")}
          </p>
        </div>
      )}

      {/*
        ── Other tokens — condensed informational line ──
        Replaces the previous detailed list. Reasoning:
          - Per-token totals on the dashboard add no decision value (every
            movement is already in the CSV row-by-row).
          - A confirming line ("included in CSV") removes user uncertainty.
          - Visual weight now matches relative importance: STX > BTC > FTs.
      */}
      {otherTokens.length > 0 && (
        <div style={{
          display:        "flex",
          alignItems:     "flex-start",
          gap:            "12px",
          background:     "rgba(255,255,255,0.03)",
          border:         "1px solid rgba(255,255,255,0.06)",
          borderRadius:   "10px",
          padding:        "12px 14px",
        }}>
          <span style={{ fontSize: "16px", flexShrink: 0, lineHeight: 1.3 }}>🪙</span>

          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              fontSize:     "13px",
              color:        "rgba(255,255,255,0.75)",
              margin:       0,
              marginBottom: "3px",
            }}>
              <strong style={{ color: "rgba(255,255,255,0.95)", fontWeight: 600 }}>
                {otherTokens.length}
              </strong>
              {" "}
              {otherTokens.length === 1 ? t("otherTokensFound") : t("otherTokensFoundP")}
            </p>

            <p style={{
              fontSize:     "12px",
              fontFamily:   "var(--font-mono)",
              color:        "rgba(255,255,255,0.5)",
              margin:       0,
              marginBottom: "6px",
              wordBreak:    "break-word",
            }}>
              {symbolsLine}
            </p>

            <p style={{
              fontSize: "11px",
              color:    "rgba(74,222,128,0.7)",
              margin:   0,
              display:  "flex",
              alignItems: "center",
              gap:      "4px",
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {t("otherTokensInCsv")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 12px" }}>
      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>
        {label}
      </div>
      <div style={{ fontSize: "15px", fontWeight: 700, color, fontFamily: "monospace", wordBreak: "break-all" }}>
        {value}
      </div>
    </div>
  );
}
