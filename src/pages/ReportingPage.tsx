import { useState, useEffect } from "react";
import PageShell from "../components/PageShell";
import api from "../data/api";
import { SlPrinter } from "react-icons/sl";
import { MdOutlineEmail } from "react-icons/md";
import TimeFrameSelector from "../components/TimeFrameSelector";
import EmailReportModal from "../components/EmailReportModal";
import { useBuilding } from "../context/BuildingContext";

// ─── Server-computed report contract (mirrors @coolsync/types BuiltInReport) ──

type ReportType = "filter" | "inventory";
type ReportTone = "danger" | "success";
type ReportCell = { text: string; tone?: ReportTone };
type ReportRow = { cells: ReportCell[] };
type ReportSection = { title: string; columns: string[]; rows: ReportRow[] };
type BuiltInReport = {
  reportType: ReportType;
  title: string;
  buildingName: string;
  dateRange: string;
  sections: ReportSection[];
  summary: string[];
};

const PDF_HEAD_STYLES = { fillColor: [37, 99, 235] as [number, number, number] };
const PDF_STYLES = { fontSize: 9, cellPadding: 3 };
const PDF_ALT_ROW = { fillColor: [245, 247, 250] as [number, number, number] };

function toneColor(tone?: ReportTone) {
  if (tone === "danger") return "var(--danger)";
  if (tone === "success") return "var(--success)";
  return "var(--text-primary)";
}

// ─── Internal render components ─────────────────────────────────────────────

