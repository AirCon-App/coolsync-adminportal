import { useState, useEffect, useMemo, useCallback } from "react";
import { TbPencil } from "react-icons/tb";
import PageShell from "../components/PageShell";
import WorkOrderEditModal, { WorkOrderModalData } from "../components/WorkOrderEditModal";
import { Pagination } from "../components/Pagination";
import { useBuilding } from "../context/BuildingContext";
import api from "../data/api";
import { getErrorMessage } from "../utils/apiError";

const STATUS_OPTIONS = ["Open", "DueSoon", "Overdue", "Completed"];

const STATUS_COLORS: Record<string, string> = {
  Completed: "var(--success)",
  Overdue: "var(--danger)",
  DueSoon: "var(--warning)",
  Open: "var(--accent)",
};

const PAGE_SIZE = 25;

export default function WorkOrdersPage() {
  const { activeBuilding } = useBuilding();
  const buildingId = activeBuilding?.buildingId;

  const [rows, setRows] = useState<WorkOrderModalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dueBefore, setDueBefore] = useState("");
  const [dueAfter, setDueAfter] = useState("");
  const [page, setPage] = useState(1);

  const [editTarget, setEditTarget] = useState<WorkOrderModalData | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!buildingId) return;
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({ buildingId: String(buildingId) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (dueBefore) params.set("dueBefore", new Date(dueBefore).toISOString());
      if (dueAfter) params.set("dueAfter", new Date(dueAfter).toISOString());
      const res = await api.get(`/WorkOrders?${params.toString()}`);
      setRows(res.data);
      setPage(1);
    } catch (err) {
      setFetchError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [buildingId, search, statusFilter, dueBefore, dueAfter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  const handleSaved = (updated: WorkOrderModalData) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
  };

  const handleEditClick = useCallback(async (wo: WorkOrderModalData) => {
    try {
      const res = await api.get(`/WorkOrders/${wo.id}`);
      setEditTarget(res.data);
    } catch {
      setEditTarget(wo);
    }
  }, []);

  if (!activeBuilding) {
    return (
      <PageShell>
        <div className="dash-empty-state">
          <p className="dash-empty-label">Select a building to view work orders.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="inventory-container" style={{ maxWidth: 1100 }}>
        <h1 style={{ color: "var(--text-primary)", marginBottom: "0.25rem" }}>Work Orders</h1>
        <p style={{ color: "var(--text-secondary)", margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
          {activeBuilding.name} · {rows.length} order{rows.length !== 1 ? "s" : ""}
        </p>

        <div className="table-toolbar">
          <input
            className="table-search"
            type="text"
            placeholder="Search by handler name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <div className="table-actions">
            <select
              className="table-filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>After</label>
              <input
                type="date"
                className="table-filter-select"
                value={dueAfter}
                onChange={(e) => { setDueAfter(e.target.value); setPage(1); }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Before</label>
              <input
                type="date"
                className="table-filter-select"
                value={dueBefore}
                onChange={(e) => { setDueBefore(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </div>

        {fetchError && (
          <div className="alert alert--danger" style={{ marginBottom: "1rem" }}>
            <span className="alert__icon">!</span>
            <span className="alert__body">{fetchError}</span>
          </div>
        )}

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No work orders match the current filters.</p>
        ) : (
          <>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Handler</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Completed</th>
                    <th>Technician</th>
                    <th>Qty</th>
                    <th>Origin</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((wo) => (
                    <tr key={wo.id} className="data-table-row">
                      <td style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{wo.id}</td>
                      <td style={{ fontWeight: 500 }}>
                        {wo.handlerName ?? wo.handler?.toString().slice(0, 8) + "…"}
                      </td>
                      <td>
                        <span style={{
                          background: STATUS_COLORS[wo.status] ?? "var(--text-muted)",
                          color: "#fff",
                          borderRadius: "999px",
                          padding: "2px 10px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}>
                          {wo.status}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                        {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                        {wo.completedDate ? new Date(wo.completedDate).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {wo.technicianName ?? "Unassigned"}
                      </td>
                      <td style={{ color: "var(--text-secondary)", textAlign: "center" }}>
                        {wo.count}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        {wo.origin ?? "—"}
                      </td>
                      <td>
                        <button
                          className="icon-btn"
                          aria-label="Edit work order"
                          onClick={(e) => { e.stopPropagation(); handleEditClick(wo); }}
                        >
                          <TbPencil size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination page={page} pageSize={PAGE_SIZE} totalCount={rows.length} onPageChange={setPage} />
          </>
        )}
      </div>

      {editTarget && (
        <WorkOrderEditModal
          workOrder={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => { handleSaved(updated); setEditTarget(null); }}
        />
      )}
    </PageShell>
  );
}
