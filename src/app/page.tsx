"use client";

import { useState, useCallback, useMemo } from "react";
import AddressInput      from "@/components/AddressInput";
import TransactionTable  from "@/components/TransactionTable";
import LoadingSkeleton   from "@/components/LoadingSkeleton";
import DonationSection   from "@/components/DonationSection";
import DateFilter        from "@/components/DateFilter";
import SummaryStats      from "@/components/SummaryStats";
import { rowsToCsv }     from "@/lib/transform";
import {
  filterRowsByDateRange,
  computeSummary,
  buildCsvFilename,
  getDefaultRange,
  type DateRange,
} from "@/lib/date-utils";
import { type Lang, useTranslations } from "@/lib/i18n";
import type { CsvRow, ApiSuccessResponse, ApiErrorResponse } from "@/types";

// ─── App state ──────────────────────────────────────────────────────────────
type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      rows: CsvRow[];          // ALL fetched rows (unfiltered)
      address: string;
      resolvedFrom?: string;
      total: number;           // total on-chain txs
    }
  | { status: "empty"; address: string; resolvedFrom?: string }
  | { status: "error"; message: string };

// ─── CSV download ────────────────────────────────────────────────────────────
function downloadCsv(rows: CsvRow[], address: string, range: DateRange) {
  const csv      = rowsToCsv(rows);
  const blob     = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url      = URL.createObjectURL(blob);
  const filename = buildCsvFilename(address, range);
  const a        = document.createElement("a");
  a.href         = url;
  a.download     = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Home() {
  const [state,     setState]     = useState<AppState>({ status: "idle" });
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange());
  const [lang,      setLang]      = useState<Lang>("en");

  const t = useTranslations(lang);

  // ── Fetch handler ──────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (input: string) => {
    setState({ status: "loading" });

    try {
      const res  = await fetch(
        `/api/transactions?address=${encodeURIComponent(input)}`
      );
      const data: ApiSuccessResponse | ApiErrorResponse = await res.json();

      if (!res.ok || "error" in data) {
        setState({
          status:  "error",
          message: ("error" in data ? data.error : null) ?? "Unknown error.",
        });
        return;
      }

      if (data.rows.length === 0) {
        setState({
          status:       "empty",
          address:      data.address,
          resolvedFrom: data.resolvedFrom,
        });
        return;
      }

      setState({
        status:       "success",
        rows:         data.rows,
        address:      data.address,
        resolvedFrom: data.resolvedFrom,
        total:        data.total,
      });
    } catch {
      setState({
        status:  "error",
        message: lang === "es"
          ? "Error de red. Verifica tu conexión e intenta de nuevo."
          : "Network error. Please check your connection and try again.",
      });
    }
  }, [lang]);

  // ── Derived: filter rows by current date range ─────────────────────────
  // useMemo ensures this only re-runs when rows or dateRange changes
  const filteredRows = useMemo(() => {
    if (state.status !== "success") return [];
    return filterRowsByDateRange(state.rows, dateRange);
  }, [state, dateRange]);

  // ── Derived: summary stats from filtered rows ──────────────────────────
  const summary = useMemo(() => computeSummary(filteredRows), [filteredRows]);

  const isLoading   = state.status === "loading";
  const hasResults  = state.status === "success";
  const noInRange   = hasResults && filteredRows.length === 0;

  // ── Language toggle ────────────────────────────────────────────────────
  function toggleLang() {
    setLang((l) => (l === "en" ? "es" : "en"));
  }

  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Ambient radial glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          style={{
            position:   "absolute",
            top:        "-20%",
            left:       "50%",
            transform:  "translateX(-50%)",
            width:      "800px",
            height:     "600px",
            background: "radial-gradient(ellipse at center, rgba(249,115,22,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main
        className="relative flex-1 w-full max-w-3xl mx-auto px-4 py-12 sm:py-20 flex flex-col gap-8"
        style={{ zIndex: 1 }}
      >

        {/* ── Header ────────────────────────────────────────────────────── */}
        <header className="text-center animate-fade-in">
          {/* Language toggle */}
          <div className="flex justify-end mb-2">
            <button
              onClick={toggleLang}
              className="text-xs px-3 py-1.5 rounded-lg transition-all duration-150"
              style={{
                fontFamily: "var(--font-display)",
                background: "var(--bg-800)",
                border:     "1px solid var(--border)",
                color:      "var(--text-secondary)",
              }}
              aria-label="Toggle language"
            >
              {lang === "en" ? "🌐 ES" : "🌐 EN"}
            </button>
          </div>

          {/* Logo */}
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-6 glow-orange"
            style={{ background: "linear-gradient(135deg, #f97316 0%, #c2410c 100%)" }}
          >
            <svg
              width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>

          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Stacks CSV Exporter
          </h1>

          <p
            className="text-base max-w-md mx-auto leading-relaxed"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
          >
            Export your STX transactions to CSV — ready for{" "}
            <span style={{ color: "var(--brand)" }}>Koinly</span>,{" "}
            <span style={{ color: "var(--brand)" }}>CoinTracking</span>, and{" "}
            <span style={{ color: "var(--brand)" }}>Awaken</span>.
          </p>
        </header>

        {/* ── Input + Date filter card ───────────────────────────────────── */}
        <section
          className="rounded-2xl p-5 animate-slide-up flex flex-col gap-5"
          style={{
            background:     "var(--bg-800)",
            border:         "1px solid var(--border)",
            animationDelay: "80ms",
          }}
        >
          {/* Address input */}
          <AddressInput
            onSubmit={handleSubmit}
            isLoading={isLoading}
            lang={lang}
          />

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--border)" }} />

          {/* Date filter — always visible so users can set range before fetching */}
          <DateFilter
            range={dateRange}
            onChange={setDateRange}
            lang={lang}
          />
        </section>

        {/* ── Loading ───────────────────────────────────────────────────── */}
        {state.status === "loading" && <LoadingSkeleton lang={lang} />}

        {/* ── API Error ─────────────────────────────────────────────────── */}
        {state.status === "error" && (
          <div
            className="rounded-xl p-4 animate-fade-in flex items-start gap-3"
            style={{
              background: "rgba(239,68,68,0.08)",
              border:     "1px solid rgba(239,68,68,0.25)",
            }}
            role="alert"
          >
            <span className="text-lg mt-0.5">⚠️</span>
            <div>
              <p
                className="font-semibold text-sm"
                style={{ color: "#f87171", fontFamily: "var(--font-display)" }}
              >
                {t("errorTitle")}
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                {state.message}
              </p>
            </div>
          </div>
        )}

        {/* ── Empty: address has no STX transfers at all ─────────────────── */}
        {state.status === "empty" && (
          <div
            className="rounded-xl p-6 animate-fade-in text-center"
            style={{ background: "var(--bg-800)", border: "1px solid var(--border)" }}
            role="status"
          >
            <p className="text-3xl mb-3">📭</p>
            <p
              className="font-semibold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
            >
              {t("noTxFound")}
            </p>
            {state.resolvedFrom && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {t("resolved")}{" "}
                <span style={{ color: "var(--brand)", fontFamily: "var(--font-mono)" }}>
                  {state.resolvedFrom}
                </span>{" "}
                →{" "}
                <span style={{ fontFamily: "var(--font-mono)" }}>
                  {state.address}
                </span>
              </p>
            )}
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {t("noTxDesc")}
            </p>
          </div>
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {hasResults && (
          <>
            {/* Stats bar: total fetched vs on-chain + BNS resolved */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl animate-fade-in"
              style={{ background: "var(--bg-800)", border: "1px solid var(--border)" }}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-4">
                  <StatPill label={t("stxTransfersStat")} value={state.rows.length} />
                  <div style={{ width: "1px", height: "24px", background: "var(--border)" }} />
                  <StatPill label={t("totalOnChain")} value={state.total} />
                </div>
                {state.resolvedFrom && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {t("resolved")}{" "}
                    <span style={{ color: "var(--brand)", fontFamily: "var(--font-mono)" }}>
                      {state.resolvedFrom}
                    </span>{" "}
                    →{" "}
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)", fontSize: "11px" }}>
                      {state.address.slice(0, 12)}…
                    </span>
                  </p>
                )}
              </div>

              {/* Download button — disabled if no filtered rows */}
              <button
                onClick={() =>
                  downloadCsv(filteredRows, state.address, dateRange)
                }
                disabled={noInRange}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  color:      "#fff",
                  fontFamily: "var(--font-display)",
                }}
                aria-label={t("downloadCsv")}
              >
                <svg
                  width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {t("downloadCsv")}
              </button>
            </div>

            {/* Summary stats for the filtered range */}
            <SummaryStats summary={summary} lang={lang} />

            {/* Empty range state */}
            {noInRange ? (
              <div
                className="rounded-xl p-6 animate-fade-in text-center"
                style={{ background: "var(--bg-800)", border: "1px solid var(--border)" }}
                role="status"
              >
                <p className="text-3xl mb-3">🗓</p>
                <p
                  className="font-semibold"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
                >
                  {t("noTxInRange")}
                </p>
              </div>
            ) : (
              <TransactionTable
                rows={filteredRows}
                walletAddress={state.address}
                lang={lang}
              />
            )}
          </>
        )}

        {/* ── How it works (idle only) ───────────────────────────────────── */}
        {state.status === "idle" && <HowItWorks lang={lang} />}

        {/* ── Donation ──────────────────────────────────────────────────── */}
        <DonationSection lang={lang} />
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="relative text-center py-6 text-xs"
        style={{
          color:     "var(--text-muted)",
          fontFamily: "var(--font-body)",
          zIndex:    1,
          borderTop: "1px solid var(--border)",
        }}
      >
        <p>
          {t("footerText")}{" "}
          <a
            href="https://docs.hiro.so"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: "var(--brand)" }}
          >
            Hiro Systems
          </a>{" "}
          {t("footerSuffix")}
        </p>
      </footer>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p
        className="text-xs"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
      >
        {label}
      </p>
      <p
        className="text-lg font-bold"
        style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function HowItWorks({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);
  const steps = [
    { icon: "🔍", titleKey: "step1Title" as const, descKey: "step1Desc" as const },
    { icon: "⛓",  titleKey: "step2Title" as const, descKey: "step2Desc" as const },
    { icon: "📊", titleKey: "step3Title" as const, descKey: "step3Desc" as const },
  ];

  return (
    <section
      className="rounded-2xl p-5 animate-slide-up"
      style={{
        background:     "var(--bg-800)",
        border:         "1px solid var(--border)",
        animationDelay: "160ms",
      }}
      aria-label={t("howItWorks")}
    >
      <h2
        className="text-xs font-semibold uppercase tracking-widest mb-4"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}
      >
        {t("howItWorks")}
      </h2>
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base"
              style={{ background: "var(--bg-700)" }}
            >
              {step.icon}
            </span>
            <div>
              <p
                className="font-semibold text-sm"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
              >
                {t(step.titleKey)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {t(step.descKey)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
