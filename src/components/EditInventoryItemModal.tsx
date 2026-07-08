import { useState, useEffect } from "react";
import api from "../data/api";
import { getErrorMessage } from "../utils/apiError";
import type { InventoryItem } from "../types/inventory";

interface Props {
  item: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
  onViewHistory: (item: InventoryItem) => void;
}

export default function EditInventoryItemModal({ item, onClose, onSaved, onViewHistory }: Props) {
  const [editQty, setEditQty] = useState(item.quantity);
  const [editMinLevel, setEditMinLevel] = useState(item.minLevel ?? 0);
  const [editReorderQty, setEditReorderQty] = useState(item.reorderQty ?? 0);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    setSaveError(null);
    try {
      await api.put(`/Inventory/${item.itemNumber}`, {
        itemNumber: item.itemNumber,
        catalogItemId: item.catalogItem?.catalogItemId,
        buildingId: item.buildingId,
        quantity: editQty,
        minLevel: editMinLevel,
        reorderQty: editReorderQty,
        // Area is managed from the Areas page, not here — preserve the item's current area.
        areaId: item.areaId ?? null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  };

  return (
    <div className="inventory-modal-backdrop" onClick={() => onClose()}>
      <div className="inventory-modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Edit inventory item</h2>
        <p style={{ marginTop: 0 }}>
          <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
            {item.catalogItem?.name || "Unknown Item"}
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
        {saveError && (
          <div className="alert alert--danger alert--inline" style={{ marginTop: "0.5rem" }}>
            {typeof saveError === "string" ? saveError : "Failed to save."}
          </div>
        )}
        <div className="inventory-modal-actions" style={{ marginTop: "1rem", justifyContent: "space-between" }}>
          <button
            type="button"
            className="inventory-button inventory-button--secondary"
            style={{ fontSize: "0.82rem" }}
            onClick={() => { onClose(); onViewHistory(item); }}
          >
            View history
          </button>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              type="button"
              className="button inventory-modal-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="button" className="button" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
