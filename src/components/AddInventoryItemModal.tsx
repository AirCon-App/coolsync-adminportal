import { useState, useEffect } from "react";
import api from "../data/api";
import { getErrorMessage } from "../utils/apiError";
import type { CatalogItem } from "../types/inventory";

interface Props {
  buildingId: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddInventoryItemModal({ buildingId, onClose, onSaved }: Props) {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [form, setForm] = useState({ catalogItemId: "", quantity: 1 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api.get("/ItemCatalog")
      .then((res) => { if (mounted) setCatalogItems(res.data); })
      .catch((err) => { if (mounted) setError(getErrorMessage(err)); });
    return () => { mounted = false; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/Inventory", {
        catalogItemId: Number(form.catalogItemId),
        buildingId,
        quantity: Number(form.quantity),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="inventory-modal-backdrop" onClick={() => onClose()}>
      <div
        className="inventory-modal-card"
        style={{ maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Add inventory item</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
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
          {error && (
            <div className="alert alert--danger alert--inline">
              {typeof error === "string" ? error : "Failed to add item."}
            </div>
          )}
          <div className="inventory-modal-actions" style={{ marginTop: "0.5rem" }}>
            <button type="button" className="button inventory-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button">
              Add item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
