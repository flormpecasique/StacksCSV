"use client";

import type { Summary } from "@/lib/date-utils";
import type { Translations } from "@/lib/i18n";

interface Props {
  summary:  Summary;
  t:        Translations;
}

// Format a number with up to 6 significant decimals, strip trailing zeros
function fmt(n: number, decimals = 6): string {
  if (n === 0) return "0";
  return n
    .toFixed(decimals)
    .replace(/\.?0+$/, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function SummaryStats({ summary, t }: Props) {
  const { totalReceived, totalSent, totalFees, txCount, tokenSummary, btcRewards } = summary;

  // Separate BTC (stacking rewards) from other FT tokens
  const btcEntry    = tokenSummary.find(e => e.currency === "BTC");
  const otherTokens = tokenSummary.filter(e => e.currency !== "BTC");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* ── STX Summary ──────────────────────────────────────── */}
      <div
        style={{
          background:   "rgba(255,255,255,0.04)",
          border:       "1px solid rgba(255,255,255,0.08)",
          borderRadius: "12px",
          padding:      "16px",
        }}
      >
        <div
          style={{
            fontSize:     "11px",
            fontWeight:   600,
            letterSpacing:"0.08em",
            color:        "rgba(255,255,255,0.4)",
            textTransform:"uppercase",
            marginBottom: "12px",
          }}
        >
          STX
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <StatCard
            label={t.received}
            value={`+${fmt(totalReceived)}`}
            color="#4ade80"
          />
          <StatCard
            label={t.sent}
            value={`-${fmt(totalSent)}`}
            color="#f87171"
          />
          <StatCard
            label={t.fees}
            value={`-${fmt(totalFees)}`}
            color="#fb923c"
          />
          <StatCard
            label={t.transactions}
            value={txCount.toString()}
            color="rgba(255,255,255,0.7)"
          />
        </div>
      </div>

      {/* ── Stacking Rewards (BTC) ────────────────────────────── */}
      {btcEntry && btcEntry.received > 0 && (
        <div
          style={{
            background:   "rgba(247,147,26,0.08)",
            border:       "1px solid rgba(247,147,26,0.25)",
            borderRadius: "12px",
            padding:      "16px",
          }}
        >
          {/* Header */}
          <div
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "8px",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontSize: "18px" }}>₿</span>
            <span
              style={{
                fontSize:     "11px",
                fontWeight:   600,
                letterSpacing:"0.08em",
                color:        "rgba(247,147,26,0.9)",
                textTransform:"uppercase",
              }}
            >
              {t.stackingRewards}
            </span>
          </div>

          {/* BTC received */}
          <div
            style={{
              background:   "rgba(247,147,26,0.12)",
              borderRadius: "8px",
              padding:      "12px 14px",
              display:      "flex",
              justifyContent:"space-between",
              alignItems:   "center",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                color:    "rgba(255,255,255,0.6)",
              }}
            >
              {t.btcReceived}
            </span>
            <span
              style={{
                fontSize:   "16px",
                fontWeight: 700,
                color:      "#f7931a",
                fontFamily: "monospace",
              }}
            >
              +{fmt(btcRewards, 8)} BTC
            </span>
          </div>

          {/* Info note */}
          <p
            style={{
              fontSize:   "11px",
              color:      "rgba(255,255,255,0.35)",
              marginTop:  "8px",
              marginBottom: 0,
            }}
          >
            {t.stackingRewardsNote}
          </p>
        </div>
      )}

      {/* ── Other FT Tokens ──────────────────────────────────── */}
      {otherTokens.length > 0 && (
        <div
          style={{
            background:   "rgba(255,255,255,0.04)",
            border:       "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            padding:      "16px",
          }}
        >
          <div
            style={{
              fontSize:     "11px",
              fontWeight:   600,
              letterSpacing:"0.08em",
              color:        "rgba(255,255,255,0.4)",
              textTransform:"uppercase",
              marginBottom: "12px",
            }}
          >
            {t.otherTokens}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {otherTokens.map((token) => (
              <div
                key={token.currency}
                style={{
                  display:        "flex",
                  justifyContent: "space-between",
                  alignItems:     "center",
                  padding:        "8px 12px",
                  background:     "rgba(255,255,255,0.04)",
                  borderRadius:   "8px",
                }}
              >
                <span
                  style={{
                    fontSize:   "13px",
                    fontWeight: 600,
                    color:      "rgba(255,255,255,0.8)",
                  }}
                >
                  {token.currency}
                </span>
                <div style={{ textAlign: "right" }}>
                  {token.received > 0 && (
                    <div
                      style={{
                        fontSize:   "13px",
                        color:      "#4ade80",
                        fontFamily: "monospace",
                      }}
                    >
                      +{fmt(token.received)}
                    </div>
                  )}
                  {token.sent > 0 && (
                    <div
                      style={{
                        fontSize:   "13px",
                        color:      "#f87171",
                        fontFamily: "monospace",
                      }}
                    >
                      -{fmt(token.sent)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper: single stat card ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background:   "rgba(255,255,255,0.04)",
        borderRadius: "8px",
        padding:      "10px 12px",
      }}
    >
      <div
        style={{
          fontSize:     "11px",
          color:        "rgba(255,255,255,0.4)",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize:   "15px",
          fontWeight: 700,
          color,
          fontFamily: "monospace",
          wordBreak:  "break-all",
        }}
      >
        {value}
      </div>
    </div>
  );
}
