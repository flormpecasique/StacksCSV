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
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}>
        {t("filterTitle")}
      </p>

      {/* Date inputs — always stacked on mobile, side-by-side on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            {t("from")}
          </label>
          <input
            type="date"
            value={range.from}
            max={range.to || undefined}
            onChange={(e) => onChange({ ...range, from: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background:  "var(--bg-700)",
              border:      "1px solid var(--border)",
              color:       "var(--text-primary)",
              fontFamily:  "var(--font-mono)",
              colorScheme: "dark",
              outline:     "none",
              minWidth:    0,    /* prevent overflow */
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            {t("to")}
          </label>
          <input
            type="date"
            value={range.to}
            min={range.from || undefined}
            onChange={(e) => onChange({ ...range, to: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background:  "var(--bg-700)",
              border:      "1px solid var(--border)",
              color:       "var(--text-primary)",
              fontFamily:  "var(--font-mono)",
              colorScheme: "dark",
              outline:     "none",
              minWidth:    0,
            }}
          />
        </div>
      </div>

      {/* Quick-select buttons — wrap naturally */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const pr     = preset.getRange();
          const active = isActive(pr);
          return (
            <button
              key={preset.label}
              onClick={() => onChange(pr)}
              className="text-xs px-3 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap"
              style={{
                fontFamily: "var(--font-display)",
                background: active ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" : "var(--bg-700)",
                color:      active ? "#fff" : "var(--text-secondary)",
                border:     active ? "1px solid transparent" : "1px solid var(--border)",
                fontWeight: active ? 600 : 400,
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
