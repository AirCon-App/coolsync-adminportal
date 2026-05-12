import React, { useState, useEffect } from "react";
import PageShell from "../components/PageShell";
import api from "../data/api";
import { useBuilding } from "../context/BuildingContext";

export default function AreasPage() {
  const { activeBuilding } = useBuilding();
  const [areas, setAreas] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [deletingArea, setDeletingArea] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (!activeBuilding) return;
    api.get(`/BuildingAreas?buildingId=${activeBuilding.buildingId}`).then((res) => setAreas(res.data));
  }, [activeBuilding]);

  const refresh = () =>
    api.get(`/BuildingAreas?buildingId=${activeBuilding.buildingId}`).then((res) => setAreas(res.data));

  const handleAdd = async (form) => {
    await api.post("/BuildingAreas", { ...form, buildingId: activeBuilding.buildingId });
    await refresh();
    setShowAddModal(false);
  };

  const handleEdit = async (form) => {
    await api.put(`/BuildingAreas/${editingArea.id}`, { ...form, buildingId: activeBuilding.buildingId });
    await refresh();
    setEditingArea(null);
  };

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await api.delete(`/BuildingAreas/${deletingArea.id}`);
      setAreas((prev) => prev.filter((a) => a.id !== deletingArea.id));
      setDeletingArea(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.response?.data || "Failed to delete area.");
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
              <button className="inventory-button" onClick={() => setShowAddModal(true)}>
                <span>+</span> Add area
              </button>
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Sort order</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {areas.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                        No areas yet. Add one to start grouping air handlers.
                      </td>
                    </tr>
                  )}
                  {areas.map((a) => (
                    <tr key={a.id} className="data-table-row">
                      <td className="td-primary">{a.name}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
            <p className="table-count">{areas.length} area{areas.length !== 1 ? "s" : ""}</p>
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
              <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
                {typeof deleteError === "string" ? deleteError : "Failed to delete."}
              </p>
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

function AreaFormModal({ title, initial = {}, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial.name || "",
    sortOrder: initial.sortOrder ?? 0,
  });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await onSave({ ...form, sortOrder: Number(form.sortOrder) });
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data || "Something went wrong.");
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
            <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: 0 }}>
              {typeof error === "string" ? error : "Something went wrong."}
            </p>
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
