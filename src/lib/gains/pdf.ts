/**
 * pdf.ts
 *
 * Renders a TaxReportDoc to a clean, minimalist PDF entirely in the browser
 * (privacy-first: no data leaves the device). jsPDF + autotable are loaded with
 * dynamic import(), so they are NOT in the main bundle — they load only when the
 * user generates a report.
 */
import type { TaxReportDoc, ReportTable } from "./report-builder";

// ── Design tokens ────────────────────────────────────────────────────────────
const MARGIN = 48;
const INK: [number, number, number] = [24, 24, 27];       // near-black
const MUTED: [number, number, number] = [113, 113, 122];  // zinc-500
const FAINT: [number, number, number] = [228, 228, 231];  // hairlines
const ALT: [number, number, number] = [250, 250, 251];    // subtle row tint
const POS: [number, number, number] = [21, 128, 61];      // gain (green)
const NEG: [number, number, number] = [190, 42, 42];      // loss (red)
const BRAND = "STACKSCSV";

export async function generateTaxReportPdf(doc: TaxReportDoc): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  let y = MARGIN;

  const setColor = (c: [number, number, number]) => pdf.setTextColor(c[0], c[1], c[2]);
  const ensure = (need: number) => { if (y + need > pageH - MARGIN - 16) { pdf.addPage(); y = MARGIN; } };
  const rule = (yy: number, color = FAINT, w = 0.75) => {
    pdf.setDrawColor(color[0], color[1], color[2]); pdf.setLineWidth(w);
    pdf.line(MARGIN, yy, MARGIN + contentW, yy);
  };
  const spaced = (text: string, x: number, yy: number, gap = 0.8) => {
    pdf.setCharSpace(gap); pdf.text(text, x, yy); pdf.setCharSpace(0);
  };

  // ── Header ─────────────────────────────────────────────────────────────────
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); setColor(MUTED);
  spaced(BRAND, MARGIN, y, 1.5); y += 16;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(17); setColor(INK);
  pdf.text(doc.header.title, MARGIN, y); y += 15;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); setColor(MUTED);
  pdf.text(doc.header.subtitle, MARGIN, y); y += 14;

  // Meta as one compact muted line: "label value · label value · ..."
  pdf.setFontSize(8.5);
  const metaParts = doc.header.fields.map((f) => `${f.label}: ${f.value}`);
  const metaLines = pdf.splitTextToSize(metaParts.join("   ·   "), contentW) as string[];
  setColor(MUTED); pdf.text(metaLines, MARGIN, y); y += metaLines.length * 12 + 6;
  rule(y); y += 20;

  // ── Section title helper ─────────────────────────────────────────────────────
  const section = (title: string) => {
    ensure(34);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); setColor(MUTED);
    spaced(title.toUpperCase(), MARGIN, y, 0.8); y += 8;
    rule(y); y += 14; setColor(INK);
  };

  // ── Table helper (dark minimal header, plain body) ───────────────────────────
  const table = (t: ReportTable, leftAlignCols: number) => {
    const columnStyles: Record<number, { halign: "left" | "right" }> = {};
    for (let i = 0; i < t.columns.length; i++) columnStyles[i] = { halign: i < leftAlignCols ? "left" : "right" };
    autoTable(pdf, {
      startY: y,
      head: [t.columns],
      body: t.rows.length ? t.rows : [t.columns.map(() => "—")],
      margin: { left: MARGIN, right: MARGIN },
      styles: { font: "helvetica", fontSize: 8, textColor: INK, cellPadding: { top: 4.5, bottom: 4.5, left: 7, right: 7 }, lineWidth: 0, overflow: "linebreak" },
      headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5, cellPadding: { top: 5, bottom: 5, left: 7, right: 7 } },
      alternateRowStyles: { fillColor: ALT },
      columnStyles,
      theme: "plain",
    });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  };

  // ── Summary as a stat row (hero) ─────────────────────────────────────────────
  const stats = doc.summary;
  const perRow = stats.length <= 4 ? stats.length : 3;
  const colW = contentW / perRow;
  ensure(52);
  for (let i = 0; i < stats.length; i++) {
    const col = i % perRow;
    if (col === 0 && i > 0) y += 46;
    const x = MARGIN + col * colW;
    const s = stats[i];
    const isNet = s.label === doc.labels.netGain;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); setColor(MUTED);
    spaced(s.label.toUpperCase(), x, y + 2, 0.5);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(isNet ? 15 : 12);
    if (isNet) setColor(s.value.trim().startsWith("-") ? NEG : POS); else setColor(INK);
    pdf.text(s.value, x, y + 20);
  }
  y += 46; setColor(INK);
  y += 8; rule(y, FAINT, 0.5); y += 22;

  // ── Breakdown tables ─────────────────────────────────────────────────────────
  section(doc.labels.byYear); table(doc.byYear, 1);
  section(doc.labels.byAsset); table(doc.byAsset, 1);
  section(doc.labels.disposals); table(doc.disposals, 2);
  if (doc.income) { section(doc.labels.income); table(doc.income, 2); }

  // ── Review (grouped + de-duplicated) ─────────────────────────────────────────
  section(doc.labels.review);
  if (doc.review.length === 0) {
    ensure(14); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); setColor(MUTED);
    pdf.text(doc.labels.reviewEmpty, MARGIN, y); y += 14; setColor(INK);
  } else {
    for (const g of doc.review) {
      ensure(30);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); setColor(INK);
      pdf.text(`${g.title}  (${g.items.length})`, MARGIN, y); y += 12;
      if (g.help) {
        pdf.setFont("helvetica", "italic"); pdf.setFontSize(7.5); setColor(MUTED);
        const help = pdf.splitTextToSize(g.help, contentW) as string[];
        ensure(help.length * 10); pdf.text(help, MARGIN, y); y += help.length * 10 + 2;
      }
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); setColor(INK);
      const line = g.items.join("   ·   ");
      const wrapped = pdf.splitTextToSize(line, contentW - 8) as string[];
      ensure(wrapped.length * 11 + 8);
      pdf.text(wrapped, MARGIN + 8, y); y += wrapped.length * 11 + 12;
    }
  }
  y += 4;

  // ── Notes ────────────────────────────────────────────────────────────────────
  section(doc.labels.notesTitle);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); setColor(INK);
  for (const note of doc.notes) {
    const wrapped = pdf.splitTextToSize(`•  ${note}`, contentW) as string[];
    ensure(wrapped.length * 11 + 3); pdf.text(wrapped, MARGIN, y); y += wrapped.length * 11 + 4;
  }
  y += 6;

  // ── Disclaimer ────────────────────────────────────────────────────────────────
  section(doc.labels.disclaimerTitle);
  pdf.setFont("helvetica", "italic"); pdf.setFontSize(7.5); setColor(MUTED);
  const disc = pdf.splitTextToSize(doc.disclaimer, contentW) as string[];
  ensure(disc.length * 10); pdf.text(disc, MARGIN, y); y += disc.length * 10;
  setColor(INK);

  // ── Footer on every page: brand + page numbers ───────────────────────────────
  const total = pdf.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    const fy = pageH - MARGIN + 16;
    rule(fy - 10, FAINT, 0.5);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); setColor(MUTED);
    spaced(BRAND, MARGIN, fy, 1.2);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${doc.labels.page} ${p} / ${total}`, pageW - MARGIN, fy, { align: "right" });
    setColor(INK);
  }

  return pdf.output("blob");
}

/** Browser helper: generate and trigger a download. */
export async function downloadTaxReportPdf(doc: TaxReportDoc, filename = "informe-fiscal.pdf"): Promise<void> {
  const blob = await generateTaxReportPdf(doc);
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
