import { useState, useEffect, useMemo } from "react";
import PageShell from "../components/PageShell";
import api from "../data/api";
import { useUsers } from "../hooks/useUsers";
import { SlPrinter } from "react-icons/sl";
import { MdOutlineEmail } from "react-icons/md";
import TimeFrameSelector from "../components/TimeFrameSelector";
import EmailReportModal from "../components/EmailReportModal";
import { useBuilding } from "../context/BuildingContext";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

function formatDaysEarlyLate(dueDate, completedDate) {
  if (!dueDate || !completedDate) return "—";
  const diff = Math.round(
    (new Date(dueDate).getTime() - new Date(completedDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "On time";
  if (diff > 0) return `${diff} day${diff !== 1 ? "s" : ""} early`;
  return `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? "s" : ""} late`;
}

function daysEarlyLateColor(dueDate, completedDate) {
  if (!dueDate || !completedDate) return "var(--text-muted)";
  const diff = Math.round(
    (new Date(dueDate).getTime() - new Date(completedDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff >= 0 ? "var(--success)" : "var(--danger)";
}

const PDF_HEAD_STYLES = { fillColor: [37, 99, 235] as [number, number, number] };
const PDF_STYLES = { fontSize: 9, cellPadding: 3 };
const PDF_ALT_ROW = { fillColor: [245, 247, 250] as [number, number, number] };

// ─── Internal render components ─────────────────────────────────────────────

function SectionTable({ title, columns, rows, emptyMessage = "No records in this period." }) {
  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <p style={{ margin: "0 0 0.5rem", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {title}
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ padding: "0.5rem 0.75rem", textAlign: col.align || "left", color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center" }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? "var(--bg-subtle)" : "transparent" }}>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: "0.55rem 0.75rem", textAlign: col.align || "left", color: row[`${col.key}Color`] || "var(--text-primary)", fontWeight: row[`${col.key}Bold`] ? 700 : 400, borderBottom: "1px solid var(--border)", whiteSpace: col.nowrap ? "nowrap" : "normal" }}>
                    {row[col.key] ?? "—"}
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

function SummaryList({ title, items }) {
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

function ReportCard({ title, buildingName, children, onExport, onEmail, lowStockCount = 0 }) {
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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ReportingPage() {
  const { activeBuilding } = useBuilding();
  const [airHandlers, setAirHandlers] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const users = useUsers();
  const [loading, setLoading] = useState(true);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Time-frame state — default 1 month back to today
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d; });
  const [dateTo, setDateTo] = useState(() => new Date());

  // Email modal state
  const [emailModal, setEmailModal] = useState<{ reportType: string; getPdfBase64: () => Promise<string> } | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  function handleTimeFrameChange({ dateFrom: f, dateTo: t }) {
    setDateFrom(f);
    setDateTo(t);
  }

  function formatDateRange() {
    const fmt = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
  }

  // Phase 1: fetch catalog once on mount
  useEffect(() => {
    let mounted = true;
    const fetchInit = async () => {
      try {
        const catRes = await api.get("/ItemCatalog");
        if (mounted) setCatalogItems(catRes.data);
      } catch (err) {
        if (mounted) setError("Failed to load initial data. " + (err instanceof Error ? err.message : ""));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchInit();
    return () => { mounted = false; };
  }, []);

  // Phase 2: fetch building-specific data when activeBuilding changes
  useEffect(() => {
    if (!activeBuilding) return;
    let mounted = true;
    const fetchBuildingData = async () => {
      setBuildingLoading(true);
      setError(null);
      try {
        const bid = activeBuilding.buildingId;
        const [ahRes, woRes, invRes] = await Promise.all([
          api.get(`/AirHandlers?buildingId=${bid}`),
          api.get(`/WorkOrders?buildingId=${bid}`),
          api.get(`/Inventory?buildingId=${bid}`),
        ]);
        if (!mounted) return;
        setAirHandlers(ahRes.data.items);
        setWorkOrders(woRes.data);
        setInventory(invRes.data.items);
      } catch (err) {
        if (mounted) setError("Failed to load report data. " + (err.message || ""));
      } finally {
        if (mounted) setBuildingLoading(false);
      }
    };
    fetchBuildingData();
    return () => { mounted = false; };
  }, [activeBuilding]);

  // ─── Lookup maps ────────────────────────────────────────────────────────

  const userMap = useMemo(() => {
    const m = {};
    users.forEach((u) => { m[u.id] = u.fullName || u.email || "Unassigned"; });
    return m;
  }, [users]);

  const handlerMap = useMemo(() => {
    const m = {};
    airHandlers.forEach((ah) => { m[ah.airHandlerGuid] = ah; });
    return m;
  }, [airHandlers]);

  const itemNameMap = useMemo(() => {
    const m = {};
    catalogItems.forEach((cat) => { m[cat.catalogItemId] = cat.name; });
    return m;
  }, [catalogItems]);

  // ─── Filter Activity Report data ────────────────────────────────────────

  const filterActivityReport = useMemo(() => {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const completedRows: any[] = [];
    const upcomingRows: any[] = [];

    workOrders.forEach((wo) => {
      const handler = handlerMap[wo.handler];
      const unitName = handler?.name ?? "Unknown Unit";
      const filtersName = handler?.filtersName ?? "—";

      if (wo.completedDate || wo.activityDate) {
        const serviceDate = wo.activityDate ?? wo.completedDate;
        const completedAt = new Date(serviceDate);
        if (completedAt >= from && completedAt <= to) {
          const earlyLate = formatDaysEarlyLate(wo.dueDate, serviceDate);
          const earlyLateColor = daysEarlyLateColor(wo.dueDate, serviceDate);
          completedRows.push({
            unit: unitName,
            filterType: filtersName,
            filterSize: filtersName,
            qty: wo.count || handler?.quantity || "—",
            dateChanged: formatDate(serviceDate),
            daysEarlyLate: earlyLate,
            daysEarlyLateColor: earlyLateColor,
            technician: userMap[wo.technicianId] ?? "Unassigned",
          });
        }
      } else if (wo.dueDate) {
        const dueAt = new Date(wo.dueDate);
        if (dueAt >= now && dueAt <= thirtyDaysAhead) {
          upcomingRows.push({
            unit: unitName,
            filterType: filtersName,
            filterSize: filtersName,
            qty: wo.count ?? handler?.quantity ?? "—",
            nextDueDate: formatDate(wo.dueDate),
          });
        }
      }
    });

    const totalReplaced = completedRows.reduce((sum, r) => sum + (typeof r.qty === "number" ? r.qty : 0), 0);
    const scheduledRows = completedRows.filter((r) => r.daysEarlyLate !== "—");
    const onTimeCount = scheduledRows.filter((r) => !r.daysEarlyLate.includes("late")).length;
    const pctOnTime = scheduledRows.length > 0 ? Math.round((onTimeCount / scheduledRows.length) * 100) : 100;

    const rangeLabel = formatDateRange();

    return {
      completedRows,
      upcomingRows,
      rangeLabel,
      summary: [
        `Total filters replaced: ${totalReplaced}`,
        `Filter changes completed on schedule: ${pctOnTime}%`,
        `Upcoming changes (next 30 days): ${upcomingRows.length}`,
      ],
    };
  }, [workOrders, handlerMap, userMap, dateFrom, dateTo]);

  // ─── Inventory Report data ───────────────────────────────────────────────

  const inventoryReport = useMemo(() => {
    const now = new Date();
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Current inventory levels
    const currentLevels = inventory.map((inv) => {
      const min = inv.minLevel ?? 0;
      const belowMin = min > 0 && inv.quantity < min;
      const outOfStock = inv.quantity === 0;
      const status = outOfStock ? "Out of Stock" : belowMin ? "Low Stock" : "OK";
      const statusColor = outOfStock || belowMin ? "var(--danger)" : "var(--success)";
      return {
        filterSize: inv.catalogItem?.name ?? "—",
        onHand: inv.quantity,
        minLevel: min > 0 ? min : "—",
        reorderQty: (inv.reorderQty ?? 0) > 0 ? inv.reorderQty : "—",
        status,
        statusColor,
      };
    });

    // Usage over selected past range — group by itemId
    const usageMap = {};
    workOrders.forEach((wo) => {
      const serviceDate = wo.activityDate ?? wo.completedDate;
      if (!serviceDate) return;
      const d = new Date(serviceDate);
      if (d < from || d > to) return;
      const name = itemNameMap[wo.itemId];
      if (!name) return;
      if (!usageMap[wo.itemId]) usageMap[wo.itemId] = { name, qtyUsed: 0, locations: new Set() };
      usageMap[wo.itemId].qtyUsed += wo.count ?? 0;
      const handler = handlerMap[wo.handler];
      if (handler?.name) usageMap[wo.itemId].locations.add(handler.name);
    });
    const usageRows = Object.values(usageMap).map((u: any) => ({
      filterSize: u.name,
      qtyUsed: u.qtyUsed,
      primaryLocations: [...u.locations].join(", ") || "—",
    }));

    // Upcoming demand — next 30 days
    const demandMap = {};
    workOrders.forEach((wo) => {
      if (wo.completedDate) return;
      if (!wo.dueDate) return;
      const dueAt = new Date(wo.dueDate);
      if (dueAt < now || dueAt > thirtyDaysAhead) return;
      const name = itemNameMap[wo.itemId];
      if (!name) return;
      if (!demandMap[wo.itemId]) demandMap[wo.itemId] = { name, qtyRequired: 0, units: new Set() };
      const handler = handlerMap[wo.handler];
      demandMap[wo.itemId].qtyRequired += wo.count ?? handler?.quantity ?? 0;
      if (handler?.name) demandMap[wo.itemId].units.add(handler.name);
    });
    const demandRows = Object.values(demandMap).map((d: any) => ({
      filterSize: d.name,
      qtyRequired: d.qtyRequired,
      scheduledUnits: [...d.units].join(", ") || "—",
    }));

    // Reorder recommendations
    const reorderRows = inventory
      .map((inv) => {
        const name = inv.catalogItem?.name;
        const demand = demandMap[inv.catalogItem?.catalogItemId]?.qtyRequired ?? 0;
        const minLevel = inv.minLevel ?? 0;
        const belowMin = minLevel > 0 && inv.quantity < minLevel;
        const belowDemand = inv.quantity < demand;
        if (!belowMin && !belowDemand) return null;
        const baseQty = Math.max(inv.reorderQty ?? 0, demand - inv.quantity, minLevel > 0 ? minLevel - inv.quantity : 0);
        return {
          filterSize: name ?? "—",
          currentQty: inv.quantity,
          minLevel: minLevel > 0 ? minLevel : "—",
          recommendedQty: Math.max(baseQty, 1),
        };
      })
      .filter(Boolean) as any[];

    const totalUpcomingDemand = Object.values(demandMap).reduce((sum, d: any) => sum + d.qtyRequired, 0);
    const lowStockCount = currentLevels.filter((r) => r.status !== "OK").length;

    const rangeLabel = formatDateRange();

    return {
      currentLevels,
      usageRows,
      demandRows,
      reorderRows,
      rangeLabel,
      lowStockCount,
      summary: [
        `Total filter types tracked: ${inventory.length}`,
        `Filters currently below minimum: ${lowStockCount}`,
        `Estimated filters required (next 30 days): ${totalUpcomingDemand}`,
        `Inventory shortfall risk: ${reorderRows.length === 0 ? "None" : reorderRows.length <= 2 ? "Low–Moderate" : "High"}`,
      ],
    };
  }, [inventory, workOrders, handlerMap, itemNameMap, dateFrom, dateTo]);

  // ─── PDF export ─────────────────────────────────────────────────────────

  const selectedBuildingName = activeBuilding?.name ?? "";
  const today = new Date().toLocaleDateString();

  async function loadPdfLibs() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    return { jsPDF, autoTable };
  }

  async function buildFilterActivityPdfDoc() {
    const { jsPDF, autoTable } = await loadPdfLibs();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18).setFont(doc.getFont().fontName, "bold").text("Filter Activity Report", 14, 20);
    doc.setFontSize(11).setFont(doc.getFont().fontName, "normal").text(selectedBuildingName, 14, 29);
    doc.setFontSize(9).text(`${today}  |  ${formatDateRange()}`, 14, 36);
    doc.setFontSize(11).setFont(doc.getFont().fontName, "bold").text("NJ Filters", pageWidth - 14, 20, { align: "right" });

    let y = 44;

    doc.setFontSize(10).setFont(doc.getFont().fontName, "bold").text(`Completed Filter Changes (${formatDateRange()})`, 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Unit", "Filter Type", "Filter Size / MERV", "Qty", "Date Changed", "Days Early/Late", "Technician"]],
      body: filterActivityReport.completedRows.map((r) => [r.unit, r.filterType, r.filterSize, r.qty, r.dateChanged, r.daysEarlyLate, r.technician]),
      headStyles: PDF_HEAD_STYLES,
      styles: PDF_STYLES,
      alternateRowStyles: PDF_ALT_ROW,
    });

    y = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(10).setFont(doc.getFont().fontName, "bold").text("Upcoming Filter Changes (Next 30 Days)", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Unit", "Filter Type", "Filter Size / MERV", "Qty", "Next Due Date"]],
      body: filterActivityReport.upcomingRows.map((r) => [r.unit, r.filterType, r.filterSize, r.qty, r.nextDueDate]),
      headStyles: PDF_HEAD_STYLES,
      styles: PDF_STYLES,
      alternateRowStyles: PDF_ALT_ROW,
    });

    y = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(10).setFont(doc.getFont().fontName, "bold").text(`Summary (${filterActivityReport.rangeLabel})`, 14, y);
    filterActivityReport.summary.forEach((line, i) => {
      doc.setFontSize(9).setFont(doc.getFont().fontName, "normal").text(`• ${line}`, 18, y + 8 + i * 6);
    });

    return doc;
  }

  async function exportFilterActivityPDF() {
    setPdfError(null);
    try {
      const doc = await buildFilterActivityPdfDoc();
      doc.save(`FilterActivityReport_${selectedBuildingName}_${today}.pdf`);
    } catch (err) {
      setPdfError(err instanceof Error ? `Failed to export PDF: ${err.message}` : "Failed to generate PDF. Please try again.");
    }
  }

  async function buildInventoryPdfDoc() {
    const { jsPDF, autoTable } = await loadPdfLibs();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18).setFont(doc.getFont().fontName, "bold").text("Inventory Report", 14, 20);
    doc.setFontSize(11).setFont(doc.getFont().fontName, "normal").text(selectedBuildingName, 14, 29);
    doc.setFontSize(9).text(`${today}  |  ${formatDateRange()}`, 14, 36);
    doc.setFontSize(11).setFont(doc.getFont().fontName, "bold").text("NJ Filters", pageWidth - 14, 20, { align: "right" });

    let y = 44;

    doc.setFontSize(10).setFont(doc.getFont().fontName, "bold").text("Current Inventory Levels", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Filter Size / MERV", "On Hand Qty", "Min Level", "Reorder Qty", "Status"]],
      body: inventoryReport.currentLevels.map((r) => [r.filterSize, r.onHand, r.minLevel, r.reorderQty, r.status]),
      headStyles: PDF_HEAD_STYLES,
      styles: PDF_STYLES,
      alternateRowStyles: PDF_ALT_ROW,
    });

    y = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(10).setFont(doc.getFont().fontName, "bold").text(`Inventory Usage (${inventoryReport.rangeLabel})`, 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Filter Size / MERV", "Qty Used", "Primary Locations"]],
      body: inventoryReport.usageRows.map((r) => [r.filterSize, r.qtyUsed, r.primaryLocations]),
      headStyles: PDF_HEAD_STYLES,
      styles: PDF_STYLES,
      alternateRowStyles: PDF_ALT_ROW,
    });

    y = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(10).setFont(doc.getFont().fontName, "bold").text("Upcoming Inventory Demand (Next 30 Days)", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Filter Size / MERV", "Qty Required", "Scheduled Units"]],
      body: inventoryReport.demandRows.map((r) => [r.filterSize, r.qtyRequired, r.scheduledUnits]),
      headStyles: PDF_HEAD_STYLES,
      styles: PDF_STYLES,
      alternateRowStyles: PDF_ALT_ROW,
    });

    y = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(10).setFont(doc.getFont().fontName, "bold").text("Reorder Recommendations", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Filter Size / MERV", "Current Qty", "Min Level", "Recommended Order Qty"]],
      body: inventoryReport.reorderRows.length > 0
        ? inventoryReport.reorderRows.map((r) => [r.filterSize, r.currentQty, r.minLevel, r.recommendedQty])
        : [["No reorders recommended", "", "", ""]],
      headStyles: PDF_HEAD_STYLES,
      styles: PDF_STYLES,
      alternateRowStyles: PDF_ALT_ROW,
    });

    y = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(10).setFont(doc.getFont().fontName, "bold").text(`Inventory Summary (${inventoryReport.rangeLabel})`, 14, y);
    inventoryReport.summary.forEach((line, i) => {
      doc.setFontSize(9).setFont(doc.getFont().fontName, "normal").text(`• ${line}`, 18, y + 8 + i * 6);
    });

    return doc;
  }

  async function exportInventoryPDF() {
    setPdfError(null);
    try {
      const doc = await buildInventoryPdfDoc();
      doc.save(`InventoryReport_${selectedBuildingName}_${today}.pdf`);
    } catch (err) {
      setPdfError(err instanceof Error ? `Failed to export PDF: ${err.message}` : "Failed to generate PDF. Please try again.");
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageShell>
        <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>Loading report data...</p>
      </PageShell>
    );
  }

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

          {buildingLoading ? (
            <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>Loading building data...</p>
          ) : (
            <>
              {/* ── Filter Activity Report ── */}
              <ReportCard
                title="Filter Activity Report"
                buildingName={selectedBuildingName}
                onExport={exportFilterActivityPDF}
                onEmail={() => setEmailModal({ reportType: "Filter Activity", getPdfBase64: async () => {
                  const dataUri = (await buildFilterActivityPdfDoc()).output("datauristring");
                  const parts = dataUri.split(",");
                  if (parts.length < 2) throw new Error("Failed to encode PDF.");
                  return parts[1];
                }})}
              >
                <SectionTable
                  title={`Completed Filter Changes (${filterActivityReport.rangeLabel})`}
                  columns={[
                    { key: "unit", label: "Unit" },
                    { key: "filterType", label: "Filter Type" },
                    { key: "filterSize", label: "Filter Size / MERV" },
                    { key: "qty", label: "Qty", align: "center" },
                    { key: "dateChanged", label: "Date Changed", nowrap: true },
                    { key: "daysEarlyLate", label: "Days Early/Late", nowrap: true },
                    { key: "technician", label: "Technician" },
                  ]}
                  rows={filterActivityReport.completedRows}
                />
                <SectionTable
                  title="Upcoming Filter Changes (Next 30 Days)"
                  columns={[
                    { key: "unit", label: "Unit" },
                    { key: "filterType", label: "Filter Type" },
                    { key: "filterSize", label: "Filter Size / MERV" },
                    { key: "qty", label: "Qty", align: "center" },
                    { key: "nextDueDate", label: "Next Due Date", nowrap: true },
                  ]}
                  rows={filterActivityReport.upcomingRows}
                />
                <SummaryList title={`Summary (${filterActivityReport.rangeLabel})`} items={filterActivityReport.summary} />
              </ReportCard>

              {/* ── Inventory Report ── */}
              <ReportCard
                title="Inventory Report"
                buildingName={selectedBuildingName}
                onExport={exportInventoryPDF}
                onEmail={() => setEmailModal({ reportType: "Inventory", getPdfBase64: async () => {
                  const dataUri = (await buildInventoryPdfDoc()).output("datauristring");
                  const parts = dataUri.split(",");
                  if (parts.length < 2) throw new Error("Failed to encode PDF.");
                  return parts[1];
                }})}
                lowStockCount={inventoryReport.lowStockCount}
              >
                <SectionTable
                  title="Current Inventory Levels"
                  columns={[
                    { key: "filterSize", label: "Filter Size / MERV" },
                    { key: "onHand", label: "On Hand Qty", align: "center" },
                    { key: "minLevel", label: "Min Level", align: "center" },
                    { key: "reorderQty", label: "Reorder Qty", align: "center" },
                    { key: "status", label: "Status" },
                  ]}
                  rows={inventoryReport.currentLevels}
                />
                <SectionTable
                  title={`Inventory Usage (${inventoryReport.rangeLabel})`}
                  columns={[
                    { key: "filterSize", label: "Filter Size / MERV" },
                    { key: "qtyUsed", label: "Qty Used", align: "center" },
                    { key: "primaryLocations", label: "Primary Locations" },
                  ]}
                  rows={inventoryReport.usageRows}
                />
                <SectionTable
                  title="Upcoming Inventory Demand (Next 30 Days)"
                  columns={[
                    { key: "filterSize", label: "Filter Size / MERV" },
                    { key: "qtyRequired", label: "Qty Required", align: "center" },
                    { key: "scheduledUnits", label: "Scheduled Units" },
                  ]}
                  rows={inventoryReport.demandRows}
                />
                <SectionTable
                  title="Reorder Recommendations"
                  columns={[
                    { key: "filterSize", label: "Filter Size / MERV" },
                    { key: "currentQty", label: "Current Qty", align: "center" },
                    { key: "minLevel", label: "Min Level", align: "center" },
                    { key: "recommendedQty", label: "Recommended Order Qty", align: "center" },
                  ]}
                  rows={inventoryReport.reorderRows}
                  emptyMessage="No reorders recommended."
                />
                <SummaryList title={`Inventory Summary (${inventoryReport.rangeLabel})`} items={inventoryReport.summary} />
              </ReportCard>
            </>
          )}

        </div>

      {emailModal && (
        <EmailReportModal
          buildingId={activeBuilding?.buildingId ?? 0}
          reportType={emailModal.reportType}
          getPdfBase64={emailModal.getPdfBase64}
          buildingName={selectedBuildingName}
          dateRange={formatDateRange()}
          onClose={() => setEmailModal(null)}
        />
      )}
    </PageShell>
  );
}
