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
  Safari/iPadOS quirk with input[type="date"]:
  The native date control renders a hidden calendar icon and clear button
  that can extend outside the element's layout box.
  Fixes applied:
    1. gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)"
       — "1fr" alone has min-width:auto which lets content overflow the column.
       — "minmax(0, 1fr)" hard-caps the column at its available space.
    2. overflow: "hidden" on the grid wrapper — clips anything that bleeds out.
    3. maxWidth: "100%", width: "100%", boxSizing: "border-box" on each input.
*/

// Shared styles for both date inputs
const dateInputStyle: React.CSSProperties = {
  display:      "block",
  width:        "100%",
  maxWidth:     "100%",
  minWidth:     0,           /* allow column to shrink it */
  boxSizing:    "border-box",
  padding:      "9px 12px",
  borderRadius: "10px",
  fontSize:     "14px",
  background:   "var(--bg-700)",
  border:       "1px solid var(--border)",
  color:        "var(--text-primary)",
  fontFamily:   "var(--font-mono)",
  colorScheme:  "dark",
  outline:      "none",
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
      <p
        style={{
          fontSize:      "11px",
          fontWeight:    600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color:         "var(--text-muted)",
          fontFamily:    "var(--font-display)",
          margin:        0,
        }}
      >
        {t("filterTitle")}
      </p>

      {/*
        Grid container.
        overflow:hidden is the critical Safari fix — it clips the native
        date-picker chrome that would otherwise bleed outside the card.
        minmax(0, 1fr) ensures columns can never exceed their allocated space.
      */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap:                 "8px",
          overflow:            "hidden",
          width:               "100%",
        }}
      >
        {/* FROM */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
          <label
            style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
          >
            {t("from")}
          </label>
          <input
            type="date"
            value={range.from}
            max={range.to || undefined}
            onChange={(e) => onChange({ ...range, from: e.target.value })}
            style={dateInputStyle}
          />
        </div>

        {/* TO */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
          <label
            style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
          >
            {t("to")}
          </label>
          <input
            type="date"
            value={range.to}
            min={range.from || undefined}
            onChange={(e) => onChange({ ...range, to: e.target.value })}
            style={dateInputStyle}
          />
        </div>
      </div>

      {/* Quick-select preset buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {presets.map((preset) => {
          const pr     = preset.getRange();
          const active = isActive(pr);
          return (
            <button
              key={preset.label}
              onClick={() => onChange(pr)}
              style={{
                padding:      "6px 14px",
                borderRadius: "8px",
                fontSize:     "12px",
                fontFamily:   "var(--font-display)",
                fontWeight:   active ? 600 : 400,
                background:   active
                  ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                  : "var(--bg-700)",
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
