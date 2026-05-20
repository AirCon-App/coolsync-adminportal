import { useState, useEffect, useMemo, useCallback } from "react";
import PageShell from "../components/PageShell";
import { useBuilding } from "../context/BuildingContext";
import { reportTemplatesApi, reportSchedulesApi, recipientsApi } from "../api/reports";
import type {
  ReportTemplate,
  ReportField,
  ReportColumn,
  ReportData,
  CreateTemplateDto,
  DataSourceType,
} from "../types/reports";
import type { ReportRecipient } from "../types";
import { FiPlus, FiEdit2, FiCopy, FiTrash2, FiPlay, FiDownload, FiClock, FiX } from "react-icons/fi";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const CHART_COLORS = {
  primary: "#2563eb",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#7c3aed",
  teal: "#0891b2",
  gray: "#6b7280",
};

function SortableColumn({
  column,
  onToggle,
  onRemove,
}: {
  column: ReportColumn;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: column.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="sortable-column-item">
      <span {...listeners} className="drag-handle">⋮⋮</span>
      <input type="checkbox" checked={column.visible} onChange={onToggle} />
      <span style={{ flex: 1 }}>{column.label}</span>
      <span className="column-type-badge">{column.type}</span>
      <button type="button" className="remove-column-btn" onClick={onRemove}><FiX size={14} /></button>
    </div>
  );
}

interface ReportChartsProps {
  dataSource: string;
  data: Record<string, unknown>[];
  columns: ReportColumn[];
}

