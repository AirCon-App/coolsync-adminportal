import React, { useState, useEffect, useMemo } from "react";
import PageShell from "../components/PageShell";
import api from "../data/api";
import type { CatalogItem } from "../types/inventory";
import { getErrorMessage } from "../utils/apiError";
import { useApiData } from "../hooks/useApiData";

export default function CatalogPage() {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<CatalogItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // "Show archived" is a server-side concern (includeArchived param) — toggling it refetches.
  const { data, error: loadError, reload: fetchItems } = useApiData<CatalogItem[]>(
    () => {
      const params = new URLSearchParams();
      if (showArchived) params.set("includeArchived", "true");
      const qs = params.toString();
      return api.get<CatalogItem[]>(`/ItemCatalog${qs ? `?${qs}` : ""}`).then((res) => res.data);
    },
    (err) => getErrorMessage(err),
    { key: showArchived },
  );
  const items = useMemo(() => data ?? [], [data]);

  // Search filters the already-loaded array in memory (the contract has no search param).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.sku ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleAdd = async (form: CatalogFormData) => {
    await api.post<CatalogItem>("/ItemCatalog", { name: form.name, sku: form.sku });
    await fetchItems();
    setShowAddModal(false);
  };

  const handleEdit = async (form: CatalogFormData) => {
    if (!editingItem) return;
    await api.put(`/ItemCatalog/${editingItem.catalogItemId}`, {
      catalogItemId: editingItem.catalogItemId,
      name: form.name,
      sku: form.sku,
      isActive: editingItem.isActive ?? true,
      needsReview: editingItem.needsReview ?? false,
    });
    await fetchItems();
    setEditingItem(null);
  };

  // Full-body PUT with a single field flipped (mirrors EditInventoryItemModal's full-object PUT).
  const putItem = async (item: CatalogItem, overrides: Partial<CatalogItem>) => {
    await api.put(`/ItemCatalog/${item.catalogItemId}`, {
      catalogItemId: item.catalogItemId,
      name: item.name,
      sku: item.sku ?? "",
      isActive: item.isActive ?? true,
      needsReview: item.needsReview ?? false,
      ...overrides,
    });
    await fetchItems();
  };

  const handleToggleArchive = (item: CatalogItem) =>
    putItem(item, { isActive: !(item.isActive ?? true) });

  const handleConfirm = (item: CatalogItem) =>
    putItem(item, { needsReview: false });

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleteError(null);
    try {
      await api.delete(`/ItemCatalog/${deletingItem.catalogItemId}`);
      await fetchItems();
      setDeletingItem(null);
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    }
  };

  return (
    <PageShell>
      <div className="inventory-container" style={{ maxWidth: 900 }}>
        <h1 style={{ color: "var(--text-primary)", marginBottom: "0.75rem" }}>
          Manage catalog
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 0, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
          Add, edit, or archive global catalog items (filter types). Only super admins can access this page.
        </p>

        <div className="table-toolbar">
          <input
            className="table-search"
            type="text"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="catalog-search"
          />
          <div className="table-actions">
            <label
              className="user-form-label"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", margin: 0, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                data-testid="catalog-show-archived"
              />
              Show archived
            </label>
            <button className="inventory-button" onClick={() => setShowAddModal(true)} data-testid="add-catalog-button">
              <span>+</span> Add item
            </button>
          </div>
        </div>

        {loadError && (
          <div className="alert alert--danger alert--inline" style={{ marginBottom: "0.5rem" }}>
            {typeof loadError === "string" ? loadError : "Failed to load catalog."}
          </div>
        )}

        <div className="data-table-wrap">
          <table className="data-table" data-testid="catalog-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    {search ? "No items match your search." : "No catalog items yet."}
                  </td>
                </tr>
              )}
              {filtered.map((item) => {
                const active = item.isActive ?? true;
                return (
                  <tr key={item.catalogItemId} className="data-table-row" data-testid={`catalog-row-${item.catalogItemId}`}>
                    <td className="td-primary">
                      {item.name}
                      {item.needsReview && (
                        <span
                          className="stock-badge"
                          style={{ background: "var(--warning-sub)", color: "var(--warning)", marginLeft: "0.5rem" }}
                          data-testid="needs-review-badge"
                        >
                          Needs review
                        </span>
                      )}
                    </td>
                    <td className="td-mono">{item.sku || <span className="td-empty">—</span>}</td>
                    <td>
                      {active ? (
                        <span className="stock-badge" style={{ background: "rgba(34,197,94,0.12)", color: "var(--success)" }}>
                          Active
                        </span>
                      ) : (
                        <span className="stock-badge" style={{ background: "var(--danger-sub)", color: "var(--danger)" }}>
                          Archived
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="user-row-actions">
                        <button className="user-action-btn" onClick={() => setEditingItem(item)}>Edit</button>
                        {item.needsReview && (
                          <button className="user-action-btn" onClick={() => handleConfirm(item)} data-testid="confirm-catalog-button">
                            Confirm
                          </button>
                        )}
                        <button className="user-action-btn" onClick={() => handleToggleArchive(item)}>
                          {active ? "Archive" : "Restore"}
                        </button>
                        <button
                          className="user-action-btn user-action-btn--danger"
                          onClick={() => { setDeletingItem(item); setDeleteError(null); }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="table-count">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {showAddModal && (
        <CatalogFormModal
          title="Add catalog item"
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingItem && (
        <CatalogFormModal
          title="Edit catalog item"
          initial={editingItem}
          onSave={handleEdit}
          onClose={() => setEditingItem(null)}
        />
      )}

      {deletingItem && (
        <div className="inventory-modal-backdrop" onClick={() => { setDeletingItem(null); setDeleteError(null); }}>
          <div className="inventory-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Delete catalog item</h2>
            <p>
              Are you sure you want to delete{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{deletingItem.name}</span>?
              This cannot be undone. If the item is in use, archive it instead.
            </p>
            {deleteError && (
              <div className="alert alert--danger alert--inline" style={{ marginTop: "0.25rem" }}>
                {typeof deleteError === "string" ? deleteError : "Failed to delete."}
              </div>
            )}
            <div className="inventory-modal-actions">
              <button
                className="button inventory-modal-cancel"
                onClick={() => { setDeletingItem(null); setDeleteError(null); }}
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

interface CatalogFormData { name: string; sku: string; }
interface CatalogFormModalProps {
  title: string;
  initial?: Partial<CatalogItem>;
  onSave: (form: CatalogFormData) => Promise<void>;
  onClose: () => void;
}

function CatalogFormModal({ title, initial = {}, onSave, onClose }: CatalogFormModalProps) {
  const [form, setForm] = useState<CatalogFormData>({
    name: initial.name ?? "",
    sku: initial.sku ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

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
            <label className="user-form-label">Name</label>
            <input
              className="inventory-modal-input"
              style={{ marginBottom: 0 }}
              placeholder="MERV 13 Pleated 20x25x4"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="user-form-label">SKU</label>
            <input
              className="inventory-modal-input"
              style={{ marginBottom: 0 }}
              placeholder="Optional"
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
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
