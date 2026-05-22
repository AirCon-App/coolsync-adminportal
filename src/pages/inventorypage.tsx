import React, { useState, useEffect } from "react";
import PageShell from "../components/PageShell";
import api from "../data/api";
import { getErrorMessage } from "../utils/apiError";
import { useBuilding } from "../context/BuildingContext";
import { Pagination } from "../components/Pagination";

interface CatalogItem { catalogItemId: number; name: string; sku?: string; }
interface InventoryItem { itemNumber: number; quantity: number; minLevel?: number; reorderQty?: number; buildingId: number; areaId?: number | null; areaName?: string | null; catalogItem?: CatalogItem; }
interface Area { id: number; name: string; }

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

const PAGE_SIZE = 25;

export default function InventoryPage() {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editMinLevel, setEditMinLevel] = useState(0);
  const [editReorderQty, setEditReorderQty] = useState(0);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [form, setForm] = useState({ catalogItemId: "", quantity: 1 });
  const [addError, setAddError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [areas, setAreas] = useState<Area[]>([]);
  const [editAreaId, setEditAreaId] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { activeBuilding } = useBuilding();

  useEffect(() => { setPage(1); }, [activeBuilding]);

  useEffect(() => {
    if (!activeBuilding) return;
    let mounted = true;
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    params.set("buildingId", String(activeBuilding.buildingId));
    if (search) params.set("search", search);
    if (stockFilter !== "all") params.set("stockStatus", stockFilter);
    if (areaFilter === "none") params.set("areaId", "0");
    else if (areaFilter !== "all") params.set("areaId", areaFilter);
    const t = setTimeout(() => {
      api.get(`/Inventory?${params}`).then((res) => {
        if (!mounted) return;
        setData(res.data.items);
        setTotalCount(res.data.totalCount);
      }).catch(() => { if (mounted) { setData([]); setTotalCount(0); } });
    }, 250);
    return () => { mounted = false; clearTimeout(t); };
  }, [activeBuilding, page, search, stockFilter, areaFilter, refreshKey]);

  useEffect(() => {
    if (!activeBuilding) return;
    let mounted = true;
    api.get(`/BuildingAreas?buildingId=${activeBuilding.buildingId}`).then((res) => { if (mounted) setAreas(res.data.items); });
    return () => { mounted = false; };
  }, [activeBuilding]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleOpenAdd = () => {
    setAddError(null);
    setForm({ catalogItemId: "", quantity: 1 });
    if (catalogItems.length === 0) {
      api.get("/ItemCatalog")
        .then((res) => setCatalogItems(res.data))
        .catch((err) => setAddError(getErrorMessage(err)));
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
    if (!activeBuilding) return;
    setDownloadError(null);
    try {
      const res = await api.get(`/Inventory/template?buildingId=${activeBuilding!.buildingId}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `inventory_template_building_${activeBuilding!.buildingId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(getErrorMessage(err));
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!activeBuilding) return;
    setAddError(null);
    try {
      await api.post("/Inventory", {
        catalogItemId: Number(form.catalogItemId),
        buildingId: activeBuilding.buildingId,
        quantity: Number(form.quantity),
      });
      refresh();
      setShowAddModal(false);
    } catch (err) {
      setAddError(getErrorMessage(err));
    }
  };

  const handleSaveQty = async () => {
    setSaveError(null);
    try {
      const areaIdValue = editAreaId === "" ? null : Number(editAreaId);
      await api.put(`/Inventory/${editItem!.itemNumber}`, {
        itemNumber: editItem!.itemNumber,
        catalogItemId: editItem!.catalogItem?.catalogItemId,
        buildingId: editItem!.buildingId,
        quantity: editQty,
        minLevel: editMinLevel,
        reorderQty: editReorderQty,
        areaId: areaIdValue,
      });
      refresh();
      setShowEditModal(false);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  };

  const handleOpenUpload = () => {
    if (!activeBuilding) return;
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
      const res = await api.post(`/Inventory/upload?buildingId=${activeBuilding!.buildingId}&mode=add`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadStatus(res.data.message || "Upload successful.");
      refresh();
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            data-testid="inventory-search"
          />
          <div className="table-actions">
            <select
              className="table-filter-select"
              value={stockFilter}
              onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
              data-testid="stock-filter"
            >
              <option value="all">All stock levels</option>
              <option value="in">In stock</option>
              <option value="low">Low stock</option>
            </select>
            <select
              className="table-filter-select"
              value={areaFilter}
              onChange={(e) => { setAreaFilter(e.target.value); setPage(1); }}
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
        </div>

        {downloadError && (
          <div className="alert alert--danger alert--inline" style={{ marginBottom: "0.5rem" }}>
            {typeof downloadError === "string" ? downloadError : "Template download failed."}
          </div>
        )}

        <div className="data-table-wrap">
          <table className="data-table" data-testid="inventory-table">
            <thead>
              <tr>
                <th>Item name</th>
                <th>SKU</th>
                <th>Area</th>
                <th>Qty</th>
                <th>Min Level</th>
                <th>Reorder Qty</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    {search || stockFilter !== "all" || areaFilter !== "all" ? "No items match your filters." : "No inventory items yet."}
                  </td>
                </tr>
              )}
              {data.map((item) => (
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
                  <td>{(item.minLevel ?? 0) > 0 ? item.minLevel : <span className="td-empty">—</span>}</td>
                  <td>{(item.reorderQty ?? 0) > 0 ? item.reorderQty : <span className="td-empty">—</span>}</td>
                  <td><StockBadge qty={item.quantity} minLevel={item.minLevel ?? 0} /></td>
                  <td className="td-arrow">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
        <p className="table-count">{totalCount} item{totalCount !== 1 ? "s" : ""}</p>
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
                  onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) || 0 }))}
                  required
                />
              </div>
              {addError && (
                <div className="alert alert--danger alert--inline">
                  {typeof addError === "string" ? addError : "Failed to add item."}
                </div>
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
                    color: "var(--accent)",
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
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                required
              />
              {uploadError && (
                <div className="alert alert--danger alert--inline">
                  {typeof uploadError === "string" ? uploadError : "Upload failed."}
                </div>
              )}
              {uploadStatus && (
                <div className="alert alert--success alert--inline">{uploadStatus}</div>
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
            {saveError && (
              <div className="alert alert--danger alert--inline" style={{ marginTop: "0.5rem" }}>
                {typeof saveError === "string" ? saveError : "Failed to save."}
              </div>
            )}
            <div className="inventory-modal-actions" style={{ marginTop: "1rem" }}>
              <button
                type="button"
                className="button inventory-modal-cancel"
                onClick={() => { setShowEditModal(false); setSaveError(null); }}
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
