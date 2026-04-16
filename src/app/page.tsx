"use client";

import { useState, useCallback, useMemo } from "react";
import AddressInput     from "@/components/AddressInput";
import TransactionTable from "@/components/TransactionTable";
import LoadingSkeleton  from "@/components/LoadingSkeleton";
import DonationSection  from "@/components/DonationSection";
import DateFilter       from "@/components/DateFilter";
import SummaryStats     from "@/components/SummaryStats";
import { rowsToCsv }    from "@/lib/transform";
import {
  filterRowsByDateRange,
  computeSummary,
  buildCsvFilename,
  getDefaultRange,
  type DateRange,
} from "@/lib/date-utils";
import { type Lang, useTranslations } from "@/lib/i18n";
import type { CsvRow, ApiSuccessResponse, ApiErrorResponse } from "@/types";

// ─── State ────────────────────────────────────────────────────────────────
type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; rows: CsvRow[]; address: string; resolvedFrom?: string; total: number }
  | { status: "empty";   address: string; resolvedFrom?: string }
  | { status: "error";   message: string };

function downloadCsv(rows: CsvRow[], address: string, range: DateRange) {
  const csv  = rowsToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = buildCsvFilename(address, range);
  a.click();
  URL.revokeObjectURL(url);
}

async function copyCsvToClipboard(rows: CsvRow[]) {
  await navigator.clipboard.writeText(rowsToCsv(rows));
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [state,     setState]     = useState<AppState>({ status: "idle" });
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange());
  const [lang,      setLang]      = useState<Lang>("en");
  const [csvCopied, setCsvCopied] = useState(false);

  const t = useTranslations(lang);

  const handleSubmit = useCallback(async (input: string) => {
    setState({ status: "loading" });
    try {
      const res  = await fetch(`/api/transactions?address=${encodeURIComponent(input)}`);
      const data: ApiSuccessResponse | ApiErrorResponse = await res.json();
      if (!res.ok || "error" in data) {
        setState({ status: "error", message: ("error" in data ? data.error : null) ?? "Unknown error." });
        return;
      }
      if (data.rows.length === 0) {
        setState({ status: "empty", address: data.address, resolvedFrom: data.resolvedFrom });
        return;
      }
      setState({ status: "success", rows: data.rows, address: data.address, resolvedFrom: data.resolvedFrom, total: data.total });
    } catch {
      setState({ status: "error", message: lang === "es"
        ? "Error de red. Verifica tu conexión e intenta de nuevo."
        : "Network error. Please check your connection and try again." });
    }
  }, [lang]);

  const filteredRows = useMemo(() => {
    if (state.status !== "success") return [];
    return filterRowsByDateRange(state.rows, dateRange);
  }, [state, dateRange]);

  const summary    = useMemo(() => computeSummary(filteredRows), [filteredRows]);
  const hasResults = state.status === "success";
  const noInRange  = hasResults && filteredRows.length === 0;
  const isLoading  = state.status === "loading";

  async function handleCopyCsv() {
    await copyCsvToClipboard(filteredRows);
    setCsvCopied(true);
    setTimeout(() => setCsvCopied(false), 2500);
  }

  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={{ background: "var(--bg-base)", overflowX: "hidden" }}
    >
      {/* Ambient glow — pointer-events: none, won't affect layout */}
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 0, overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
          width: "min(900px, 150vw)", height: "700px",
          background: "radial-gradient(ellipse at center, rgba(249,115,22,0.07) 0%, transparent 70%)",
        }} />
      </div>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main
        className="relative flex-1 w-full max-w-3xl mx-auto px-4 py-12 sm:py-16 flex flex-col gap-8"
        style={{ zIndex: 1 }}
      >

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <header className="animate-fade-in">

          {/* Top bar — wraps on very small screens */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
            {/* Trust badge */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: "rgba(249,115,22,0.08)",
                border:     "1px solid rgba(249,115,22,0.2)",
                color:      "var(--brand)",
                fontFamily: "var(--font-display)",
                flexShrink: 0,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--brand)" }} />
              {t("trustBadge")}
            </div>

            {/* Language toggle */}
            <button
              onClick={() => setLang(l => l === "en" ? "es" : "en")}
              className="text-xs px-3 py-1.5 rounded-lg transition-all duration-150"
              style={{
                fontFamily: "var(--font-display)",
                background: "var(--bg-800)",
                border:     "1px solid var(--border)",
                color:      "var(--text-secondary)",
              }}
            >
              🌐 {t("language")}
            </button>
          </div>

          {/* Logo + H1 */}
          <div className="flex flex-col items-center text-center gap-4">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl glow-orange"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #c2410c 100%)", flexShrink: 0 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>

            <h1
              className="text-2xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1.15 }}
            >
              {t("heroH1")}
            </h1>

            <p
              className="text-sm sm:text-base max-w-sm leading-relaxed"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
            >
              {t("heroSub")}
            </p>
          </div>
        </header>

        {/* ── INPUT + DATE FILTER ────────────────────────────────────────── */}
        <section
          className="rounded-2xl p-4 sm:p-5 animate-slide-up flex flex-col gap-5"
          style={{ background: "var(--bg-800)", border: "1px solid var(--border)", animationDelay: "80ms" }}
        >
          <AddressInput onSubmit={handleSubmit} isLoading={isLoading} lang={lang} />
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <DateFilter range={dateRange} onChange={setDateRange} lang={lang} />
        </section>

        {/* ── LOADING ────────────────────────────────────────────────────── */}
        {isLoading && <LoadingSkeleton lang={lang} />}

        {/* ── ERROR ──────────────────────────────────────────────────────── */}
        {state.status === "error" && (
          <div className="rounded-xl p-4 animate-fade-in flex items-start gap-3"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
            role="alert"
          >
            <span className="text-lg mt-0.5 shrink-0">⚠️</span>
            <div className="min-w-0">
              <p className="font-semibold text-sm"
                style={{ color: "#f87171", fontFamily: "var(--font-display)" }}>
                {t("errorTitle")}
              </p>
              <p className="text-sm mt-1 break-words" style={{ color: "var(--text-secondary)" }}>
                {state.message}
              </p>
            </div>
          </div>
        )}

        {/* ── EMPTY ──────────────────────────────────────────────────────── */}
        {state.status === "empty" && (
          <div className="rounded-xl p-6 animate-fade-in text-center"
            style={{ background: "var(--bg-800)", border: "1px solid var(--border)" }}
            role="status"
          >
            <p className="text-3xl mb-3">📭</p>
            <p className="font-semibold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              {t("noTxFound")}
            </p>
            {state.resolvedFrom && (
              <p className="text-xs mt-1 break-all" style={{ color: "var(--text-muted)" }}>
                {t("resolved")}{" "}
                <span style={{ color: "var(--brand)", fontFamily: "var(--font-mono)" }}>
                  {state.resolvedFrom}
                </span>
              </p>
            )}
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              {t("noTxDesc")}
            </p>
          </div>
        )}

        {/* ── RESULTS ────────────────────────────────────────────────────── */}
        {hasResults && (
          <>
            {/* Transaction count row — stacks vertically on mobile */}
            <div className="animate-fade-in flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-2xl font-bold"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
                >
                  {filteredRows.length.toLocaleString()}
                </span>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {filteredRows.length === 1 ? t("txFoundSingle") : t("txFound")}
                </span>
                {state.resolvedFrom && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(249,115,22,0.1)", color: "var(--brand)", fontFamily: "var(--font-mono)" }}
                  >
                    {state.resolvedFrom}
                  </span>
                )}
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {state.total.toLocaleString()} {t("totalOnChain")}
              </span>
            </div>

            {/* Tax summary */}
            <SummaryStats summary={summary} lang={lang} />

            {/* Export bar */}
            <div
              className="rounded-xl p-4 animate-fade-in flex flex-col gap-3"
              style={{ background: "var(--bg-800)", border: "1px solid var(--border)" }}
            >
              {/* Buttons — each takes full width on mobile, auto on sm+ */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => downloadCsv(filteredRows, state.address, dateRange)}
                  disabled={noInRange}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                    color:      "#fff",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {t("downloadBtn")}
                </button>

                <button
                  onClick={handleCopyCsv}
                  disabled={noInRange}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-3 sm:py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: csvCopied ? "rgba(74,222,128,0.1)" : "var(--bg-700)",
                    border:     csvCopied ? "1px solid rgba(74,222,128,0.25)" : "1px solid var(--border)",
                    color:      csvCopied ? "#4ade80" : "var(--text-secondary)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {csvCopied ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {t("copiedBtn")}
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      {t("copyBtn")}
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                {t("compatNote")}
              </p>
            </div>

            {/* Empty range */}
            {noInRange ? (
              <div className="rounded-xl p-6 animate-fade-in text-center"
                style={{ background: "var(--bg-800)", border: "1px solid var(--border)" }}
                role="status"
              >
                <p className="text-3xl mb-3">🗓</p>
                <p className="font-semibold mb-1"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  {t("noTxInRange")}
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {t("noTxInRangeHint")}
                </p>
              </div>
            ) : (
              <TransactionTable rows={filteredRows} walletAddress={state.address} lang={lang} />
            )}

            <DonationSection lang={lang} />
          </>
        )}

        {/* ── IDLE ───────────────────────────────────────────────────────── */}
        {state.status === "idle" && (
          <>
            <HowItWorks lang={lang} />
            <WhyThisTool lang={lang} />
            <DonationSection lang={lang} />
          </>
        )}
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────────────────*/}
      <footer className="relative text-center py-6 px-4 text-xs"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", zIndex: 1, borderTop: "1px solid var(--border)" }}>
        <p>
          {t("footerText")}{" "}
          <a href="https://docs.hiro.so" target="_blank" rel="noopener noreferrer"
            className="hover:underline" style={{ color: "var(--brand)" }}>
            Hiro Systems
          </a>{" "}
          {t("footerSuffix")}
        </p>
      </footer>
    </div>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────
