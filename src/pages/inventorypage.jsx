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
  const [areaFilter, setAreaFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [areas, setAreas] = useState([]);
  const [editAreaId, setEditAreaId] = useState("");
  const { activeBuilding } = useBuilding();

  useEffect(() => {
    if (!activeBuilding) return;
    api.get(`/Inventory?buildingId=${activeBuilding.buildingId}`).then((res) => setData(res.data));
    api.get(`/BuildingAreas?buildingId=${activeBuilding.buildingId}`).then((res) => setAreas(res.data));
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
    setEditAreaId(item.areaId ?? "");
    setShowEditModal(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get(`/Inventory/template?buildingId=${activeBuilding.buildingId}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `inventory_template_building_${activeBuilding.buildingId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Template download failed:", err);
    }
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
      const areaIdValue = editAreaId === "" ? null : Number(editAreaId);
      await api.put(`/Inventory/${editItem.itemNumber}`, {
        itemNumber: editItem.itemNumber,
        catalogItemId: editItem.catalogItem?.catalogItemId,
        buildingId: editItem.buildingId,
        quantity: editQty,
        minLevel: editMinLevel,
        reorderQty: editReorderQty,
        areaId: areaIdValue,
      });
      const areaName = areaIdValue ? (areas.find((a) => a.id === areaIdValue)?.name ?? null) : null;
      setData((prev) =>
        prev.map((item) =>
          item.itemNumber === editItem.itemNumber
            ? { ...item, quantity: editQty, minLevel: editMinLevel, reorderQty: editReorderQty, areaId: areaIdValue, areaName }
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
      const res = await api.post(`/Inventory/upload?buildingId=${activeBuilding.buildingId}&mode=add`, formData, {
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
          item.catalogItem?.name?.toLowerCase().includes(q) ||
          item.catalogItem?.sku?.toLowerCase().includes(q)
      );
    }

    if (stockFilter === "low") {
      rows = rows.filter((item) => item.minLevel > 0 ? item.quantity < item.minLevel : item.quantity === 0);
    } else if (stockFilter === "in") {
      rows = rows.filter((item) => item.minLevel > 0 ? item.quantity >= item.minLevel : item.quantity > 0);
    }

    if (areaFilter !== "all") {
      if (areaFilter === "none") {
        rows = rows.filter((item) => !item.areaId);
      } else {
        rows = rows.filter((item) => String(item.areaId) === areaFilter);
      }
    }

    return [...rows].sort((a, b) => {
      let av, bv;
      if (sortKey === "quantity") {
        av = a.quantity ?? 0;
        bv = b.quantity ?? 0;
        return sortDir === "asc" ? av - bv : bv - av;
      }
      if (sortKey === "sku") {
        av = (a.catalogItem?.sku ?? "").toLowerCase();
        bv = (b.catalogItem?.sku ?? "").toLowerCase();
      } else {
        av = (a.catalogItem?.name ?? "").toLowerCase();
        bv = (b.catalogItem?.name ?? "").toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, search, stockFilter, areaFilter, sortKey, sortDir]);

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
            data-testid="inventory-search"
          />
          <select
            className="table-filter-select"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            data-testid="stock-filter"
          >
            <option value="all">All stock levels</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
          </select>
          <select
            className="table-filter-select"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            data-testid="area-filter"
          >
            <option value="all">All areas</option>
            <option value="none">Unassigned</option>
            {areas.map((a) => (
              <option key={a.id} value={String(a.id)}>{a.name}</option>
            ))}
          </select>
          <button className="inventory-button inventory-button--secondary" onClick={handleDownloadTemplate}>
            Download Template
          </button>
          <button className="inventory-button inventory-button--secondary" onClick={handleOpenUpload}>
            Bulk Upload
          </button>
          <button className="inventory-button" onClick={handleOpenAdd} data-testid="add-inventory-button">
            <span>+</span> Add Inventory Item
          </button>
        </div>

        <div className="data-table-wrap">
          <table className="data-table" data-testid="inventory-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("name")}>Item name <SortIcon col="name" /></th>
                <th onClick={() => handleSort("sku")}>SKU <SortIcon col="sku" /></th>
                <th>Area</th>
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
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    {search || stockFilter !== "all" || areaFilter !== "all" ? "No items match your filters." : "No inventory items yet."}
                  </td>
                </tr>
              )}
              {filtered.map((item) => (
                <tr
                  key={item.itemNumber}
                  className="data-table-row"
                  onClick={() => handleOpenEdit(item)}
                  data-testid={`inventory-row-${item.itemNumber}`}
                >
                  <td className="td-primary">{item.catalogItem?.name || <span className="td-empty">Unknown</span>}</td>
                  <td className="td-mono">{item.catalogItem?.sku || <span className="td-empty">—</span>}</td>
                  <td>{item.areaName || <span className="td-empty">—</span>}</td>
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
            style={{ maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Bulk upload inventory</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 0 }}>
              Upload a CSV file to update inventory for this building.
            </p>

            <div
              style={{
                background: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.25)",
                borderRadius: 8,
                padding: "0.85rem 1rem",
                marginBottom: "1rem",
              }}
              role="alert"
              aria-live="polite"
            >
              <p style={{ color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
                How this upload works
              </p>
              <ul style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: 0, paddingLeft: "1.1rem", lineHeight: 1.6 }}>
                <li><strong>Existing items:</strong> Quantities are <em>added</em> to current stock (e.g., 10 on hand + 5 in CSV = 15 total)</li>
                <li><strong>New items:</strong> Items not in inventory are created with the uploaded quantity</li>
                <li><strong>Min Level / Reorder Qty:</strong> Updated if provided, otherwise unchanged</li>
              </ul>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 0 }}>
              Required columns: <code>FilterName</code>, <code>Quantity</code>. Optional: <code>SKU</code>, <code>MinLevel</code>, <code>ReorderQty</code>, <code>Area</code>.
            </p>
            {data.length > 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 0 }}>
                Need the right format?{" "}
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    cursor: "pointer",
                    fontSize: "inherit",
                    padding: 0,
                    textDecoration: "underline",
                  }}
                >
                  Download your current inventory as a template
                </button>
              </p>
            )}
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
                {editItem.catalogItem?.name || "Unknown Item"}
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
              <div>
                <label className="user-form-label">Area</label>
                <select
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  value={editAreaId}
                  onChange={(e) => setEditAreaId(e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
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
