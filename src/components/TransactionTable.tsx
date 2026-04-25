"use client";

import type { CsvRow } from "@/types";
import { type Lang, useTranslations } from "@/lib/i18n";

interface TransactionTableProps {
  rows:          CsvRow[];
  walletAddress: string;
  lang:          Lang;
}

const PREVIEW_COUNT = 10;

/**
 * Format an ISO timestamp for display in the preview table.
 *
 * Shows: "Jan 15, 2024, 14:32:08 UTC"
 *
 * Why UTC + seconds:
 *   - Stacks blockchain timestamps are in UTC (ISO 8601)
 *   - Showing in user's local time creates inconsistency between users
 *   - Tax tools expect UTC; matching that here avoids confusion
 *   - Including seconds shows post-Nakamoto precision (~5s blocks)
 *
 * Pre-Nakamoto txs share the Bitcoin anchor block timestamp (~10min granularity),
 * so multiple txs in the same Stacks block will show identical timestamps.
 * That's the actual on-chain truth, not a display bug.
 */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;

    const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    const day   = d.getUTCDate();
    const year  = d.getUTCFullYear();
    const hh    = String(d.getUTCHours()).padStart(2, "0");
    const mm    = String(d.getUTCMinutes()).padStart(2, "0");
    const ss    = String(d.getUTCSeconds()).padStart(2, "0");

    return `${month} ${day}, ${year}, ${hh}:${mm}:${ss} UTC`;
  } catch {
    return iso;
  }
}

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function DirectionBadge({ row, lang }: { row: CsvRow; lang: Lang }) {
  const t         = useTranslations(lang);
  const isReceive = !!row.receivedAmount;
  const isSend    = !!row.sentAmount;
  if (isReceive && isSend) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap"
      style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc" }}>↔ {t("dirSelf")}</span>
  );
  if (isReceive) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap"
      style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>↓ {t("dirReceived")}</span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap"
      style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>↑ {t("dirSent")}</span>
  );
}

export default function TransactionTable({ rows, walletAddress, lang }: TransactionTableProps) {
  const t       = useTranslations(lang);
  const preview = rows.slice(0, PREVIEW_COUNT);
  const hasMore = rows.length > PREVIEW_COUNT;

  return (
    <section className="animate-slide-up" aria-label="Transaction preview">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)" }}>
          {t("previewTitle")}
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full ml-2"
          style={{ background: "var(--bg-700)", color: "var(--text-secondary)", flexShrink: 0 }}>
          {rows.length} {rows.length === 1 ? t("stxTransfers") : t("stxTransfersP")}
        </span>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="table-wrapper" style={{ background: "var(--bg-900)" }}>
          <table className="w-full text-xs" style={{ minWidth: "520px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {[t("colDate"), t("colDirection"), t("colAmount"), t("colFee"), t("colHash")].map((h) => (
                  <th key={h}
                    className="px-3 sm:px-4 py-3 text-left font-medium tracking-wide whitespace-nowrap"
                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={row.txHash + i}
                  className="transition-colors duration-100"
                  style={{ borderBottom: i < preview.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-800)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-3 sm:px-4 py-3 whitespace-nowrap"
                    style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    {formatDate(row.date)}
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <DirectionBadge row={row} lang={lang} />
                  </td>
                  <td className="px-3 sm:px-4 py-3 whitespace-nowrap"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    {row.receivedAmount || row.sentAmount || "—"}
                  </td>
                  <td className="px-3 sm:px-4 py-3 whitespace-nowrap"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                    {row.feeAmount || "—"}
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <a href={`https://explorer.hiro.so/txid/${row.txHash}`}
                      target="_blank" rel="noopener noreferrer"
                      className="hover:underline transition-colors whitespace-nowrap"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--brand)" }}
                      title={row.txHash}>
                      {truncateHash(row.txHash)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <p className="mt-2 text-xs text-center" style={{ color: "var(--text-muted)" }}>
          {t("showingOf")} {PREVIEW_COUNT} {t("showingOf2")} {rows.length} {t("showingOf3")}
        </p>
      )}
    </section>
  );
}
