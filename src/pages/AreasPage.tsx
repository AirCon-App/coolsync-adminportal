import React, { useState, useEffect, useMemo } from "react";
import PageShell from "../components/PageShell";
import api from "../data/api";
import { getErrorMessage } from "../utils/apiError";
import { useBuilding } from "../context/BuildingContext";
import { Pagination } from "../components/Pagination";

interface Area { id: number; name: string; sortOrder: number; }
interface AreaHandler { id: number; airHandlerGuid: string; name: string; areaLabel?: string | null; }

const PAGE_SIZE = 25;

export default function AreasPage() {
  const { activeBuilding } = useBuilding();
  const [areas, setAreas] = useState<Area[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [deletingArea, setDeletingArea] = useState<Area | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [handlers, setHandlers] = useState<AreaHandler[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => { setPage(1); setExpanded(new Set()); }, [activeBuilding]);

  // Load all air handlers for this building once, grouped client-side by area.
  useEffect(() => {
    if (!activeBuilding) { setHandlers([]); return; }
    let mounted = true;
    api.get(`/AirHandlers?buildingId=${activeBuilding.buildingId}`).then((res) => {
      if (mounted) setHandlers(res.data.items);
    }).catch(() => { if (mounted) setHandlers([]); });
    return () => { mounted = false; };
  }, [activeBuilding]);

  const handlersByArea = useMemo(() => {
    const map = new Map<string, AreaHandler[]>();
    handlers.forEach((h) => {
      const key = (h.areaLabel ?? "").trim();
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    });
    map.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
    return map;
  }, [handlers]);

  const toggleExpanded = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  useEffect(() => {
    if (!activeBuilding) return;
    let mounted = true;
    const params = new URLSearchParams({
      buildingId: String(activeBuilding.buildingId),
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);
    const t = setTimeout(() => {
      api.get(`/BuildingAreas?${params}`).then((res) => {
        if (!mounted) return;
        setAreas(res.data.items);
        setTotalCount(res.data.totalCount);
      }).catch(() => { if (mounted) { setAreas([]); setTotalCount(0); } });
    }, 250);
    return () => { mounted = false; clearTimeout(t); };
  }, [activeBuilding, page, search]);

  const refresh = async () => {
    if (!activeBuilding) return;
    const params = new URLSearchParams({
      buildingId: String(activeBuilding.buildingId),
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);
    const [areasRes, handlersRes] = await Promise.all([
      api.get(`/BuildingAreas?${params}`),
      api.get(`/AirHandlers?buildingId=${activeBuilding.buildingId}`),
    ]);
    setAreas(areasRes.data.items);
    setTotalCount(areasRes.data.totalCount);
    setHandlers(handlersRes.data.items);
  };

  const handleAdd = async (form) => {
    if (!activeBuilding) return;
    await api.post("/BuildingAreas", { ...form, buildingId: activeBuilding.buildingId });
    await refresh();
    setShowAddModal(false);
  };

  const handleEdit = async (form) => {
    if (!activeBuilding || !editingArea) return;
    await api.put(`/BuildingAreas/${editingArea.id}`, { ...form, buildingId: activeBuilding.buildingId });
    await refresh();
    setEditingArea(null);
  };

  const handleDelete = async () => {
    if (!deletingArea) return;
    setDeleteError(null);
    try {
      await api.delete(`/BuildingAreas/${deletingArea.id}`);
      await refresh();
      setDeletingArea(null);
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    }
  };

  return (
    <PageShell>
      <div className="inventory-container" style={{ maxWidth: 860 }}>
        <h1 style={{ color: "var(--text-primary)", marginBottom: "0.75rem" }}>
          Manage areas
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 0, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
          Define floors and areas for this building. Air handlers are grouped by area on the dashboard and in reports.
        </p>

        {!activeBuilding ? (
          <p style={{ color: "var(--text-muted)" }}>Select a building to manage its areas.</p>
        ) : (
          <>
            <div className="table-toolbar">
              <div className="table-actions">
                <button className="inventory-button" onClick={() => setShowAddModal(true)}>
                  <span>+</span> Add area
                </button>
              </div>
              <input
                className="table-filter-select"
                style={{ maxWidth: 220 }}
                placeholder="Search areas…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Air handlers</th>
                    <th>Sort order</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {areas.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                        No areas yet. Add one to start grouping air handlers.
                      </td>
                    </tr>
                  )}
                  {areas.map((a) => {
                    const areaHandlers = handlersByArea.get(a.name.trim()) ?? [];
                    const isExpanded = expanded.has(a.id);
                    const hasHandlers = areaHandlers.length > 0;
                    return (
                      <React.Fragment key={a.id}>
                        <tr className="data-table-row">
                          <td className="td-primary">
                            <button
                              type="button"
                              onClick={() => hasHandlers && toggleExpanded(a.id)}
                              disabled={!hasHandlers}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                background: "none",
                                border: "none",
                                padding: 0,
                                font: "inherit",
                                color: "inherit",
                                cursor: hasHandlers ? "pointer" : "default",
                              }}
                              aria-expanded={isExpanded}
                            >
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  width: "0.8rem",
                                  color: "var(--text-muted)",
                                  visibility: hasHandlers ? "visible" : "hidden",
                                }}
                              >
                                {isExpanded ? "▼" : "▶"}
                              </span>
                              {a.name}
                            </button>
                          </td>
                          <td style={{ color: "var(--text-secondary)" }}>
                            {hasHandlers
                              ? `${areaHandlers.length} unit${areaHandlers.length !== 1 ? "s" : ""}`
                              : <span className="td-empty">—</span>}
                          </td>
                          <td style={{ color: "var(--text-secondary)" }}>{a.sortOrder}</td>
                          <td>
                            <div className="user-row-actions">
                              <button className="user-action-btn" onClick={() => setEditingArea(a)}>Edit</button>
                              <button
                                className="user-action-btn user-action-btn--danger"
                                onClick={() => { setDeletingArea(a); setDeleteError(null); }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && hasHandlers && (
                          <tr>
                            <td colSpan={4} style={{ padding: 0, background: "var(--bg-subtle)" }}>
                              <ul style={{ listStyle: "none", margin: 0, padding: "0.5rem 1rem 0.5rem 2.4rem" }}>
                                {areaHandlers.map((h) => (
                                  <li
                                    key={h.id}
                                    style={{
                                      padding: "0.35rem 0",
                                      color: "var(--text-secondary)",
                                      fontSize: "0.9rem",
                                      borderBottom: "1px solid var(--border)",
                                    }}
                                  >
                                    {h.name}
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
            <p className="table-count">{totalCount} area{totalCount !== 1 ? "s" : ""}</p>
          </>
        )}
      </div>

      {showAddModal && (
        <AreaFormModal
          title="Add area"
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingArea && (
        <AreaFormModal
          title="Edit area"
          initial={editingArea}
          onSave={handleEdit}
          onClose={() => setEditingArea(null)}
        />
      )}

      {deletingArea && (
        <div className="inventory-modal-backdrop" onClick={() => { setDeletingArea(null); setDeleteError(null); }}>
          <div className="inventory-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Delete area</h2>
            <p>
              Are you sure you want to delete{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{deletingArea.name}</span>?
              Air handlers in this area will become ungrouped.
            </p>
            {deleteError && (
              <div className="alert alert--danger alert--inline" style={{ marginTop: "0.25rem" }}>
                {typeof deleteError === "string" ? deleteError : "Failed to delete."}
              </div>
            )}
            <div className="inventory-modal-actions">
              <button
                className="button inventory-modal-cancel"
                onClick={() => { setDeletingArea(null); setDeleteError(null); }}
              >
                Cancel
              </button>
              <button className="button" style={{ background: "var(--danger)" }} onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function AreaFormModal({ title, initial = {} as any, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial.name || "",
    sortOrder: initial.sortOrder ?? 0,
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await onSave({ ...form, sortOrder: Number(form.sortOrder) });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="inventory-modal-backdrop" onClick={onClose}>
      <div className="inventory-modal-card" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <label className="user-form-label">Name *</label>
            <input
              className="inventory-modal-input"
              style={{ marginBottom: 0 }}
              placeholder="e.g. Floor 1, Lobby, Mechanical Room"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="user-form-label">Sort order</label>
            <input
              className="inventory-modal-input"
              style={{ marginBottom: 0 }}
              type="number"
              min="0"
              placeholder="0"
              value={form.sortOrder}
              onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
            />
            <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.75rem" }}>
              Lower numbers appear first. Leave as 0 for alphabetical ordering.
            </p>
          </div>
          {error && (
            <div className="alert alert--danger alert--inline">
              {typeof error === "string" ? error : "Something went wrong."}
            </div>
          )}
          <div className="inventory-modal-actions" style={{ marginTop: "0.5rem" }}>
            <button type="button" className="button inventory-modal-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="button">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
