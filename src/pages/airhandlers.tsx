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
  areaId: "",
  areaLabel: "",
  newAreaName: "",
};

const UNGROUPED_KEY = "__ungrouped__";

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
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [areaLabelSuggestions, setAreaLabelSuggestions] = useState([]);
  const [buildingAreas, setBuildingAreas] = useState([]);
  const navigate = useNavigate();
  const { activeBuilding } = useBuilding();

  useEffect(() => {
    if (!activeBuilding) return;
    api.get(`/AirHandlers?buildingId=${activeBuilding.buildingId}`).then((res) => {
      setData(res.data);
      const labels = [...new Set(res.data.map((ah) => ah.areaLabel).filter(Boolean))].sort();
      setAreaLabelSuggestions(labels);
    });
  }, [activeBuilding]);

  const handleOpenAdd = () => {
    setForm(EMPTY_FORM);
    setAddError(null);
    if (catalogItems.length === 0) {
      api.get("/ItemCatalog").then((res) => setCatalogItems(res.data));
    }
    if (activeBuilding) {
      api.get(`/BuildingAreas?buildingId=${activeBuilding.buildingId}`).then((res) => setBuildingAreas(res.data));
    }
    setShowAddModal(true);
  };

  const handleOpenUpload = () => {
    setUploadFile(null);
    setUploadStatus(null);
    setUploadError(null);
    setShowUploadModal(true);
  };

  const handleDownload = async () => {
    const res = await api.get(`/AirHandlers/export?buildingId=${activeBuilding.buildingId}`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers["content-disposition"] ?? "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    a.download = match ? match[1] : "air-handlers.csv";
    a.click();
    URL.revokeObjectURL(url);
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
      let resolvedAreaId = form.areaId ? Number(form.areaId) : null;
      let resolvedAreaLabel = null;

      if (form.areaId === "__new__" && form.newAreaName.trim()) {
        const areaRes = await api.post("/BuildingAreas", {
          buildingId: activeBuilding.buildingId,
          name: form.newAreaName.trim(),
          sortOrder: 0,
        });
        resolvedAreaId = areaRes.data.id;
        resolvedAreaLabel = areaRes.data.name;
        setBuildingAreas((prev) => [...prev, areaRes.data]);
      } else if (form.areaId && form.areaId !== "__new__") {
        const area = buildingAreas.find((a) => a.id === Number(form.areaId));
        resolvedAreaLabel = area?.name ?? null;
      }

      await api.post("/AirHandlers", {
        name: form.name,
        description: form.description,
        buildingId: activeBuilding.buildingId,
        filtersName: form.filtersName || null,
        quantity: form.quantity !== "" ? Number(form.quantity) : null,
        scheduleChangeInterval: form.scheduleChangeInterval || null,
        sku: form.sku || null,
        areaId: resolvedAreaId,
        areaLabel: resolvedAreaLabel,
      });
      const res = await api.get(`/AirHandlers?buildingId=${activeBuilding.buildingId}`);
      setData(res.data);
      const labels = [...new Set(res.data.map((ah) => ah.areaLabel).filter(Boolean))].sort();
      setAreaLabelSuggestions(labels);
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

  const toggleGroup = (label) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = q
      ? data.filter(
          (ah) =>
            ah.name?.toLowerCase().includes(q) ||
            ah.description?.toLowerCase().includes(q) ||
            ah.filtersName?.toLowerCase().includes(q) ||
            ah.sku?.toLowerCase().includes(q) ||
            ah.areaLabel?.toLowerCase().includes(q)
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

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((ah) => {
      const key = ah.areaLabel || UNGROUPED_KEY;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ah);
    });

    // Sort group keys: named groups alphabetically, ungrouped last
    const sorted = [...map.entries()].sort(([a], [b]) => {
      if (a === UNGROUPED_KEY) return 1;
      if (b === UNGROUPED_KEY) return -1;
      return a.localeCompare(b);
    });

    return sorted;
  }, [filtered]);

  const isGrouped = areaLabelSuggestions.length > 0 && !search;

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const TableHead = () => (
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
  );

  const AirHandlerRow = ({ ah }) => (
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
  );

  return (
    <PageShell>
      <div className="inventory-container" style={{ maxWidth: 1100 }}>
        <h1 style={{ color: "var(--text-primary)", marginBottom: "0.75rem" }}>
          Manage your air handlers
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 0, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
          View and manage all air handlers for this tenant.
        </p>

        <div className="table-toolbar">
          <input
            className="table-search"
            type="text"
            placeholder="Search by name, description, filter, area, or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="table-actions">
            <button className="inventory-button inventory-button--secondary" onClick={handleDownload} disabled={!activeBuilding || data.length === 0}>
              Download CSV
            </button>
            <button className="inventory-button inventory-button--secondary" onClick={handleOpenUpload}>
              Bulk Upload
            </button>
            <button className="inventory-button" onClick={handleOpenAdd}>
              <span>+</span> Add air handler
            </button>
          </div>
        </div>

        {isGrouped ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {grouped.map(([groupKey, handlers]) => {
              const isCollapsed = collapsedGroups[groupKey];
              const label = groupKey === UNGROUPED_KEY ? "Ungrouped" : groupKey;
              return (
                <div key={groupKey} style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.7rem 1rem",
                      background: "var(--bg-subtle)",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      letterSpacing: "0.03em",
                      borderBottom: isCollapsed ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <span>
                      {label}
                      <span style={{ marginLeft: "0.6rem", fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {handlers.length} unit{handlers.length !== 1 ? "s" : ""}
                      </span>
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{isCollapsed ? "▶" : "▼"}</span>
                  </button>
                  {!isCollapsed && (
                    <div className="data-table-wrap" style={{ borderRadius: 0, border: "none" }}>
                      <table className="data-table">
                        <TableHead />
                        <tbody>
                          {handlers.map((ah) => <AirHandlerRow key={ah.id} ah={ah} />)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
            <p className="table-count">{filtered.length} of {data.length} air handler{data.length !== 1 ? "s" : ""}</p>
          </div>
        ) : (
          <>
            <div className="data-table-wrap">
              <table className="data-table">
                <TableHead />
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                        {search ? "No air handlers match your search." : "No air handlers yet."}
                      </td>
                    </tr>
                  )}
                  {filtered.map((ah) => <AirHandlerRow key={ah.id} ah={ah} />)}
                </tbody>
              </table>
            </div>
            <p className="table-count">{filtered.length} of {data.length} air handler{data.length !== 1 ? "s" : ""}</p>
          </>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="inventory-modal-backdrop" onClick={() => setShowUploadModal(false)}>
          <div className="inventory-modal-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <h2>Bulk upload air handlers</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 0 }}>
              Upload a CSV file to import multiple air handlers at once for this building.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 0 }}>
              Required columns: <code>Air Handler Name</code>, <code>Filters Name</code>, <code>Quantity</code>, <code>Schedule Change Interval</code>. Optional: <code>SKU</code>, <code>Area Label</code>.
              Existing air handlers matched by name will be <strong>updated</strong>; new names will be <strong>inserted</strong>. Area Labels are created automatically if they don't exist.
            </p>
            {data.length > 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 0 }}>
                Start from your existing list:{" "}
                <button
                  type="button"
                  onClick={handleDownload}
                  style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "inherit", padding: 0, textDecoration: "underline" }}
                >
                  Download current air handlers as CSV
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
              {uploadError && <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: 0 }}>{typeof uploadError === "string" ? uploadError : "Upload failed."}</p>}
              {uploadStatus && <p style={{ color: "var(--success)", fontSize: "0.85rem", margin: 0 }}>{uploadStatus}</p>}
              <div className="inventory-modal-actions" style={{ marginTop: "0.5rem" }}>
                <button type="button" className="button inventory-modal-cancel" onClick={() => setShowUploadModal(false)}>
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="inventory-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="inventory-modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h2>Add air handler</h2>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label className="user-form-label">Name *</label>
                <input className="inventory-modal-input" style={{ marginBottom: 0 }} name="name" placeholder="AHU-01" value={form.name} onChange={handleChange} required />
              </div>
              <div>
                <label className="user-form-label">Description</label>
                <input className="inventory-modal-input" style={{ marginBottom: 0 }} name="description" placeholder="Main lobby unit" value={form.description} onChange={handleChange} />
              </div>
              <div>
                <label className="user-form-label">Area / Floor</label>
                <select
                  className="inventory-modal-input"
                  style={{ marginBottom: 0 }}
                  name="areaId"
                  value={form.areaId}
                  onChange={handleChange}
                >
                  <option value="">— No area —</option>
                  {buildingAreas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                  <option value="__new__">+ Add new area…</option>
                </select>
                {form.areaId === "__new__" && (
                  <input
                    className="inventory-modal-input"
                    style={{ marginBottom: 0, marginTop: "0.4rem" }}
                    name="newAreaName"
                    placeholder="New area name (e.g. Floor 3, Lobby)"
                    value={form.newAreaName}
                    onChange={handleChange}
                    autoFocus
                  />
                )}
              </div>
              <div>
                <label className="user-form-label">Filter</label>
                <select className="inventory-modal-input" style={{ marginBottom: 0 }} name="catalogItemId" value={form.catalogItemId} onChange={handleChange}>
                  <option value="">— Select a filter —</option>
                  {catalogItems.map((c) => (
                    <option key={c.catalogItemId} value={c.catalogItemId}>{c.name}{c.sku ? ` (${c.sku})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="user-form-label">SKU</label>
                <input className="inventory-modal-input" style={{ marginBottom: 0 }} name="sku" placeholder="Auto-filled from filter" value={form.sku} readOnly />
              </div>
              <div>
                <label className="user-form-label">Quantity</label>
                <input className="inventory-modal-input" style={{ marginBottom: 0 }} name="quantity" type="number" min="0" placeholder="0" value={form.quantity} onChange={handleChange} />
              </div>
              <div>
                <label className="user-form-label">Schedule change interval</label>
                <input className="inventory-modal-input" style={{ marginBottom: 0 }} name="scheduleChangeInterval" placeholder="90 days" value={form.scheduleChangeInterval} onChange={handleChange} />
              </div>
              {addError && <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: 0 }}>{typeof addError === "string" ? addError : "Failed to add air handler."}</p>}
              <div className="inventory-modal-actions" style={{ marginTop: "0.5rem" }}>
                <button type="button" className="button inventory-modal-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="button">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