function ReportSectionView({ section, emptyMessage = "No records in this period." }: { section: ReportSection; emptyMessage?: string }) {
  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <p style={{ margin: "0 0 0.5rem", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {section.title}
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
        <thead>
          <tr>
            {section.columns.map((col) => (
              <th key={col} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.rows.length === 0 ? (
            <tr>
              <td colSpan={section.columns.length} style={{ padding: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center" }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            section.rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? "var(--bg-subtle)" : "transparent" }}>
                {row.cells.map((cell, ci) => (
                  <td key={ci} style={{ padding: "0.55rem 0.75rem", textAlign: "left", color: toneColor(cell.tone), borderBottom: "1px solid var(--border)" }}>
                    {cell.text ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginTop: "0.5rem" }}>
      <p style={{ margin: "0 0 0.5rem", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {title}
      </p>
      <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        {items.map((item, i) => (
          <li key={i} style={{ color: "var(--text-primary)", fontSize: "0.9rem" }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ReportCard({ title, buildingName, children, onExport, onEmail, lowStockCount = 0 }: {
  title: string; buildingName: string; children: React.ReactNode;
  onExport: () => void; onEmail: () => void; lowStockCount?: number;
}) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="inventory-item" style={{ flexDirection: "column", alignItems: "stretch", gap: "1.5rem", padding: "1.5rem", marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: "0 0 0.2rem", color: "var(--text-primary)", fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            {title}
            {lowStockCount > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--danger)", color: "#fff", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, minWidth: "1.4em", height: "1.4em", padding: "0 0.35em", lineHeight: 1 }}>
                {lowStockCount}
              </span>
            )}
          </h2>
          {buildingName && <p style={{ margin: "0 0 0.1rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>{buildingName}</p>}
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.8rem" }}>{today}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--text-muted)" }}>NJ Filters</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={onExport}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                padding: "0.45rem 0.9rem", fontSize: "0.82rem", fontWeight: 600,
                borderRadius: "999px", border: "1px solid var(--border-strong)",
                background: "transparent", color: "var(--text-primary)",
                cursor: "pointer", fontFamily: "inherit",
                transition: "background 0.12s, border-color 0.12s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--accent-sub)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <SlPrinter size={13} /> Export PDF
            </button>
            <button
              onClick={onEmail}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                padding: "0.45rem 0.9rem", fontSize: "0.82rem", fontWeight: 600,
                borderRadius: "999px", border: "none",
                background: "var(--text-primary)", color: "var(--bg-base)",
                cursor: "pointer", fontFamily: "inherit",
                transition: "opacity 0.12s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.82"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <MdOutlineEmail size={13} /> Email
            </button>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

// Number of inventory rows flagged as not-OK (status cell carries the "danger" tone).
function lowStockCountOf(report: BuiltInReport | null): number {
  const levels = report?.sections.find((s) => s.title === "Current Inventory Levels");
  if (!levels) return 0;
  return levels.rows.filter((r) => r.cells[r.cells.length - 1]?.tone === "danger").length;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ReportingPage() {
  const { activeBuilding } = useBuilding();

  const [filterReport, setFilterReport] = useState<BuiltInReport | null>(null);
  const [inventoryReport, setInventoryReport] = useState<BuiltInReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Time-frame state — default 1 month back to today
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d; });
  const [dateTo, setDateTo] = useState(() => new Date());

  // Email modal state
  const [emailModal, setEmailModal] = useState<{ reportType: string; getPdfBase64: () => Promise<string> } | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const today = new Date().toLocaleDateString();
  const selectedBuildingName = activeBuilding?.name ?? "";

  function handleTimeFrameChange({ dateFrom: f, dateTo: t }: { dateFrom: Date; dateTo: Date }) {
    setDateFrom(f);
    setDateTo(t);
  }

  // Fetch both server-computed reports when the building or date range changes.
  useEffect(() => {
    if (!activeBuilding) { setLoading(false); return; }
    let mounted = true;
    const params = { buildingId: activeBuilding.buildingId, from: dateFrom.toISOString(), to: dateTo.toISOString() };
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<BuiltInReport>("/reports/built-in/filter", { params }),
      api.get<BuiltInReport>("/reports/built-in/inventory", { params }),
    ])
      .then(([f, i]) => {
        if (!mounted) return;
        setFilterReport(f.data);
        setInventoryReport(i.data);
      })
      .catch((err) => {
        if (mounted) setError("Failed to load report data. " + (err?.message ?? ""));
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [activeBuilding, dateFrom, dateTo]);

  // ─── PDF export (generic — renders any BuiltInReport) ────────────────────

  async function loadPdfLibs() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    return { jsPDF, autoTable };
  }

  async function buildReportPdfDoc(report: BuiltInReport) {
    const { jsPDF, autoTable } = await loadPdfLibs();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18).setFont(doc.getFont().fontName, "bold").text(report.title, 14, 20);
    doc.setFontSize(11).setFont(doc.getFont().fontName, "normal").text(report.buildingName, 14, 29);
    doc.setFontSize(9).text(`${today}  |  ${report.dateRange}`, 14, 36);
    doc.setFontSize(11).setFont(doc.getFont().fontName, "bold").text("NJ Filters", pageWidth - 14, 20, { align: "right" });

    let y = 44;
    report.sections.forEach((section, idx) => {
      if (idx > 0) y = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(10).setFont(doc.getFont().fontName, "bold").text(section.title, 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [section.columns],
        body: section.rows.length > 0
          ? section.rows.map((r) => r.cells.map((c) => c.text))
          : [["No records in this period.", ...Array(Math.max(section.columns.length - 1, 0)).fill("")]],
        headStyles: PDF_HEAD_STYLES,
        styles: PDF_STYLES,
        alternateRowStyles: PDF_ALT_ROW,
      });
    });

    y = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(10).setFont(doc.getFont().fontName, "bold").text(`Summary (${report.dateRange})`, 14, y);
    report.summary.forEach((line, i) => {
      doc.setFontSize(9).setFont(doc.getFont().fontName, "normal").text(`• ${line}`, 18, y + 8 + i * 6);
    });

    return doc;
  }

  async function exportPDF(report: BuiltInReport) {
    setPdfError(null);
    try {
      const doc = await buildReportPdfDoc(report);
      doc.save(`${report.title.replace(/\s+/g, "")}_${selectedBuildingName}_${today}.pdf`);
    } catch (err) {
      setPdfError(err instanceof Error ? `Failed to export PDF: ${err.message}` : "Failed to generate PDF. Please try again.");
    }
  }

  function emailHandler(report: BuiltInReport, label: string) {
    return () => setEmailModal({
      reportType: label,
      getPdfBase64: async () => {
        const dataUri = (await buildReportPdfDoc(report)).output("datauristring");
        const parts = dataUri.split(",");
        if (parts.length < 2) throw new Error("Failed to encode PDF.");
        return parts[1];
      },
    });
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (!activeBuilding) {
    return (
      <PageShell>
        <div style={{ width: "100%", maxWidth: 960 }}>
          <h1 style={{ color: "var(--text-primary)", margin: "0 0 0.5rem" }}>Reports</h1>
          <p style={{ color: "var(--text-muted)" }}>Select a building from the sidebar to view reports.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={{ width: "100%", maxWidth: 960 }}>

          {/* Page header */}
          <div style={{ marginBottom: "1.75rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <h1 style={{ color: "var(--text-primary)", margin: "0 0 0.2rem" }}>Reports</h1>
              <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>Filter activity and inventory reporting.</p>
            </div>
            {/* Period selector */}
            <div style={{ padding: "0.6rem 0.85rem", background: "var(--bg-subtle)", borderRadius: "0.6rem", border: "1px solid var(--border)" }}>
              <TimeFrameSelector dateFrom={dateFrom} dateTo={dateTo} onChange={handleTimeFrameChange} />
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="alert alert--danger" style={{ marginBottom: "1.5rem" }}>
              <span className="alert__icon">!</span>
              <span className="alert__body">
                <span className="alert__title">Error loading data</span>
                {error}
              </span>
            </div>
          )}
          {pdfError && (
            <div className="alert alert--danger alert--inline" style={{ marginBottom: "1rem" }}>{pdfError}</div>
          )}

          {loading && !filterReport && !inventoryReport ? (
            <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>Loading report data...</p>
          ) : (
            <>
              {/* ── Filter Activity Report ── */}
              {filterReport && (
                <ReportCard
                  title={filterReport.title}
                  buildingName={filterReport.buildingName || selectedBuildingName}
                  onExport={() => exportPDF(filterReport)}
                  onEmail={emailHandler(filterReport, "Filter Activity")}
                >
                  {filterReport.sections.map((section) => (
                    <ReportSectionView key={section.title} section={section} />
                  ))}
                  <SummaryList title={`Summary (${filterReport.dateRange})`} items={filterReport.summary} />
                </ReportCard>
              )}

              {/* ── Inventory Report ── */}
              {inventoryReport && (
                <ReportCard
                  title={inventoryReport.title}
                  buildingName={inventoryReport.buildingName || selectedBuildingName}
                  onExport={() => exportPDF(inventoryReport)}
                  onEmail={emailHandler(inventoryReport, "Inventory")}
                  lowStockCount={lowStockCountOf(inventoryReport)}
                >
                  {inventoryReport.sections.map((section) => (
                    <ReportSectionView
                      key={section.title}
                      section={section}
                      emptyMessage={section.title === "Reorder Recommendations" ? "No reorders recommended." : undefined}
                    />
                  ))}
                  <SummaryList title={`Inventory Summary (${inventoryReport.dateRange})`} items={inventoryReport.summary} />
                </ReportCard>
              )}
            </>
          )}

        </div>

      {emailModal && (
        <EmailReportModal
          buildingId={activeBuilding?.buildingId ?? 0}
          reportType={emailModal.reportType}
          getPdfBase64={emailModal.getPdfBase64}
          buildingName={selectedBuildingName}
          dateRange={(filterReport ?? inventoryReport)?.dateRange ?? ""}
          onClose={() => setEmailModal(null)}
        />
      )}
    </PageShell>
  );
}
