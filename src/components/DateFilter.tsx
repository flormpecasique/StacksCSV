"use client";

import {
  getThisYearRange,
  getLastYearRange,
  getLast30DaysRange,
  type DateRange,
} from "@/lib/date-utils";
import { type Lang, useTranslations } from "@/lib/i18n";

interface DateFilterProps {
  range: DateRange;
  onChange: (range: DateRange) => void;
  lang: Lang;
}

export default function DateFilter({ range, onChange, lang }: DateFilterProps) {
  const t = useTranslations(lang);

  // Quick-select presets
  const presets = [
    { label: t("thisYear"),   getRange: getThisYearRange   },
    { label: t("lastYear"),   getRange: getLastYearRange   },
    { label: t("last30Days"), getRange: getLast30DaysRange },
  ];

  function isActivePreset(presetRange: DateRange) {
    return range.from === presetRange.from && range.to === presetRange.to;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Label */}
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}
      >
        {t("filterTitle")}
      </p>

      {/* Date inputs row */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* From */}
        <div className="flex-1 flex flex-col gap-1">
          <label
            className="text-xs"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
          >
            {t("from")}
          </label>
          <input
            type="date"
            value={range.from}
            max={range.to || undefined}
            onChange={(e) => onChange({ ...range, from: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background:   "var(--bg-700)",
              border:       "1px solid var(--border)",
              color:        "var(--text-primary)",
              fontFamily:   "var(--font-mono)",
              colorScheme:  "dark",
              outline:      "none",
            }}
          />
        </div>

        {/* Separator */}
        <div
          className="hidden sm:flex items-end pb-2 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          →
        </div>

        {/* To */}
        <div className="flex-1 flex flex-col gap-1">
          <label
            className="text-xs"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
          >
            {t("to")}
          </label>
          <input
            type="date"
            value={range.to}
            min={range.from || undefined}
            onChange={(e) => onChange({ ...range, to: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background:   "var(--bg-700)",
              border:       "1px solid var(--border)",
              color:        "var(--text-primary)",
              fontFamily:   "var(--font-mono)",
              colorScheme:  "dark",
              outline:      "none",
            }}
          />
        </div>
      </div>

      {/* Quick-select preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const presetRange = preset.getRange();
          const active = isActivePreset(presetRange);
          return (
            <button
              key={preset.label}
              onClick={() => onChange(presetRange)}
              className="text-xs px-3 py-1.5 rounded-lg transition-all duration-150"
              style={{
                fontFamily: "var(--font-display)",
                background: active
                  ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                  : "var(--bg-700)",
                color: active ? "#fff" : "var(--text-secondary)",
                border: active
                  ? "1px solid transparent"
                  : "1px solid var(--border)",
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
