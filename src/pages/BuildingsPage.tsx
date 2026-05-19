import React, { useState, useEffect } from "react";
import PageShell from "../components/PageShell";
import api from "../data/api";

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [deletingBuilding, setDeletingBuilding] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    api.get("/Buildings").then((res) => setBuildings(res.data));
  }, []);

  const handleAdd = async (form) => {
    await api.post("/Buildings", form);
    const res = await api.get("/Buildings");
    setBuildings(res.data);
    setShowAddModal(false);
  };

  const handleEdit = async (form) => {
    await api.put(`/Buildings/${editingBuilding.buildingId}`, form);
    const res = await api.get("/Buildings");
    setBuildings(res.data);
    setEditingBuilding(null);
  };

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await api.delete(`/Buildings/${deletingBuilding.buildingId}`);
      setBuildings((prev) => prev.filter((b) => b.buildingId !== deletingBuilding.buildingId));
      setDeletingBuilding(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.response?.data || "Failed to delete building.");
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
        <p className="table-count">{buildings.length} building{buildings.length !== 1 ? "s" : ""}</p>
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
              <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
                {typeof deleteError === "string" ? deleteError : "Failed to delete."}
              </p>
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

function BuildingFormModal({ title, initial = {} as any, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial.name || "",
    address: initial.address || "",
  });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data || "Something went wrong.");
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
