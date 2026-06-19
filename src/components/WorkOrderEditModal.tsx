import { useState, useEffect } from "react";
import api from "../data/api";
import { getErrorMessage } from "../utils/apiError";
import { formatDateTime } from "../utils/formatDate";

export interface WorkOrderModalData {
  id: number;
  handler: string;
  handlerName?: string;
  buildingId: number;
  itemId: number;
  count: number;
  dueDate: string;
  completedDate?: string;
  activityDate?: string;
  technicianId?: string;
  technicianName?: string;
  notes?: string;
  notesEditableUntil?: string;
  origin?: string;
  status: string;
}

interface Props {
  workOrder: WorkOrderModalData;
  onClose: () => void;
  onSaved: (updated: WorkOrderModalData) => void;
  /** When provided, calls resolve-with-workorder and marks the message resolved */
  messageId?: number;
}

const STATUS_COLORS: Record<string, string> = {
  Completed: "var(--success)",
  Overdue: "var(--danger)",
  DueSoon: "var(--warning)",
  Open: "var(--accent)",
};

function toDateInputValue(iso?: string) {
  if (!iso) return "";
  return iso.split("T")[0];
}

export default function WorkOrderEditModal({ workOrder, onClose, onSaved, messageId }: Props) {
  const [count, setCount] = useState(workOrder.count);
  const [dueDate, setDueDate] = useState(toDateInputValue(workOrder.dueDate));
  const [completedDate, setCompletedDate] = useState(toDateInputValue(workOrder.completedDate));
  const [notes, setNotes] = useState(workOrder.notes ?? "");
  const [technicianId, setTechnicianId] = useState(workOrder.technicianId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (messageId != null) {
        // Atomic: update WO + resolve message in one call
        const res = await api.patch(`/technicianmessages/${messageId}/resolve-with-workorder`, {
          count,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          completedDate: completedDate ? new Date(completedDate).toISOString() : undefined,
          notes: notes || undefined,
          technicianId: technicianId || undefined,
        });
        onSaved(res.data);
      } else {
        await api.put(`/WorkOrders/${workOrder.id}`, {
          buildingId: workOrder.buildingId,
          itemId: workOrder.itemId,
          count,
          dueDate: dueDate ? new Date(dueDate).toISOString() : workOrder.dueDate,
          completedDate: completedDate ? new Date(completedDate).toISOString() : workOrder.completedDate,
          notes: notes || undefined,
          technicianId: technicianId || workOrder.technicianId,
        });
        onSaved({ ...workOrder, count, dueDate, completedDate, notes, technicianId });
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const statusColor = STATUS_COLORS[workOrder.status] ?? "var(--text-muted)";
  const isCompleted = !!workOrder.completedDate;

  return (
    <div
      className="inventory-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit work order #${workOrder.id}`}
    >
      <div className="inventory-modal-card" style={{ maxWidth: 520 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ margin: 0 }}>Work Order #{workOrder.id}</h2>
            {workOrder.handlerName && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                {workOrder.handlerName}
              </p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{
              background: statusColor,
              color: "#fff",
              borderRadius: "999px",
              padding: "2px 10px",
              fontSize: "0.75rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}>
              {workOrder.status}
            </span>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "var(--text-muted)", lineHeight: 1 }}
            >✕</button>
          </div>
        </div>

        {/* Body */}
        {error && (
          <div style={{ background: "var(--danger)", color: "#fff", borderRadius: "0.5rem", padding: "0.6rem 0.8rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        {workOrder.activityDate && (
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Last admin edit: {formatDateTime(workOrder.activityDate)}
          </p>
        )}

        <div style={{ marginBottom: "0.75rem" }}>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0 0 0.15rem" }}>Origin</p>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>{workOrder.origin ?? "—"}</p>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.25rem" }} htmlFor="wo-count">
            Filters Changed
          </label>
          <input
            id="wo-count"
            type="number"
            min={0}
            className="inventory-modal-input"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.25rem" }} htmlFor="wo-dueDate">
            Due Date
          </label>
          <input
            id="wo-dueDate"
            type="date"
            className="inventory-modal-input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.25rem" }} htmlFor="wo-completedDate">
            Completed Date{!isCompleted && <span style={{ fontWeight: 400, marginLeft: "0.4rem" }}>(set to mark complete)</span>}
          </label>
          <input
            id="wo-completedDate"
            type="date"
            className="inventory-modal-input"
            value={completedDate}
            onChange={(e) => setCompletedDate(e.target.value)}
            disabled={isCompleted}
          />
          {isCompleted && (
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
              Completed date is locked once set.
            </p>
          )}
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.25rem" }} htmlFor="wo-technician">
            Technician ID
          </label>
          <input
            id="wo-technician"
            type="text"
            className="inventory-modal-input"
            placeholder={workOrder.technicianName ?? "Unassigned"}
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.25rem" }} htmlFor="wo-notes">
            Notes
          </label>
          <textarea
            id="wo-notes"
            className="inventory-modal-input"
            rows={4}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Admin correction notes…"
            style={{ resize: "vertical" }}
          />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
          <button className="inventory-button" onClick={onClose} disabled={saving}
            style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
            Cancel
          </button>
          <button className="inventory-button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : messageId != null ? "Save & Resolve Message" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
