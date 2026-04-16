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

      {/* Section label */}
      <p style={{
        margin: 0,
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        fontFamily: "var(--font-display)",
      }}>
        {t("filterTitle")}
      </p>

      {/*
        Unified date range container.
        Looks like ONE element, not two separate inputs.
        Overflow:hidden clips the native Safari date-picker chrome.
      */}
      <div style={{
        display:      "flex",
        alignItems:   "stretch",
        borderRadius: "12px",
        overflow:     "hidden",
        border:       "1px solid var(--border)",
        background:   "var(--bg-700)",
        width:        "100%",
        boxSizing:    "border-box",
      }}>

        {/* FROM field */}
        <div style={{
          flex:           "1 1 0%",
          minWidth:       0,
          display:        "flex",
          flexDirection:  "column",
          padding:        "10px 14px 10px 14px",
          boxSizing:      "border-box",
        }}>
          <span style={{
            fontSize:   "10px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color:      "var(--text-muted)",
            fontFamily: "var(--font-display)",
            marginBottom: "4px",
            display:    "block",
          }}>
            {t("from")}
          </span>
          <input
            type="date"
            value={range.from}
            max={range.to || undefined}
            onChange={(e) => onChange({ ...range, from: e.target.value })}
            style={{
              background:  "transparent",
              border:      "none",
              outline:     "none",
              color:       "var(--text-primary)",
              fontFamily:  "var(--font-mono)",
              fontSize:    "14px",
              fontWeight:  500,
              width:       "100%",
              minWidth:    0,
              maxWidth:    "100%",
              padding:     0,
              margin:      0,
              boxSizing:   "border-box",
              colorScheme: "dark",
              cursor:      "pointer",
            }}
          />
        </div>

        {/* Vertical divider — a thin line, not a gap */}
        <div style={{
          width:      "1px",
          background: "var(--border)",
          flexShrink: 0,
          alignSelf:  "stretch",
        }} />

        {/* TO field */}
        <div style={{
          flex:           "1 1 0%",
          minWidth:       0,
          display:        "flex",
          flexDirection:  "column",
          padding:        "10px 14px 10px 14px",
          boxSizing:      "border-box",
        }}>
          <span style={{
            fontSize:   "10px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color:      "var(--text-muted)",
            fontFamily: "var(--font-display)",
            marginBottom: "4px",
            display:    "block",
          }}>
            {t("to")}
          </span>
          <input
            type="date"
            value={range.to}
            min={range.from || undefined}
            onChange={(e) => onChange({ ...range, to: e.target.value })}
            style={{
              background:  "transparent",
              border:      "none",
              outline:     "none",
              color:       "var(--text-primary)",
              fontFamily:  "var(--font-mono)",
              fontSize:    "14px",
              fontWeight:  500,
              width:       "100%",
              minWidth:    0,
              maxWidth:    "100%",
              padding:     0,
              margin:      0,
              boxSizing:   "border-box",
              colorScheme: "dark",
              cursor:      "pointer",
            }}
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
