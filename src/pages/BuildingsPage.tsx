import React, { useState, useEffect } from "react";
import PageShell from "../components/PageShell";
import api from "../data/api";
import type { Building } from "../types";
import { getErrorMessage } from "../utils/apiError";
import { Pagination } from "../components/Pagination";

const PAGE_SIZE = 25;

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [deletingBuilding, setDeletingBuilding] = useState<Building | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    const t = setTimeout(() => {
      api.get(`/Buildings?${params}`).then((res) => {
        if (!mounted) return;
        setBuildings(res.data.items);
        setTotalCount(res.data.totalCount);
      }).catch(() => { if (mounted) { setBuildings([]); setTotalCount(0); } });
    }, 250);
    return () => { mounted = false; clearTimeout(t); };
  }, [page, search]);

  const refreshPage = async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    const res = await api.get(`/Buildings?${params}`);
    setBuildings(res.data.items);
    setTotalCount(res.data.totalCount);
  };

  const handleAdd = async (form) => {
    await api.post<Building>("/Buildings", form);
    await refreshPage();
    setShowAddModal(false);
  };

  const handleEdit = async (form) => {
    if (!editingBuilding) return;
    await api.put(`/Buildings/${editingBuilding.buildingId}`, form);
    await refreshPage();
    setEditingBuilding(null);
  };

  const handleDelete = async () => {
    if (!deletingBuilding) return;
    setDeleteError(null);
    try {
      await api.delete(`/Buildings/${deletingBuilding.buildingId}`);
      await refreshPage();
      setDeletingBuilding(null);
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    }
  };

  return (
    <PageShell>
      <div className="inventory-container" style={{ maxWidth: 860 }}>
        <h1 style={{ color: "var(--text-primary)", marginBottom: "0.75rem" }}>
          Manage buildings
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 0, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
          Add, edit, or remove buildings. Only super admins can access this page.
        </p>

        <div className="table-toolbar">
          <div className="table-actions">
            <button className="inventory-button" onClick={() => setShowAddModal(true)}>
              <span>+</span> Add building
            </button>
          </div>
          <input
            className="table-filter-select"
            style={{ maxWidth: 240 }}
            placeholder="Search buildings…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {buildings.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    No buildings yet.
                  </td>
                </tr>
              )}
              {buildings.map((b) => (
                <tr key={b.buildingId} className="data-table-row">
                  <td className="td-primary">{b.name}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{b.address || <span className="td-empty">—</span>}</td>
                  <td className="td-mono" style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>#{b.buildingId}</td>
                  <td>
                    <div className="user-row-actions">
                      <button className="user-action-btn" onClick={() => setEditingBuilding(b)}>Edit</button>
                      <button
                        className="user-action-btn user-action-btn--danger"
                        onClick={() => { setDeletingBuilding(b); setDeleteError(null); }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
        <p className="table-count">{totalCount} building{totalCount !== 1 ? "s" : ""}</p>
      </div>

      {showAddModal && (
        <BuildingFormModal
          title="Add building"
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingBuilding && (
        <BuildingFormModal
          title="Edit building"
          initial={editingBuilding}
          onSave={handleEdit}
          onClose={() => setEditingBuilding(null)}
        />
      )}

      {deletingBuilding && (
        <div className="inventory-modal-backdrop" onClick={() => { setDeletingBuilding(null); setDeleteError(null); }}>
          <div className="inventory-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Delete building</h2>
            <p>
              Are you sure you want to delete{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{deletingBuilding.name}</span>?
              This will also remove all associated air handlers and inventory. This cannot be undone.
            </p>
            {deleteError && (
              <div className="alert alert--danger alert--inline" style={{ marginTop: "0.25rem" }}>
                {typeof deleteError === "string" ? deleteError : "Failed to delete."}
              </div>
            )}
            <div className="inventory-modal-actions">
              <button
                className="button inventory-modal-cancel"
                onClick={() => { setDeletingBuilding(null); setDeleteError(null); }}
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

interface BuildingFormData { name: string; address: string; }
interface BuildingFormModalProps { title: string; initial?: Partial<Building>; onSave: (form: BuildingFormData) => Promise<void>; onClose: () => void; }

function BuildingFormModal({ title, initial = {}, onSave, onClose }: BuildingFormModalProps) {
  const [form, setForm] = useState<BuildingFormData>({
    name: initial.name ?? "",
    address: initial.address ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="inventory-modal-backdrop" onClick={onClose}>
      <div className="inventory-modal-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <label className="user-form-label">Building name</label>
            <input
              className="inventory-modal-input"
              style={{ marginBottom: 0 }}
              placeholder="Caesar's Superdome"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="user-form-label">Address</label>
            <input
              className="inventory-modal-input"
              style={{ marginBottom: 0 }}
              placeholder="1 Superdome Dr, New Orleans, LA"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            />
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
