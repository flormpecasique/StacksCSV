"use client";

import {
  getThisYearRange,
  getLastYearRange,
  getLast30DaysRange,
  type DateRange,
} from "@/lib/date-utils";
import { type Lang, useTranslations } from "@/lib/i18n";

interface DateFilterProps {
  range:    DateRange;
  onChange: (range: DateRange) => void;
  lang:     Lang;
}

/*
  Unified date-range pill design:
  ┌─────────────────────────────────────────┐
  │ FROM           │ TO                      │
  │ 1 Jan 2026     │ 31 Dec 2026             │
  └─────────────────────────────────────────┘

  Key Safari/iPadOS fixes:
  - Single outer container with overflow:hidden clips native date chrome
  - minmax(0,1fr) on each cell: never wider than its column
  - font-size 16px on inputs prevents iOS zoom-on-focus
  - box-sizing:border-box everywhere
*/

const fieldStyle: React.CSSProperties = {
  flex:          "1 1 0%",
  minWidth:      0,
  display:       "flex",
  flexDirection: "column",
  padding:       "10px 14px",
  boxSizing:     "border-box",
};

const labelStyle: React.CSSProperties = {
  display:       "block",
  fontSize:      "10px",
  fontWeight:    600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color:         "var(--text-muted)",
  fontFamily:    "var(--font-display)",
  marginBottom:  "3px",
};

const inputStyle: React.CSSProperties = {
  background:  "transparent",
  border:      "none",
  outline:     "none",
  color:       "var(--text-primary)",
  fontFamily:  "var(--font-mono)",
  fontSize:    "16px",   /* ≥16px prevents iOS zoom */
  fontWeight:  500,
  width:       "100%",
  minWidth:    0,
  maxWidth:    "100%",
  padding:     0,
  margin:      0,
  boxSizing:   "border-box",
  colorScheme: "dark",
  cursor:      "pointer",
};

export default function DateFilter({ range, onChange, lang }: DateFilterProps) {
  const t = useTranslations(lang);

  const presets = [
    { label: t("thisYear"),   getRange: getThisYearRange   },
    { label: t("lastYear"),   getRange: getLastYearRange   },
    { label: t("last30Days"), getRange: getLast30DaysRange },
  ];

  function isActive(pr: DateRange) {
    return range.from === pr.from && range.to === pr.to;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* Label */}
      <p style={{
        margin: 0, fontSize: "11px", fontWeight: 600,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: "var(--text-muted)", fontFamily: "var(--font-display)",
      }}>
        {t("filterTitle")}
      </p>

      {/*
        Unified pill container.
        overflow:hidden is critical — it clips the native calendar icon
        that Safari renders outside the input's layout box.
      */}
      <div style={{
        display:      "flex",
        alignItems:   "stretch",
        borderRadius: "12px",
        overflow:     "hidden",           /* ← key Safari fix */
        border:       "1px solid var(--border)",
        background:   "var(--bg-700)",
        width:        "100%",
        boxSizing:    "border-box",
      }}>

        {/* FROM */}
        <div style={fieldStyle}>
          <span style={labelStyle}>{t("from")}</span>
          <input
            type="date"
            value={range.from}
            max={range.to || undefined}
            onChange={(e) => onChange({ ...range, from: e.target.value })}
            style={inputStyle}
          />
        </div>

        {/* Divider — 1px vertical line, same color as all borders */}
        <div style={{
          width: "1px", flexShrink: 0,
          background: "var(--border)", alignSelf: "stretch",
        }} />

        {/* TO */}
        <div style={fieldStyle}>
          <span style={labelStyle}>{t("to")}</span>
          <input
            type="date"
            value={range.to}
            min={range.from || undefined}
            onChange={(e) => onChange({ ...range, to: e.target.value })}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Quick-select presets */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {presets.map((preset) => {
          const pr     = preset.getRange();
          const active = isActive(pr);
          return (
            <button
              key={preset.label}
              onClick={() => onChange(pr)}
              style={{
                padding:      "7px 14px",
                borderRadius: "8px",
                fontSize:     "13px",
                fontFamily:   "var(--font-display)",
                fontWeight:   active ? 600 : 400,
                background:   active
                  ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                  : "var(--bg-600)",
                color:        active ? "#fff" : "var(--text-secondary)",
                border:       active ? "1px solid transparent" : "1px solid var(--border)",
                cursor:       "pointer",
                whiteSpace:   "nowrap",
                transition:   "opacity 0.15s",
                flexShrink:   0,
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