function HowItWorks({ lang }: { lang: Lang }) {
  const t     = useTranslations(lang);
  const steps = [
    { icon: "🔍", title: t("step1Title"), desc: t("step1Desc") },
    { icon: "⛓",  title: t("step2Title"), desc: t("step2Desc") },
    { icon: "📊", title: t("step3Title"), desc: t("step3Desc") },
  ];
  return (
    <section className="rounded-2xl p-5 animate-slide-up"
      style={{ background: "var(--bg-800)", border: "1px solid var(--border)", animationDelay: "160ms" }}>
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-4"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}>
        {t("howItWorks")}
      </h2>
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base"
              style={{ background: "var(--bg-700)" }}>
              {step.icon}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-sm"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                {step.title}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {step.desc}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ─── Why this tool ─────────────────────────────────────────────────────────
function WhyThisTool({ lang }: { lang: Lang }) {
  const t      = useTranslations(lang);
  const points = [t("why1"), t("why2"), t("why3")];
  const icons  = [
    <svg key="1" width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="4" rx="1" />
      <rect x="2" y="10" width="20" height="4" rx="1" />
      <rect x="2" y="17" width="20" height="4" rx="1" />
    </svg>,
    <svg key="2" width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>,
    <svg key="3" width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>,
  ];
  return (
    <section className="rounded-2xl p-5 animate-slide-up"
      style={{ background: "var(--bg-800)", border: "1px solid var(--border)", animationDelay: "240ms" }}>
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-4"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}>
        {t("whyTitle")}
      </h2>
      <ul className="space-y-3">
        {points.map((point, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(249,115,22,0.1)" }}>
              {icons[i]}
            </span>
            <p className="text-sm" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
              {point}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
