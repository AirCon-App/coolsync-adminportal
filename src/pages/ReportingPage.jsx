import React, { useState, useEffect, useMemo } from "react";
import PageShell from "../components/PageShell";
import api from "../data/api";
import { SlPrinter } from "react-icons/sl";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

function formatDaysEarlyLate(dueDate, completedDate) {
  if (!dueDate || !completedDate) return "—";
  const diff = Math.round(
    (new Date(dueDate) - new Date(completedDate)) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "On time";
  if (diff > 0) return `${diff} day${diff !== 1 ? "s" : ""} early`;
  return `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? "s" : ""} late`;
}

function daysEarlyLateColor(dueDate, completedDate) {
  if (!dueDate || !completedDate) return "var(--text-muted)";
  const diff = Math.round(
    (new Date(dueDate) - new Date(completedDate)) / (1000 * 60 * 60 * 24)
  );
  return diff >= 0 ? "var(--success)" : "var(--danger)";
}

const PDF_HEAD_STYLES = { fillColor: [37, 99, 235] };
const PDF_STYLES = { fontSize: 9, cellPadding: 3 };
const PDF_ALT_ROW = { fillColor: [245, 247, 250] };

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

function ReportCard({ title, buildingName, children, onExport }) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="inventory-item" style={{ flexDirection: "column", alignItems: "stretch", gap: "1.5rem", padding: "1.5rem", marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: "0 0 0.2rem", color: "var(--text-primary)", fontSize: "1.2rem", fontWeight: 700 }}>{title}</h2>
          {buildingName && <p style={{ margin: "0 0 0.1rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>{buildingName}</p>}
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.8rem" }}>{today}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem", letterSpacing: "0.04em" }}>NJ Filters</span>
          <button className="button" onClick={onExport} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            <SlPrinter /> Export PDF
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ReportingPage() {
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [airHandlers, setAirHandlers] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [error, setError] = useState(null);

  // Phase 1: fetch buildings, users, and full catalog once on mount
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [bRes, uRes, catRes] = await Promise.all([
          api.get("/Buildings"),
          api.get("/Auth/users"),
          api.get("/ItemCatalog"),
        ]);
        setBuildings(bRes.data);
        setUsers(uRes.data);
        setCatalogItems(catRes.data);
        if (bRes.data.length > 0) {
          setSelectedBuilding(String(bRes.data[0].buildingId));
        }
      } catch (err) {
        setError("Failed to load initial data. " + (err.message || ""));
      } finally {
        setLoading(false);
      }
    };
    fetchInit();
  }, []);

  // Phase 2: fetch building-specific data when selectedBuilding changes
  useEffect(() => {
    if (!selectedBuilding) return;
    const fetchBuildingData = async () => {
      setBuildingLoading(true);
      setError(null);
      try {
        const [ahRes, woRes, invRes] = await Promise.all([
          api.get(`/AirHandlers?buildingId=${selectedBuilding}`),
          api.get(`/WorkOrders?buildingId=${selectedBuilding}`),
          api.get(`/Inventory?buildingId=${selectedBuilding}`),
        ]);
        setAirHandlers(ahRes.data);
        setWorkOrders(woRes.data);
        setInventory(invRes.data);
      } catch (err) {
        setError("Failed to load report data. " + (err.message || ""));
      } finally {
        setBuildingLoading(false);
      }
    };
    fetchBuildingData();
  }, [selectedBuilding]);

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
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const completedRows = [];
    const upcomingRows = [];

    workOrders.forEach((wo) => {
      const handler = handlerMap[wo.handler];
      const unitName = handler?.name ?? "Unknown Unit";
      const filtersName = handler?.filtersName ?? "—";

      if (wo.completedDate || wo.activityDate) {
        const serviceDate = wo.activityDate ?? wo.completedDate;
        const completedAt = new Date(serviceDate);
        if (completedAt >= thirtyDaysAgo) {
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

    return {
      completedRows,
      upcomingRows,
      summary: [
        `Total filters replaced: ${totalReplaced}`,
        `Filter changes completed on schedule: ${pctOnTime}%`,
        `Upcoming changes in next 30 days: ${upcomingRows.length}`,
      ],
    };
  }, [workOrders, handlerMap, userMap]);

  // ─── Inventory Report data ───────────────────────────────────────────────

  const inventoryReport = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Current inventory levels
    const currentLevels = inventory.map((inv) => ({
      filterSize: inv.catalogItem?.name ?? "—",
      onHand: inv.quantity,
      minLevel: "—",
      status: inv.quantity > 0 ? "OK" : "Out of Stock",
      statusColor: inv.quantity > 0 ? "var(--success)" : "var(--danger)",
    }));

    // Usage last 30 days — group by itemId
    const usageMap = {};
    workOrders.forEach((wo) => {
      const serviceDate = wo.activityDate ?? wo.completedDate;
      if (!serviceDate) return;
      if (new Date(serviceDate) < thirtyDaysAgo) return;
      const name = itemNameMap[wo.itemId];
      if (!name) return;
      if (!usageMap[wo.itemId]) usageMap[wo.itemId] = { name, qtyUsed: 0, locations: new Set() };
      usageMap[wo.itemId].qtyUsed += wo.count ?? 0;
      const handler = handlerMap[wo.handler];
      if (handler?.name) usageMap[wo.itemId].locations.add(handler.name);
    });
    const usageRows = Object.values(usageMap).map((u) => ({
      filterSize: u.name,
      qtyUsed: u.qtyUsed,
      primaryLocations: [...u.locations].join(", ") || "—",
    }));

    // Upcoming demand next 30 days — group by itemId
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
    const demandRows = Object.values(demandMap).map((d) => ({
      filterSize: d.name,
      qtyRequired: d.qtyRequired,
      scheduledUnits: [...d.units].join(", ") || "—",
    }));

    // Reorder recommendations — on-hand < upcoming demand
    const reorderRows = inventory
      .map((inv) => {
        const name = inv.catalogItem?.name;
        const demand = demandMap[inv.catalogItem?.catalogItemId]?.qtyRequired ?? 0;
        if (inv.quantity < demand) {
          return {
            filterSize: name ?? "—",
            currentQty: inv.quantity,
            recommendedQty: demand - inv.quantity,
          };
        }
        return null;
      })
      .filter(Boolean);

    const totalOnHand = inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    const totalUpcomingDemand = Object.values(demandMap).reduce((sum, d) => sum + d.qtyRequired, 0);

    return {
      currentLevels,
      usageRows,
      demandRows,
      reorderRows,
      summary: [
        `Total filter types tracked: ${inventory.length}`,
        `Filters currently below minimum: ${reorderRows.length}`,
        `Estimated filters required in next 30 days: ${totalUpcomingDemand}`,
        `Inventory shortfall risk: ${reorderRows.length === 0 ? "None" : reorderRows.length <= 2 ? "Low–Moderate" : "High"}`,
      ],
    };
  }, [inventory, workOrders, handlerMap, itemNameMap]);

  // ─── PDF export ─────────────────────────────────────────────────────────

  const selectedBuildingName = buildings.find((b) => String(b.buildingId) === selectedBuilding)?.name ?? "";
  const today = new Date().toLocaleDateString();

  function exportFilterActivityPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18).setFont(undefined, "bold").text("Filter Activity Report", 14, 20);
    doc.setFontSize(11).setFont(undefined, "normal").text(selectedBuildingName, 14, 29);
    doc.setFontSize(9).text(today, 14, 36);
    doc.setFontSize(11).setFont(undefined, "bold").text("NJ Filters", pageWidth - 14, 20, { align: "right" });

    let y = 44;

    doc.setFontSize(10).setFont(undefined, "bold").text("Completed Filter Changes (Last 30 Days)", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Unit", "Filter Type", "Filter Size / MERV", "Qty", "Date Changed", "Days Early/Late", "Technician"]],
      body: filterActivityReport.completedRows.map((r) => [r.unit, r.filterType, r.filterSize, r.qty, r.dateChanged, r.daysEarlyLate, r.technician]),
      headStyles: PDF_HEAD_STYLES,
      styles: PDF_STYLES,
      alternateRowStyles: PDF_ALT_ROW,
    });

    y = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(10).setFont(undefined, "bold").text("Upcoming Filter Changes (Next 30 Days)", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Unit", "Filter Type", "Filter Size / MERV", "Qty", "Next Due Date"]],
      body: filterActivityReport.upcomingRows.map((r) => [r.unit, r.filterType, r.filterSize, r.qty, r.nextDueDate]),
      headStyles: PDF_HEAD_STYLES,
      styles: PDF_STYLES,
      alternateRowStyles: PDF_ALT_ROW,
    });

    y = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(10).setFont(undefined, "bold").text("30 Day Summary", 14, y);
    filterActivityReport.summary.forEach((line, i) => {
      doc.setFontSize(9).setFont(undefined, "normal").text(`• ${line}`, 18, y + 8 + i * 6);
    });

    doc.save(`FilterActivityReport_${selectedBuildingName}_${today}.pdf`);
  }

  function exportInventoryPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18).setFont(undefined, "bold").text("Inventory Report", 14, 20);
    doc.setFontSize(11).setFont(undefined, "normal").text(selectedBuildingName, 14, 29);
    doc.setFontSize(9).text(today, 14, 36);
    doc.setFontSize(11).setFont(undefined, "bold").text("NJ Filters", pageWidth - 14, 20, { align: "right" });

    let y = 44;

    doc.setFontSize(10).setFont(undefined, "bold").text("Current Inventory Levels", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Filter Size / MERV", "On Hand Qty", "Minimum Level", "Status"]],
      body: inventoryReport.currentLevels.map((r) => [r.filterSize, r.onHand, r.minLevel, r.status]),
      headStyles: PDF_HEAD_STYLES,
      styles: PDF_STYLES,
      alternateRowStyles: PDF_ALT_ROW,
    });

    y = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(10).setFont(undefined, "bold").text("Inventory Usage (Last 30 Days)", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Filter Size / MERV", "Qty Used", "Primary Locations"]],
      body: inventoryReport.usageRows.map((r) => [r.filterSize, r.qtyUsed, r.primaryLocations]),
      headStyles: PDF_HEAD_STYLES,
      styles: PDF_STYLES,
      alternateRowStyles: PDF_ALT_ROW,
    });

    y = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(10).setFont(undefined, "bold").text("Upcoming Inventory Demand (Next 30 Days)", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Filter Size / MERV", "Qty Required", "Scheduled Units"]],
      body: inventoryReport.demandRows.map((r) => [r.filterSize, r.qtyRequired, r.scheduledUnits]),
      headStyles: PDF_HEAD_STYLES,
      styles: PDF_STYLES,
      alternateRowStyles: PDF_ALT_ROW,
    });

    y = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(10).setFont(undefined, "bold").text("Reorder Recommendations", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Filter Size / MERV", "Current Qty", "Recommended Order Qty"]],
      body: inventoryReport.reorderRows.length > 0
        ? inventoryReport.reorderRows.map((r) => [r.filterSize, r.currentQty, r.recommendedQty])
        : [["No reorders recommended", "", ""]],
      headStyles: PDF_HEAD_STYLES,
      styles: PDF_STYLES,
      alternateRowStyles: PDF_ALT_ROW,
    });

    y = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(10).setFont(undefined, "bold").text("Inventory Summary", 14, y);
    inventoryReport.summary.forEach((line, i) => {
      doc.setFontSize(9).setFont(undefined, "normal").text(`• ${line}`, 18, y + 8 + i * 6);
    });

    doc.save(`InventoryReport_${selectedBuildingName}_${today}.pdf`);
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageShell>
        <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>Loading report data...</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={{ width: "100%", maxWidth: 960 }}>

          {/* Page header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ color: "var(--text-primary)", margin: "0 0 0.25rem" }}>Reports</h1>
              <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.95rem" }}>Filter activity and inventory reporting by property.</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <label style={{ color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Property</label>
              <select
                className="inventory-modal-input"
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                style={{ marginBottom: 0, width: "auto", minWidth: 180 }}
              >
                {buildings.length === 0 && <option value="">No buildings available</option>}
                {buildings.map((b) => (
                  <option key={b.buildingId} value={b.buildingId}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="inventory-item" style={{ flexDirection: "column", borderColor: "var(--danger)", marginBottom: "1.5rem" }}>
              <p style={{ color: "var(--danger)", margin: "0 0 0.5rem", fontWeight: 600 }}>Error loading data</p>
              <p style={{ color: "var(--text-secondary)", margin: "0 0 0.75rem", fontSize: "0.9rem" }}>{error}</p>
              <button className="button" onClick={() => setSelectedBuilding((s) => s)} style={{ alignSelf: "flex-start", padding: "0.4rem 1rem", fontSize: "0.85rem" }}>
                Retry
              </button>
            </div>
          )}

          {buildingLoading ? (
            <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>Loading building data...</p>
          ) : (
            <>
              {/* ── Filter Activity Report ── */}
              <ReportCard title="Filter Activity Report" buildingName={selectedBuildingName} onExport={exportFilterActivityPDF}>
                <SectionTable
                  title="Completed Filter Changes (Last 30 Days)"
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
                <SummaryList title="30 Day Summary" items={filterActivityReport.summary} />
              </ReportCard>

              {/* ── Inventory Report ── */}
              <ReportCard title="Inventory Report" buildingName={selectedBuildingName} onExport={exportInventoryPDF}>
                <SectionTable
                  title="Current Inventory Levels"
                  columns={[
                    { key: "filterSize", label: "Filter Size / MERV" },
                    { key: "onHand", label: "On Hand Qty", align: "center" },
                    { key: "minLevel", label: "Minimum Level", align: "center" },
                    { key: "status", label: "Status" },
                  ]}
                  rows={inventoryReport.currentLevels}
                />
                <SectionTable
                  title="Inventory Usage (Last 30 Days)"
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
                    { key: "recommendedQty", label: "Recommended Order Qty", align: "center" },
                  ]}
                  rows={inventoryReport.reorderRows}
                  emptyMessage="No reorders recommended."
                />
                <SummaryList title="Inventory Summary" items={inventoryReport.summary} />
              </ReportCard>
            </>
          )}

        </div>
    </PageShell>
  );
}