function ReportCharts({ dataSource, data, columns }: ReportChartsProps) {
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: "#a0a0a0", font: { size: 11 } },
      },
    },
    scales: {
      x: { ticks: { color: "#5a5a5a", font: { size: 10 } }, grid: { color: "#2e2e2e" } },
      y: { ticks: { color: "#5a5a5a", font: { size: 10 } }, grid: { color: "#2e2e2e" } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: { color: "#a0a0a0", font: { size: 11 }, padding: 12 },
      },
    },
  };

  if (data.length === 0) return null;

  // WorkOrders: Show completion status breakdown and workload by technician
  if (dataSource === "WorkOrders") {
    const statusCounts = { completed: 0, pending: 0, overdue: 0 };
    const technicianCounts: Record<string, number> = {};
    const now = new Date();

    data.forEach((row) => {
      if (row.completedDate) {
        statusCounts.completed++;
      } else if (row.dueDate && new Date(row.dueDate as string) < now) {
        statusCounts.overdue++;
      } else {
        statusCounts.pending++;
      }

      const tech = (row.technicianName as string) || "Unassigned";
      technicianCounts[tech] = (technicianCounts[tech] || 0) + 1;
    });

    const statusData = {
      labels: ["Completed", "Pending", "Overdue"],
      datasets: [{
        data: [statusCounts.completed, statusCounts.pending, statusCounts.overdue],
        backgroundColor: [CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger],
        borderWidth: 0,
      }],
    };

    const topTechs = Object.entries(technicianCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const techData = {
      labels: topTechs.map(([name]) => name.length > 12 ? name.slice(0, 12) + "…" : name),
      datasets: [{
        label: "Work Orders",
        data: topTechs.map(([, count]) => count),
        backgroundColor: CHART_COLORS.primary,
        borderRadius: 4,
      }],
    };

    return (
      <div className="charts-grid">
        <div className="chart-card">
          <h4>Work Order Status</h4>
          <p className="chart-subtitle">Completion breakdown for selected period</p>
          <div className="chart-wrapper">
            <Doughnut data={statusData} options={doughnutOptions} />
          </div>
        </div>
        <div className="chart-card">
          <h4>Workload by Technician</h4>
          <p className="chart-subtitle">Assigned work orders per technician</p>
          <div className="chart-wrapper">
            <Bar data={techData} options={barOptions} />
          </div>
        </div>
      </div>
    );
  }

  // Inventory: Show stock health and items needing attention
  if (dataSource === "Inventory") {
    let healthy = 0, low = 0, critical = 0;
    const itemsNeedingReorder: { name: string; qty: number; min: number }[] = [];

    data.forEach((row) => {
      const qty = (row.quantity as number) || 0;
      const min = (row.minLevel as number) || 0;
      const name = (row.itemName as string) || (row.name as string) || "Unknown";

      if (min === 0 || qty >= min * 1.5) {
        healthy++;
      } else if (qty >= min) {
        low++;
      } else {
        critical++;
        itemsNeedingReorder.push({ name, qty, min });
      }
    });

    const healthData = {
      labels: ["Healthy Stock", "Low Stock", "Critical/Reorder"],
      datasets: [{
        data: [healthy, low, critical],
        backgroundColor: [CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger],
        borderWidth: 0,
      }],
    };

    const reorderItems = itemsNeedingReorder.slice(0, 6);
    const reorderData = {
      labels: reorderItems.map((i) => i.name.length > 15 ? i.name.slice(0, 15) + "…" : i.name),
      datasets: [
        {
          label: "Current Stock",
          data: reorderItems.map((i) => i.qty),
          backgroundColor: CHART_COLORS.danger,
          borderRadius: 4,
        },
        {
          label: "Min Level",
          data: reorderItems.map((i) => i.min),
          backgroundColor: CHART_COLORS.gray,
          borderRadius: 4,
        },
      ],
    };

    return (
      <div className="charts-grid">
        <div className="chart-card">
          <h4>Inventory Health</h4>
          <p className="chart-subtitle">Stock levels relative to minimums</p>
          <div className="chart-wrapper">
            <Doughnut data={healthData} options={doughnutOptions} />
          </div>
        </div>
        {reorderItems.length > 0 && (
          <div className="chart-card">
            <h4>Items Needing Reorder</h4>
            <p className="chart-subtitle">Stock below minimum threshold</p>
            <div className="chart-wrapper">
              <Bar data={reorderData} options={barOptions} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Technicians: Show performance comparison
  if (dataSource === "Technicians") {
    const techPerformance = data.slice(0, 10).map((row) => ({
      name: ((row.technicianName as string) || (row.name as string) || "Unknown"),
      completed: (row.completedCount as number) || (row.completed as number) || 0,
      onTime: (row.onTimeCount as number) || (row.onTime as number) || 0,
    }));

    const perfData = {
      labels: techPerformance.map((t) => t.name.length > 10 ? t.name.slice(0, 10) + "…" : t.name),
      datasets: [
        {
          label: "Completed",
          data: techPerformance.map((t) => t.completed),
          backgroundColor: CHART_COLORS.primary,
          borderRadius: 4,
        },
        {
          label: "On Time",
          data: techPerformance.map((t) => t.onTime),
          backgroundColor: CHART_COLORS.success,
          borderRadius: 4,
        },
      ],
    };

    const totalCompleted = techPerformance.reduce((sum, t) => sum + t.completed, 0);
    const totalOnTime = techPerformance.reduce((sum, t) => sum + t.onTime, 0);
    const onTimeRate = totalCompleted > 0 ? Math.round((totalOnTime / totalCompleted) * 100) : 0;

    const rateData = {
      labels: ["On Time", "Late"],
      datasets: [{
        data: [onTimeRate, 100 - onTimeRate],
        backgroundColor: [CHART_COLORS.success, CHART_COLORS.gray],
        borderWidth: 0,
      }],
    };

    return (
      <div className="charts-grid">
        <div className="chart-card">
          <h4>Technician Performance</h4>
          <p className="chart-subtitle">Completed work orders comparison</p>
          <div className="chart-wrapper">
            <Bar data={perfData} options={barOptions} />
          </div>
        </div>
        <div className="chart-card">
          <h4>On-Time Completion Rate</h4>
          <p className="chart-subtitle">{onTimeRate}% of work orders completed on time</p>
          <div className="chart-wrapper">
            <Doughnut data={rateData} options={doughnutOptions} />
          </div>
        </div>
      </div>
    );
  }

  // Compliance: Show building compliance metrics
  if (dataSource === "Compliance") {
    const complianceRates = data.slice(0, 8).map((row) => ({
      name: (row.buildingName as string) || (row.name as string) || "Building",
      rate: (row.complianceRate as number) || (row.compliance as number) || 0,
    }));

    const avgCompliance = complianceRates.length > 0
      ? Math.round(complianceRates.reduce((sum, c) => sum + c.rate, 0) / complianceRates.length)
      : 0;

    const complianceData = {
      labels: complianceRates.map((c) => c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name),
      datasets: [{
        label: "Compliance %",
        data: complianceRates.map((c) => c.rate),
        backgroundColor: complianceRates.map((c) =>
          c.rate >= 90 ? CHART_COLORS.success : c.rate >= 70 ? CHART_COLORS.warning : CHART_COLORS.danger
        ),
        borderRadius: 4,
      }],
    };

    const gaugeData = {
      labels: ["Compliant", "Non-Compliant"],
      datasets: [{
        data: [avgCompliance, 100 - avgCompliance],
        backgroundColor: [
          avgCompliance >= 90 ? CHART_COLORS.success : avgCompliance >= 70 ? CHART_COLORS.warning : CHART_COLORS.danger,
          "var(--bg-subtle)",
        ],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      }],
    };

    return (
      <div className="charts-grid">
        <div className="chart-card">
          <h4>Overall Compliance</h4>
          <p className="chart-subtitle">{avgCompliance}% average compliance rate</p>
          <div className="chart-wrapper" style={{ paddingTop: "1rem" }}>
            <Doughnut data={gaugeData} options={{ ...doughnutOptions, plugins: { legend: { display: false } } }} />
          </div>
        </div>
        <div className="chart-card">
          <h4>Compliance by Area</h4>
          <p className="chart-subtitle">Filter change compliance percentages</p>
          <div className="chart-wrapper">
            <Bar data={complianceData} options={{ ...barOptions, indexAxis: "y" as const }} />
          </div>
        </div>
      </div>
    );
  }

  // Fallback: Generic bar chart for numeric columns
  const numericCol = columns.find((c) => c.type === "number" && c.visible);
  const labelCol = columns.find((c) => c.type === "text" && c.visible);

  if (numericCol && labelCol) {
    const chartData = {
      labels: data.slice(0, 10).map((row) => {
        const label = String(row[labelCol.field] || "");
        return label.length > 15 ? label.slice(0, 15) + "…" : label;
      }),
      datasets: [{
        label: numericCol.label,
        data: data.slice(0, 10).map((row) => (row[numericCol.field] as number) || 0),
        backgroundColor: CHART_COLORS.primary,
        borderRadius: 4,
      }],
    };

    return (
      <div className="charts-grid">
        <div className="chart-card" style={{ gridColumn: "1 / -1" }}>
          <h4>{numericCol.label} Overview</h4>
          <p className="chart-subtitle">Top 10 results by {labelCol.label}</p>
          <div className="chart-wrapper">
            <Bar data={chartData} options={barOptions} />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function ReportBuilderPage() {
  const { activeBuilding } = useBuilding();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [recipients, setRecipients] = useState<ReportRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [viewingTemplate, setViewingTemplate] = useState<ReportTemplate | null>(null);
  const [viewerData, setViewerData] = useState<ReportData | null>(null);

  const [showSchedule, setShowSchedule] = useState(false);
  const [schedulingTemplate, setSchedulingTemplate] = useState<ReportTemplate | null>(null);
  const [scheduleCron, setScheduleCron] = useState("0 8 * * 1");
  const [scheduleFormat, setScheduleFormat] = useState("PDF");
  const [scheduleRecipients, setScheduleRecipients] = useState<number[]>([]);

  const [builderStep, setBuilderStep] = useState(1);
  const [builderName, setBuilderName] = useState("");
  const [builderDescription, setBuilderDescription] = useState("");
  const [builderDataSource, setBuilderDataSource] = useState<DataSourceType>("WorkOrders");
  const [builderDateRange, setBuilderDateRange] = useState("Last30Days");
  const [availableFields, setAvailableFields] = useState<ReportField[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<ReportColumn[]>([]);
  const [builderSortColumn, setBuilderSortColumn] = useState("");
  const [builderSortDesc, setBuilderSortDesc] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchTemplates = useCallback(async () => {
    if (!activeBuilding) return;
    setLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([
        reportTemplatesApi.getTemplates(activeBuilding.buildingId),
        recipientsApi.getByBuilding(activeBuilding.buildingId),
      ]);
      setTemplates(tRes.data);
      setRecipients(rRes.data);
    } catch {
      setError("Failed to load report templates.");
    } finally {
      setLoading(false);
    }
  }, [activeBuilding]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (!showBuilder) return;
    const loadFields = async () => {
      try {
        const res = await reportTemplatesApi.getFields(builderDataSource);
        setAvailableFields(res.data);
        if (selectedColumns.length === 0) {
          setSelectedColumns(
            res.data.slice(0, 5).map((f, i) => ({
              id: `col-${i}`,
              field: f.field,
              label: f.label,
              type: f.type as ReportColumn["type"],
              visible: true,
              sortable: f.sortable,
            }))
          );
        }
      } catch {
        setAvailableFields([]);
      }
    };
    loadFields();
  }, [builderDataSource, showBuilder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedColumns((cols) => {
        const oldIndex = cols.findIndex((c) => c.id === active.id);
        const newIndex = cols.findIndex((c) => c.id === over.id);
        return arrayMove(cols, oldIndex, newIndex);
      });
    }
  };

  const addColumn = (field: ReportField) => {
    if (selectedColumns.some((c) => c.field === field.field)) return;
    setSelectedColumns([
      ...selectedColumns,
      {
        id: `col-${Date.now()}`,
        field: field.field,
        label: field.label,
        type: field.type as ReportColumn["type"],
        visible: true,
        sortable: field.sortable,
      },
    ]);
  };

  const openBuilder = (template?: ReportTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setBuilderName(template.name);
      setBuilderDescription(template.description || "");
      setBuilderDataSource(template.dataSource as DataSourceType);
      setBuilderDateRange(template.defaultDateRange);
      setBuilderSortColumn(template.sortColumn || "");
      setBuilderSortDesc(template.sortDescending);
      try {
        setSelectedColumns(JSON.parse(template.columnsJson));
      } catch {
        setSelectedColumns([]);
      }
    } else {
      setEditingTemplate(null);
      setBuilderName("");
      setBuilderDescription("");
      setBuilderDataSource("WorkOrders");
      setBuilderDateRange("Last30Days");
      setBuilderSortColumn("");
      setBuilderSortDesc(false);
      setSelectedColumns([]);
    }
    setBuilderStep(1);
    setShowBuilder(true);
  };

  const closeBuilder = () => {
    setShowBuilder(false);
    setEditingTemplate(null);
  };

  const saveTemplate = async () => {
    if (!activeBuilding || !builderName.trim()) return;
    const dto: CreateTemplateDto = {
      name: builderName.trim(),
      description: builderDescription.trim() || undefined,
      dataSource: builderDataSource,
      columnsJson: JSON.stringify(selectedColumns),
      defaultDateRange: builderDateRange,
      sortColumn: builderSortColumn || undefined,
      sortDescending: builderSortDesc,
    };

    try {
      if (editingTemplate) {
        await reportTemplatesApi.updateTemplate(editingTemplate.reportTemplateId, dto);
      } else {
        await reportTemplatesApi.createTemplate(activeBuilding.buildingId, dto);
      }
      closeBuilder();
      fetchTemplates();
    } catch {
      setError("Failed to save template.");
    }
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm("Delete this report template?")) return;
    try {
      await reportTemplatesApi.deleteTemplate(id);
      fetchTemplates();
    } catch {
      setError("Failed to delete template.");
    }
  };

  const cloneTemplate = async (id: number) => {
    try {
      await reportTemplatesApi.cloneTemplate(id);
      fetchTemplates();
    } catch {
      setError("Failed to clone template.");
    }
  };

  const openSchedule = (template: ReportTemplate) => {
    setSchedulingTemplate(template);
    setScheduleCron("0 8 * * 1");
    setScheduleFormat("PDF");
    setScheduleRecipients([]);
    setShowSchedule(true);
  };

  const saveSchedule = async () => {
    if (!schedulingTemplate || scheduleRecipients.length === 0) return;
    try {
      await reportSchedulesApi.createSchedule({
        reportTemplateId: schedulingTemplate.reportTemplateId,
        cron: scheduleCron,
        enabled: true,
        exportFormat: scheduleFormat,
        recipientIds: scheduleRecipients,
      });
      setShowSchedule(false);
      fetchTemplates();
    } catch {
      setError("Failed to create schedule.");
    }
  };

  const runReport = async (template: ReportTemplate) => {
    setViewingTemplate(template);
    setViewerData(null);
    setShowViewer(true);
    try {
      const res = await reportTemplatesApi.executeReport({ reportTemplateId: template.reportTemplateId });
      setViewerData(res.data);
    } catch {
      setError("Failed to run report.");
    }
  };

  const exportPdf = async () => {
    if (!viewingTemplate) return;
    try {
      const res = await reportTemplatesApi.exportPdf({ reportTemplateId: viewingTemplate.reportTemplateId });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${viewingTemplate.name}.pdf`;
      a.click();
    } catch {
      setError("Failed to export PDF.");
    }
  };

  const exportExcel = async () => {
    if (!viewingTemplate) return;
    try {
      const res = await reportTemplatesApi.exportExcel({ reportTemplateId: viewingTemplate.reportTemplateId });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${viewingTemplate.name}.xlsx`;
      a.click();
    } catch {
      setError("Failed to export Excel.");
    }
  };

  const columns = useMemo(() => {
    if (!viewingTemplate) return [];
    try {
      return JSON.parse(viewingTemplate.columnsJson) as ReportColumn[];
    } catch {
      return [];
    }
  }, [viewingTemplate]);

  const visibleColumns = useMemo(() => columns.filter((c) => c.visible), [columns]);

  if (!activeBuilding) {
    return (
      <PageShell>
        <p style={{ color: "var(--text-muted)" }}>Select a building to manage report templates.</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="inventory-container" style={{ maxWidth: 1100 }}>
        <h1 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>Report Builder</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 0, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
          Create and manage custom report templates for your building.
        </p>

        {error && (
          <div style={{ background: "var(--danger-sub)", color: "var(--danger)", padding: "0.75rem 1rem", borderRadius: "0.5rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: "1.1rem" }}>×</button>
          </div>
        )}

        <div className="table-toolbar">
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {templates.length} template{templates.length !== 1 ? "s" : ""}
          </span>
          <div className="table-actions">
            <button className="inventory-button" onClick={() => openBuilder()}>
              <FiPlus style={{ marginRight: 4 }} /> New Template
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading templates...</p>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", border: "1px dashed var(--border)", borderRadius: "0.75rem" }}>
            <p style={{ margin: "0 0 1rem" }}>No report templates yet.</p>
            <button className="inventory-button" onClick={() => openBuilder()}>
              <FiPlus style={{ marginRight: 4 }} /> Create your first template
            </button>
          </div>
        ) : (
          <div className="template-grid">
            {templates.map((t) => (
              <div key={t.reportTemplateId} className="template-card">
                <div className="template-card-header">
                  <h3>{t.name}</h3>
                  {t.isSystem && <span className="system-badge">System</span>}
                </div>
                <div className="template-card-meta">
                  {t.dataSource} • {t.defaultDateRange.replace(/([A-Z])/g, " $1").trim()}
                  {t.scheduleCount > 0 && ` • ${t.scheduleCount} schedule${t.scheduleCount !== 1 ? "s" : ""}`}
                </div>
                {t.description && <p className="template-card-desc">{t.description}</p>}
                <div className="template-card-actions">
                  <button onClick={() => runReport(t)} title="Run Report"><FiPlay size={14} /> Run</button>
                  {!t.isSystem && <button onClick={() => openBuilder(t)} title="Edit"><FiEdit2 size={14} /> Edit</button>}
                  <button onClick={() => cloneTemplate(t.reportTemplateId)} title="Clone"><FiCopy size={14} /> Clone</button>
                  <button onClick={() => openSchedule(t)} title="Schedule"><FiClock size={14} /> Schedule</button>
                  {!t.isSystem && (
                    <button onClick={() => deleteTemplate(t.reportTemplateId)} className="danger-action" title="Delete">
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Builder Modal */}
      {showBuilder && (
        <div className="inventory-modal-backdrop" onClick={closeBuilder}>
          <div className="inventory-modal-card" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <h2>{editingTemplate ? "Edit Template" : "New Report Template"}</h2>

            {builderStep === 1 && (
              <>
                <div className="form-field">
                  <label className="user-form-label">Template Name *</label>
                  <input
                    className="inventory-modal-input"
                    value={builderName}
                    onChange={(e) => setBuilderName(e.target.value)}
                    placeholder="e.g. Monthly Filter Activity"
                  />
                </div>
                <div className="form-field">
                  <label className="user-form-label">Description</label>
                  <textarea
                    className="inventory-modal-input"
                    value={builderDescription}
                    onChange={(e) => setBuilderDescription(e.target.value)}
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
                <div className="form-field">
                  <label className="user-form-label">Data Source *</label>
                  <div className="data-source-grid">
                    {[
                      { value: "WorkOrders", label: "Work Orders", desc: "Filter changes, due dates, technicians" },
                      { value: "Inventory", label: "Inventory", desc: "Stock levels, reorder recommendations" },
                      { value: "Technicians", label: "Technicians", desc: "Performance metrics, completion rates" },
                      { value: "Compliance", label: "Compliance", desc: "Building-level compliance data" },
                    ].map((ds) => (
                      <div
                        key={ds.value}
                        className={`data-source-option ${builderDataSource === ds.value ? "selected" : ""}`}
                        onClick={() => setBuilderDataSource(ds.value as DataSourceType)}
                      >
                        <strong>{ds.label}</strong>
                        <span>{ds.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-field">
                  <label className="user-form-label">Default Date Range</label>
                  <select
                    className="inventory-modal-input"
                    value={builderDateRange}
                    onChange={(e) => setBuilderDateRange(e.target.value)}
                  >
                    <option value="Last7Days">Last 7 Days</option>
                    <option value="Last30Days">Last 30 Days</option>
                    <option value="Last90Days">Last 90 Days</option>
                    <option value="LastYear">Last Year</option>
                  </select>
                </div>
              </>
            )}

            {builderStep === 2 && (
              <>
                <p style={{ marginTop: 0, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  Drag to reorder columns. Uncheck to hide from report output.
                </p>
                <div className="columns-config-grid">
                  <div className="columns-panel">
                    <h4>Available Fields</h4>
                    {availableFields.filter((f) => !selectedColumns.some((c) => c.field === f.field)).map((f) => (
                      <div key={f.field} className="available-field-item" onClick={() => addColumn(f)}>
                        <span>{f.label}</span>
                        <span className="column-type-badge">{f.type}</span>
                      </div>
                    ))}
                    {availableFields.filter((f) => !selectedColumns.some((c) => c.field === f.field)).length === 0 && (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>All fields added</p>
                    )}
                  </div>
                  <div className="columns-panel">
                    <h4>Selected Columns</h4>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={selectedColumns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                        {selectedColumns.map((col) => (
                          <SortableColumn
                            key={col.id}
                            column={col}
                            onToggle={() =>
                              setSelectedColumns((cols) =>
                                cols.map((c) => (c.id === col.id ? { ...c, visible: !c.visible } : c))
                              )
                            }
                            onRemove={() => setSelectedColumns((cols) => cols.filter((c) => c.id !== col.id))}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                    {selectedColumns.length === 0 && (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>Click fields to add</p>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label className="user-form-label">Sort By</label>
                    <select className="inventory-modal-input" value={builderSortColumn} onChange={(e) => setBuilderSortColumn(e.target.value)}>
                      <option value="">None</option>
                      {selectedColumns.map((c) => (
                        <option key={c.field} value={c.field}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field" style={{ width: 140 }}>
                    <label className="user-form-label">Order</label>
                    <select className="inventory-modal-input" value={builderSortDesc ? "desc" : "asc"} onChange={(e) => setBuilderSortDesc(e.target.value === "desc")}>
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="inventory-modal-actions">
              <button type="button" className="button inventory-modal-cancel" onClick={closeBuilder}>Cancel</button>
              {builderStep > 1 && (
                <button type="button" className="button inventory-modal-cancel" onClick={() => setBuilderStep(1)}>Back</button>
              )}
              {builderStep < 2 ? (
                <button type="button" className="button" onClick={() => setBuilderStep(2)} disabled={!builderName.trim()}>
                  Next: Configure Columns
                </button>
              ) : (
                <button type="button" className="button" onClick={saveTemplate} disabled={selectedColumns.length === 0}>
                  {editingTemplate ? "Save Changes" : "Create Template"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Viewer Modal */}
      {showViewer && viewingTemplate && (
        <div className="inventory-modal-backdrop" onClick={() => setShowViewer(false)}>
          <div className="inventory-modal-card" style={{ maxWidth: 1000 }} onClick={(e) => e.stopPropagation()}>
            <h2>{viewingTemplate.name}</h2>

            {!viewerData ? (
              <p style={{ color: "var(--text-muted)" }}>Loading report data...</p>
            ) : (
              <>
                <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  <span><strong>{viewerData.totalRows}</strong> rows</span>
                  <span><strong>{viewerData.executionMs}</strong>ms execution</span>
                </div>

                <ReportCharts
                  dataSource={viewingTemplate.dataSource}
                  data={viewerData.rows}
                  columns={visibleColumns}
                />

                <div className="data-table-wrap" style={{ marginTop: "1rem" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        {visibleColumns.map((c) => (
                          <th key={c.field}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {viewerData.rows.length === 0 ? (
                        <tr>
                          <td colSpan={visibleColumns.length} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                            No data for selected date range.
                          </td>
                        </tr>
                      ) : (
                        viewerData.rows.slice(0, 100).map((row, i) => (
                          <tr key={i}>
                            {visibleColumns.map((c) => (
                              <td key={c.field}>{formatValue(row[c.field], c.type)}</td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {viewerData.totalRows > 100 && (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                    Showing 100 of {viewerData.totalRows} rows
                  </p>
                )}
              </>
            )}

            <div className="inventory-modal-actions">
              <button type="button" className="inventory-button inventory-button--secondary" onClick={exportPdf}>
                <FiDownload size={14} /> PDF
              </button>
              <button type="button" className="inventory-button inventory-button--secondary" onClick={exportExcel}>
                <FiDownload size={14} /> Excel
              </button>
              <button type="button" className="button" onClick={() => setShowViewer(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showSchedule && schedulingTemplate && (
        <div className="inventory-modal-backdrop" onClick={() => setShowSchedule(false)}>
          <div className="inventory-modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h2>Schedule Report</h2>
            <p style={{ margin: "0 0 1rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Scheduling: <strong>{schedulingTemplate.name}</strong>
            </p>

            <div className="form-field">
              <label className="user-form-label">Schedule</label>
              <select className="inventory-modal-input" value={scheduleCron} onChange={(e) => setScheduleCron(e.target.value)}>
                <option value="0 8 * * 1">Weekly on Monday at 8:00 AM</option>
                <option value="0 8 * * *">Daily at 8:00 AM</option>
                <option value="0 8 1 * *">Monthly on the 1st at 8:00 AM</option>
                <option value="0 8 * * 5">Weekly on Friday at 8:00 AM</option>
              </select>
            </div>

            <div className="form-field">
              <label className="user-form-label">Export Format</label>
              <select className="inventory-modal-input" value={scheduleFormat} onChange={(e) => setScheduleFormat(e.target.value)}>
                <option value="PDF">PDF</option>
                <option value="Excel">Excel</option>
              </select>
            </div>

            <div className="form-field">
              <label className="user-form-label">Recipients</label>
              <div className="recipients-list">
                {recipients.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>No recipients configured. Add them in Settings.</p>
                ) : (
                  recipients.map((r) => (
                    <label key={r.recipientId} className="recipient-checkbox">
                      <input
                        type="checkbox"
                        checked={scheduleRecipients.includes(r.recipientId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setScheduleRecipients([...scheduleRecipients, r.recipientId]);
                          } else {
                            setScheduleRecipients(scheduleRecipients.filter((id) => id !== r.recipientId));
                          }
                        }}
                      />
                      <span>{r.name}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{r.email}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="inventory-modal-actions">
              <button type="button" className="button inventory-modal-cancel" onClick={() => setShowSchedule(false)}>Cancel</button>
              <button type="button" className="button" onClick={saveSchedule} disabled={scheduleRecipients.length === 0}>
                Create Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function formatValue(value: unknown, type: string): string {
  if (value == null) return "—";
  if (type === "date" && typeof value === "string") {
    return new Date(value).toLocaleDateString();
  }
  if (type === "number" && typeof value === "number") {
    return value.toLocaleString();
  }
  return String(value);
}
