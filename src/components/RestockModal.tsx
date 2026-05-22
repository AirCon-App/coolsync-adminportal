import { useState, useEffect } from "react";
import api from "../data/api";
import { getErrorMessage } from "../utils/apiError";
import type { InventoryItem } from "../types/inventory";

interface RestockLine {
  catalogItemId: number;
  inventoryItemNumber: number;
  name: string;
  sku?: string;
  currentQty: number;
  minLevel: number;
  qtyReceived: number;
}

interface Props {
  buildingId: number;
  alertItems: InventoryItem[];
  onClose: () => void;
  onSaved: () => void;
}

export default function RestockModal({ buildingId, alertItems, onClose, onSaved }: Props) {
  const [lines, setLines] = useState<RestockLine[]>([]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const initial: RestockLine[] = alertItems.map((item) => ({
      catalogItemId: item.catalogItem!.catalogItemId,
      inventoryItemNumber: item.itemNumber,
      name: item.catalogItem?.name ?? "Unknown",
      sku: item.catalogItem?.sku,
      currentQty: item.quantity,
      minLevel: item.minLevel ?? 0,
      qtyReceived: item.reorderQty ?? 0,
    }));
    setLines(initial.length > 0 ? initial : []);
  }, [alertItems]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const setQty = (idx: number, val: number) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, qtyReceived: val } : l));
  };

  const removeRow = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    const validLines = lines.filter((l) => l.qtyReceived > 0);
    if (validLines.length === 0) {
      setError("Enter a quantity greater than 0 for at least one item.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/Inventory/restock", {
        buildingId,
        referenceNumber: referenceNumber.trim() || null,
        receivedBy: receivedBy.trim() || null,
        notes: notes.trim() || null,
        items: validLines.map((l) => ({
          catalogItemId: l.catalogItemId,
          qtyReceived: l.qtyReceived,
        })),
      });
      setSuccessMsg(`${validLines.length} item${validLines.length !== 1 ? "s" : ""} restocked successfully.`);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const totalUnits = lines.reduce((sum, l) => sum + (l.qtyReceived > 0 ? l.qtyReceived : 0), 0);

  return (
    <div
      className="inventory-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Receive inventory"
    >
      <div className="inventory-modal-card" style={{ maxWidth: 680, width: "100%" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ margin: 0 }}>Receive inventory</h2>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Record a delivery. Quantities will be added to current stock.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--text-muted)", lineHeight: 1, marginLeft: "1rem" }}
          >✕</button>
        </div>

        {error && (
          <div className="alert alert--danger alert--inline" style={{ marginBottom: "1rem" }}>{error}</div>
        )}
        {successMsg && (
          <div className="alert alert--success alert--inline" style={{ marginBottom: "1rem" }}>{successMsg}</div>
        )}

        {/* Reference fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          <div>
            <label className="user-form-label" htmlFor="restock-ref">PO / Reference # <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
            <input
              id="restock-ref"
              className="inventory-modal-input"
              style={{ marginBottom: 0 }}
              placeholder="e.g. PO-20240522"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              disabled={!!successMsg}
            />
          </div>
          <div>
            <label className="user-form-label" htmlFor="restock-by">Received by <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
            <input
              id="restock-by"
              className="inventory-modal-input"
              style={{ marginBottom: 0 }}
              placeholder="Name or ID"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              disabled={!!successMsg}
            />
          </div>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label className="user-form-label" htmlFor="restock-notes">Notes <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
          <input
            id="restock-notes"
            className="inventory-modal-input"
            style={{ marginBottom: 0 }}
            placeholder="Delivery notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!!successMsg}
          />
        </div>

        {/* Line items table */}
        <div style={{ border: "1px solid var(--border)", borderRadius: "0.5rem", overflow: "hidden", marginBottom: "1rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>Item</th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600 }}>On hand</th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600 }}>Min level</th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600, width: 120 }}>Qty to add</th>
                <th style={{ padding: "0.5rem 0.75rem", width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "1.25rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No items. All stock is above minimum levels.
                  </td>
                </tr>
              )}
              {lines.map((line, idx) => {
                const isLow = line.minLevel > 0 && line.currentQty < line.minLevel;
                return (
                  <tr key={line.catalogItemId} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{line.name}</span>
                      {line.sku && <span style={{ marginLeft: "0.4rem", fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{line.sku}</span>}
                      {isLow && (
                        <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", background: "var(--danger-sub)", color: "var(--danger)", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>Low</span>
                      )}
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: isLow ? "var(--danger)" : "var(--text-primary)", fontWeight: isLow ? 600 : 400 }}>
                      {line.currentQty}
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "var(--text-secondary)" }}>
                      {line.minLevel > 0 ? line.minLevel : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>
                      <input
                        type="number"
                        min="0"
                        className="inventory-modal-input"
                        style={{ marginBottom: 0, textAlign: "right", width: "100%" }}
                        value={line.qtyReceived}
                        onChange={(e) => { const v = parseInt(e.target.value, 10); setQty(idx, Number.isNaN(v) ? 0 : Math.max(0, v)); }}
                        disabled={!!successMsg}
                      />
                    </td>
                    <td style={{ padding: "0.4rem 0.5rem", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        title="Remove row"
                        disabled={!!successMsg}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1, padding: 0 }}
                      >×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            {totalUnits > 0 ? `${totalUnits} unit${totalUnits !== 1 ? "s" : ""} across ${lines.filter(l => l.qtyReceived > 0).length} item${lines.filter(l => l.qtyReceived > 0).length !== 1 ? "s" : ""}` : "No quantities entered"}
          </span>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              className="inventory-button"
              onClick={onClose}
              style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
            >
              {successMsg ? "Close" : "Cancel"}
            </button>
            {!successMsg && (
              <button
                className="inventory-button"
                onClick={handleSave}
                disabled={saving || lines.every(l => l.qtyReceived === 0)}
              >
                {saving ? "Saving…" : "Record delivery"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
