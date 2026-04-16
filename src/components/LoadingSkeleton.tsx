import { type Lang, useTranslations } from "@/lib/i18n";

export default function LoadingSkeleton({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);

  return (
    <div
      className="animate-fade-in space-y-3"
      aria-busy="true"
      aria-label={t("loadingText")}
    >
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-4 h-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          style={{ color: "var(--brand)" }}
        >
          <circle
            cx="12" cy="12" r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="40 24"
          />
        </svg>
        <span
          className="text-sm"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
        >
          {t("loadingText")}
        </span>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        <div
          className="grid grid-cols-5 gap-4 px-4 py-3"
          style={{
            borderBottom: "1px solid var(--border)",
            background:   "var(--bg-900)",
          }}
        >
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-3 rounded skeleton" style={{ width: "60%" }} />
          ))}
        </div>

        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-5 gap-4 px-4 py-3"
            style={{
              borderBottom: i < 5 ? "1px solid var(--border)" : "none",
              background:   "var(--bg-900)",
            }}
          >
            <div className="h-3 rounded skeleton" style={{ width: "80%" }} />
            <div className="h-5 w-20 rounded-md skeleton" />
            <div className="h-3 rounded skeleton" style={{ width: "50%" }} />
            <div className="h-3 rounded skeleton" style={{ width: "40%" }} />
            <div className="h-3 rounded skeleton" style={{ width: "70%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
