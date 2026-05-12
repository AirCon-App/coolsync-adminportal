import React, { useState, useEffect, useMemo } from "react";
import PageShell from "../components/PageShell";
import api from "../data/api";
import { useBuilding } from "../context/BuildingContext";

function StockBadge({ qty, minLevel }) {
  const low = minLevel > 0 ? qty < minLevel : qty === 0;
  return (
    <span
      className="stock-badge"
      style={{
        background: low ? "var(--danger-sub)" : "rgba(34,197,94,0.12)",
        color: low ? "var(--danger)" : "var(--success)",
      }}
    >
      {low ? "Low stock" : "In stock"}
    </span>
  );
}

export default function InventoryPage() {
  const [data, setData] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editQty, setEditQty] = useState(0);
  const [editMinLevel, setEditMinLevel] = useState(0);
  const [editReorderQty, setEditReorderQty] = useState(0);
  const [catalogItems, setCatalogItems] = useState([]);
  const [form, setForm] = useState({ catalogItemId: "", quantity: 1 });
  const [addError, setAddError] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const { activeBuilding } = useBuilding();

  useEffect(() => {
    if (!activeBuilding) return;
    api.get(`/Inventory?buildingId=${activeBuilding.buildingId}`).then((res) => setData(res.data));
  }, [activeBuilding]);

  const handleOpenAdd = () => {
    setAddError(null);
    setForm({ catalogItemId: "", quantity: 1 });
    if (catalogItems.length === 0) {
      api.get("/ItemCatalog").then((res) => setCatalogItems(res.data));
    }
    setShowAddModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    setEditQty(item.quantity);
    setEditMinLevel(item.minLevel ?? 0);
    setEditReorderQty(item.reorderQty ?? 0);
    setShowEditModal(true);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError(null);
    try {
      await api.post("/Inventory", {
        catalogItemId: Number(form.catalogItemId),
        buildingId: activeBuilding.buildingId,
        quantity: Number(form.quantity),
      });
      const res = await api.get(`/Inventory?buildingId=${activeBuilding.buildingId}`);
      setData(res.data);
      setShowAddModal(false);
    } catch (err) {
      setAddError(err.response?.data || "Failed to add inventory item.");
    }
  };

  const handleSaveQty = async () => {
    try {
      await api.put(`/Inventory/${editItem.itemNumber}`, {
        itemNumber: editItem.itemNumber,
        catalogItemId: editItem.catalogItem.catalogItemId,
        buildingId: editItem.buildingId,
        quantity: editQty,
        minLevel: editMinLevel,
        reorderQty: editReorderQty,
      });
      setData((prev) =>
        prev.map((item) =>
          item.itemNumber === editItem.itemNumber
            ? { ...item, quantity: editQty, minLevel: editMinLevel, reorderQty: editReorderQty }
            : item
        )
      );
      setShowEditModal(false);
    } catch (err) {
      console.error("Failed to update inventory:", err);
    }
  };

  const handleOpenUpload = () => {
    setUploadFile(null);
    setUploadStatus(null);
    setUploadError(null);
    setShowUploadModal(true);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadStatus(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await api.post(`/Inventory/upload?buildingId=${activeBuilding.buildingId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadStatus(res.data.message || "Upload successful.");
      const updated = await api.get(`/Inventory?buildingId=${activeBuilding.buildingId}`);
      setData(updated.data);
    } catch (err) {
      setUploadError(err.response?.data || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = data;

    if (q) {
      rows = rows.filter(
        (item) =>
          item.catalogItem.name?.toLowerCase().includes(q) ||
          item.catalogItem.sku?.toLowerCase().includes(q)
      );
    }

    if (stockFilter === "low") {
      rows = rows.filter((item) => item.minLevel > 0 ? item.quantity < item.minLevel : item.quantity === 0);
    } else if (stockFilter === "in") {
      rows = rows.filter((item) => item.minLevel > 0 ? item.quantity >= item.minLevel : item.quantity > 0);
    }

    return [...rows].sort((a, b) => {
      let av, bv;
      if (sortKey === "quantity") {
        av = a.quantity ?? 0;
        bv = b.quantity ?? 0;
        return sortDir === "asc" ? av - bv : bv - av;
      }
      if (sortKey === "sku") {
        av = (a.catalogItem.sku ?? "").toLowerCase();
        bv = (b.catalogItem.sku ?? "").toLowerCase();
      } else {
        av = (a.catalogItem.name ?? "").toLowerCase();
        bv = (b.catalogItem.name ?? "").toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, search, stockFilter, sortKey, sortDir]);

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <PageShell>
      <div className="inventory-container" style={{ maxWidth: 900 }}>
        <h1 style={{ color: "var(--text-primary)", marginBottom: "0.75rem" }}>
          Manage inventory
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            marginTop: 0,
            marginBottom: "1.5rem",
            fontSize: "0.95rem",
          }}
        >
          View and manage inventory items for this building.
        </p>

        <div className="table-toolbar">
          <input
            className="table-search"
            type="text"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="table-filter-select"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="all">All stock levels</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
          </select>
          <button className="inventory-button inventory-button--secondary" onClick={handleOpenUpload}>
            Bulk Upload
          </button>
          <button className="inventory-button" onClick={handleOpenAdd}>
            <span>+</span> Add Inventory Item
          </button>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("name")}>Item name <SortIcon col="name" /></th>
                <th onClick={() => handleSort("sku")}>SKU <SortIcon col="sku" /></th>
                <th onClick={() => handleSort("quantity")}>Qty <SortIcon col="quantity" /></th>
                <th>Min Level</th>
                <th>Reorder Qty</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    {search || stockFilter !== "all" ? "No items match your filters." : "No inventory items yet."}
                  </td>
                </tr>
              )}
              {filtered.map((item) => (
                <tr
                  key={item.itemNumber}
                  className="data-table-row"
                  onClick={() => handleOpenEdit(item)}
                >
                  <td className="td-primary">{item.catalogItem.name}</td>
                  <td className="td-mono">{item.catalogItem.sku || <span className="td-empty">—</span>}</td>
                  <td>{item.quantity}</td>
                  <td>{item.minLevel > 0 ? item.minLevel : <span className="td-empty">—</span>}</td>
                  <td>{item.reorderQty > 0 ? item.reorderQty : <span className="td-empty">—</span>}</td>
                  <td><StockBadge qty={item.quantity} minLevel={item.minLevel ?? 0} /></td>
                  <td className="td-arrow">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="table-count">{filtered.length} of {data.length} item{data.length !== 1 ? "s" : ""}</p>
      </div>

      {showAddModal && (
        <div className="inventory-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div
            className="inventory-modal-card"
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Add inventory item</h2>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label className="user-form-label">Catalog item</label>
                <select
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  value={form.catalogItemId}
                  onChange={(e) => setForm((p) => ({ ...p, catalogItemId: e.target.value }))}
                  required
                >
                  <option value="">— Select an item —</option>
                  {catalogItems.map((c) => (
                    <option key={c.catalogItemId} value={c.catalogItemId}>
                      {c.name} {c.sku ? `(${c.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="user-form-label">Quantity</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                  required
                />
              </div>
              {addError && (
                <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: 0 }}>
                  {typeof addError === "string" ? addError : "Failed to add item."}
                </p>
              )}
              <div className="inventory-modal-actions" style={{ marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="button inventory-modal-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button">
                  Add item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="inventory-modal-backdrop" onClick={() => setShowUploadModal(false)}>
          <div
            className="inventory-modal-card"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Bulk upload inventory</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 0 }}>
              Upload a CSV file to add inventory. Quantities will be <strong>added</strong> to existing totals for this building.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 0 }}>
              Required columns: <code>Filter Name</code>, <code>Quantity</code>. Optional: <code>SKU</code>, <code>MinLevel</code>, <code>ReorderQty</code>.
            </p>
            <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <input
                type="file"
                accept=".csv"
                className="inventory-modal-input"
                style={{ marginBottom: 0, cursor: "pointer" }}
                onChange={(e) => setUploadFile(e.target.files[0] || null)}
                required
              />
              {uploadError && (
                <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: 0 }}>
                  {typeof uploadError === "string" ? uploadError : "Upload failed."}
                </p>
              )}
              {uploadStatus && (
                <p style={{ color: "var(--success)", fontSize: "0.85rem", margin: 0 }}>
                  {uploadStatus}
                </p>
              )}
              <div className="inventory-modal-actions" style={{ marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="button inventory-modal-cancel"
                  onClick={() => setShowUploadModal(false)}
                >
                  {uploadStatus ? "Close" : "Cancel"}
                </button>
                {!uploadStatus && (
                  <button type="submit" className="button" disabled={uploading}>
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editItem && (
        <div className="inventory-modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div
            className="inventory-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Edit inventory item</h2>
            <p style={{ marginTop: 0 }}>
              <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                {editItem.catalogItem.name}
              </span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label className="user-form-label">Quantity on hand</label>
                <input
                  type="number"
                  min="0"
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  value={editQty}
                  onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) setEditQty(v); }}
                />
              </div>
              <div>
                <label className="user-form-label">Minimum level</label>
                <input
                  type="number"
                  min="0"
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  value={editMinLevel}
                  onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) setEditMinLevel(v); }}
                  placeholder="0 = no minimum set"
                />
              </div>
              <div>
                <label className="user-form-label">Reorder quantity</label>
                <input
                  type="number"
                  min="0"
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  value={editReorderQty}
                  onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) setEditReorderQty(v); }}
                  placeholder="0 = not set"
                />
              </div>
            </div>
            <div className="inventory-modal-actions" style={{ marginTop: "1rem" }}>
              <button
                type="button"
                className="button inventory-modal-cancel"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button type="button" className="button" onClick={handleSaveQty}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
