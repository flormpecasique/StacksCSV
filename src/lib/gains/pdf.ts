/**
 * pdf.ts
 *
 * Renders a TaxReportDoc to a PDF entirely in the browser (privacy-first: no data
 * leaves the device). jsPDF + autotable are loaded with dynamic import(), so they
 * are NOT in your main bundle — they load only when the user generates a report.
 */
import type { TaxReportDoc, ReportTable } from "./report-builder";

const MARGIN = 40;
const ACCENT: [number, number, number] = [34, 40, 49];
const MUTED: [number, number, number] = [120, 120, 120];

/** Build the PDF and return it as a Blob. Works in browser and Node. */
export async function generateTaxReportPdf(doc: TaxReportDoc): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  let y = MARGIN;

  const ensure = (needed: number) => {
    if (y + needed > pageH - MARGIN - 24) { pdf.addPage(); y = MARGIN; }
  };

  // ---- Header ----
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(15); pdf.setTextColor(0);
  pdf.text(doc.header.title, MARGIN, y); y += 16;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(...MUTED);
  pdf.text(doc.header.subtitle, MARGIN, y); y += 16;
  pdf.setTextColor(0); pdf.setFontSize(9);
  for (const f of doc.header.fields) {
    ensure(13);
    pdf.setFont("helvetica", "bold"); pdf.text(`${f.label}: `, MARGIN, y);
    const w = pdf.getTextWidth(`${f.label}: `);
    pdf.setFont("helvetica", "normal"); pdf.text(f.value, MARGIN + w, y);
    y += 13;
  }
  y += 8;

  const sectionTitle = (title: string) => {
    ensure(24);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(...ACCENT);
    pdf.text(title, MARGIN, y); y += 6;
    pdf.setDrawColor(...ACCENT); pdf.setLineWidth(0.6); pdf.line(MARGIN, y, MARGIN + contentW, y);
    y += 10; pdf.setTextColor(0);
  };

  const table = (t: ReportTable, leftAlignCols: number) => {
    const columnStyles: Record<number, { halign: "left" | "right" | "center" }> = {};
    for (let i = 0; i < t.columns.length; i++) columnStyles[i] = { halign: i < leftAlignCols ? "left" : "right" };
    autoTable(pdf, {
      startY: y,
      head: [t.columns],
      body: t.rows.length ? t.rows : [t.columns.map(() => "—")],
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [246, 247, 249] },
      columnStyles,
      theme: "striped",
    });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  };

  // ---- Summary (label | value) ----
  sectionTitle(doc.labels.summary);
  table({ columns: ["", ""], rows: doc.summary.map((r) => [r.label, r.value]) }, 1);

  // ---- By year / by asset ----
  sectionTitle(doc.labels.byYear);
  table(doc.byYear, 1);

  sectionTitle(doc.labels.byAsset);
  table(doc.byAsset, 1);

  // ---- Disposals detail ----
  sectionTitle(doc.labels.disposals);
  table(doc.disposals, 2); // date + asset are left-aligned

  // ---- Income ----
  if (doc.income) {
    sectionTitle(doc.labels.income);
    table(doc.income, 2);
  }

  // ---- Review ----
  sectionTitle(doc.labels.review);
  pdf.setFontSize(9);
  if (doc.review.length === 0) {
    ensure(14); pdf.setTextColor(...MUTED); pdf.text(doc.labels.reviewEmpty, MARGIN, y); y += 14; pdf.setTextColor(0);
  } else {
    for (const line of doc.review) {
      const wrapped = pdf.splitTextToSize(`• ${line}`, contentW) as string[];
      ensure(wrapped.length * 12 + 2);
      pdf.text(wrapped, MARGIN, y); y += wrapped.length * 12 + 2;
    }
  }
  y += 6;

  // ---- Notes ----
  sectionTitle(doc.labels.notesTitle);
  pdf.setFontSize(9);
  for (const note of doc.notes) {
    const wrapped = pdf.splitTextToSize(`• ${note}`, contentW) as string[];
    ensure(wrapped.length * 12 + 2);
    pdf.text(wrapped, MARGIN, y); y += wrapped.length * 12 + 2;
  }
  y += 6;

  // ---- Disclaimer ----
  sectionTitle(doc.labels.disclaimerTitle);
  pdf.setFontSize(8); pdf.setTextColor(...MUTED);
  const disc = pdf.splitTextToSize(doc.disclaimer, contentW) as string[];
  ensure(disc.length * 11 + 2);
  pdf.text(disc, MARGIN, y); y += disc.length * 11;
  pdf.setTextColor(0);

  // ---- Footer: page numbers on every page ----
  const total = pdf.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    pdf.setFontSize(8); pdf.setTextColor(...MUTED);
    pdf.text(`${doc.labels.page} ${p} / ${total}`, pageW - MARGIN, pageH - MARGIN + 12, { align: "right" });
    pdf.setTextColor(0);
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
