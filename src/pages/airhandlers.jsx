import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import api from "../data/api";
import { useBuilding } from "../context/BuildingContext";

const EMPTY_FORM = {
  name: "",
  description: "",
  catalogItemId: "",
  filtersName: "",
  quantity: "",
  scheduleChangeInterval: "",
  sku: "",
};

export default function AirHandlersPage() {
  const [data, setData] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [addError, setAddError] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [catalogItems, setCatalogItems] = useState([]);
  const navigate = useNavigate();
  const { activeBuilding } = useBuilding();

  useEffect(() => {
    if (!activeBuilding) return;
    api.get(`/AirHandlers?buildingId=${activeBuilding.buildingId}`).then((res) => setData(res.data));
  }, [activeBuilding]);

  const handleOpenAdd = () => {
    setForm(EMPTY_FORM);
    setAddError(null);
    if (catalogItems.length === 0) {
      api.get("/ItemCatalog").then((res) => setCatalogItems(res.data));
    }
    setShowAddModal(true);
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
      const res = await api.post(`/AirHandlers/upload?buildingId=${activeBuilding.buildingId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadStatus(res.data.message || "Upload successful.");
      const updated = await api.get(`/AirHandlers?buildingId=${activeBuilding.buildingId}`);
      setData(updated.data);
    } catch (err) {
      setUploadError(err.response?.data || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "catalogItemId") {
      const selected = catalogItems.find((c) => String(c.catalogItemId) === value);
      setForm((prev) => ({
        ...prev,
        catalogItemId: value,
        filtersName: selected ? selected.name : "",
        sku: selected ? (selected.sku ?? "") : "",
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError(null);
    try {
      await api.post("/AirHandlers", {
        name: form.name,
        description: form.description,
        buildingId: activeBuilding.buildingId,
        filtersName: form.filtersName || null,
        quantity: form.quantity !== "" ? Number(form.quantity) : null,
        scheduleChangeInterval: form.scheduleChangeInterval || null,
        sku: form.sku || null,
      });
      const res = await api.get(`/AirHandlers?buildingId=${activeBuilding.buildingId}`);
      setData(res.data);
      setShowAddModal(false);
    } catch (err) {
      setAddError(err.response?.data || "Failed to add air handler.");
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
    const rows = q
      ? data.filter(
          (ah) =>
            ah.name?.toLowerCase().includes(q) ||
            ah.description?.toLowerCase().includes(q) ||
            ah.filtersName?.toLowerCase().includes(q) ||
            ah.sku?.toLowerCase().includes(q)
        )
      : data;

    return [...rows].sort((a, b) => {
      const av = (a[sortKey] ?? "").toString().toLowerCase();
      const bv = (b[sortKey] ?? "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, search, sortKey, sortDir]);

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <PageShell>
      <div className="inventory-container" style={{ maxWidth: 1100 }}>
        <h1 style={{ color: "var(--text-primary)", marginBottom: "0.75rem" }}>
          Manage your air handlers
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            marginTop: 0,
            marginBottom: "1.5rem",
            fontSize: "0.95rem",
          }}
        >
          View and manage all air handlers for this tenant.
        </p>

        <div className="table-toolbar">
          <input
            className="table-search"
            type="text"
            placeholder="Search by name, description, filter, or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="inventory-button inventory-button--secondary" onClick={handleOpenUpload}>
            Bulk Upload
          </button>
          <button className="inventory-button" onClick={handleOpenAdd}>
            <span>+</span> Add air handler
          </button>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("name")}>Name <SortIcon col="name" /></th>
                <th onClick={() => handleSort("description")}>Description <SortIcon col="description" /></th>
                <th onClick={() => handleSort("filtersName")}>Filter <SortIcon col="filtersName" /></th>
                <th onClick={() => handleSort("sku")}>SKU <SortIcon col="sku" /></th>
                <th onClick={() => handleSort("quantity")}>Qty <SortIcon col="quantity" /></th>
                <th onClick={() => handleSort("scheduleChangeInterval")}>Interval <SortIcon col="scheduleChangeInterval" /></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    {search ? "No air handlers match your search." : "No air handlers yet."}
                  </td>
                </tr>
              )}
              {filtered.map((ah) => (
                <tr
                  key={ah.id}
                  className="data-table-row"
                  onClick={() => navigate(`/airhandlers/${ah.airHandlerGuid}`)}
                >
                  <td className="td-primary">{ah.name}</td>
                  <td>{ah.description || <span className="td-empty">—</span>}</td>
                  <td>{ah.filtersName || <span className="td-empty">—</span>}</td>
                  <td className="td-mono">{ah.sku || <span className="td-empty">—</span>}</td>
                  <td>{ah.quantity ?? <span className="td-empty">—</span>}</td>
                  <td>{ah.scheduleChangeInterval || <span className="td-empty">—</span>}</td>
                  <td className="td-arrow">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="table-count">{filtered.length} of {data.length} air handler{data.length !== 1 ? "s" : ""}</p>
      </div>

      {showUploadModal && (
        <div className="inventory-modal-backdrop" onClick={() => setShowUploadModal(false)}>
          <div
            className="inventory-modal-card"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Bulk upload air handlers</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 0 }}>
              Upload a CSV file to import multiple air handlers at once for this building.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 0 }}>
              Required columns: <code>Air Handler Name</code>, <code>Filters Name</code>, <code>Quantity</code>, <code>Schedule Change Interval</code>. Optional: <code>SKU</code>.
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

      {showAddModal && (
        <div
          className="inventory-modal-backdrop"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="inventory-modal-card"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Add air handler</h2>
            <form
              onSubmit={handleAdd}
              style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
            >
              <div>
                <label className="user-form-label">Name *</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="name"
                  placeholder="AHU-01"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="user-form-label">Description</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="description"
                  placeholder="Main lobby unit"
                  value={form.description}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="user-form-label">Filter</label>
                <select
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="catalogItemId"
                  value={form.catalogItemId}
                  onChange={handleChange}
                >
                  <option value="">— Select a filter —</option>
                  {catalogItems.map((c) => (
                    <option key={c.catalogItemId} value={c.catalogItemId}>
                      {c.name}{c.sku ? ` (${c.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="user-form-label">SKU</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="sku"
                  placeholder="Auto-filled from filter"
                  value={form.sku}
                  readOnly
                />
              </div>
              <div>
                <label className="user-form-label">Quantity</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.quantity}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="user-form-label">Schedule change interval</label>
                <input
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="scheduleChangeInterval"
                  placeholder="90 days"
                  value={form.scheduleChangeInterval}
                  onChange={handleChange}
                />
              </div>
              {addError && (
                <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: 0 }}>
                  {typeof addError === "string" ? addError : "Failed to add air handler."}
                </p>
              )}
              <div
                className="inventory-modal-actions"
                style={{ marginTop: "0.5rem" }}
              >
                <button
                  type="button"
                  className="button inventory-modal-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
