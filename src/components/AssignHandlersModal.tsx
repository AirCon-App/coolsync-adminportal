import { useState, useEffect, useMemo } from "react";
import api from "../data/api";
import { getErrorMessage } from "../utils/apiError";

interface Handler {
  id: number;
  name: string;
  areaId?: number | null;
  areaLabel?: string | null;
}

interface Props {
  buildingId: number;
  areaId: number;
  areaName: string;
  handlers: Handler[];
  onClose: () => void;
  onSaved: () => void;
}

export default function AssignHandlersModal({ buildingId, areaId, areaName, handlers, onClose, onSaved }: Props) {
  // Additive assignment: selecting handlers assigns them to this area.
  // Handlers already in this area are shown but left unchecked — removal is a
  // separate action in the expanded area list, so unchecking here is a no-op.
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q ? handlers.filter((h) => h.name.toLowerCase().includes(q)) : handlers;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [handlers, filter]);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post("/AirHandlers/bulk-assign-area", {
        buildingId,
        handlerIds: [...selected],
        areaId,
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="inventory-modal-backdrop" onClick={onClose}>
      <div className="inventory-modal-card" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <h2>Assign handlers to {areaName}</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 0 }}>
          Select the air handlers that belong to this area. Their current area is shown for reference.
        </p>

        <input
          className="inventory-modal-input"
          style={{ marginBottom: "0.75rem" }}
          placeholder="Search handlers…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <div
          style={{
            maxHeight: 320,
            overflowY: "auto",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
          }}
        >
          {visible.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "1.5rem", margin: 0 }}>
              No air handlers found.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {visible.map((h) => {
                const currentLabel = (h.areaLabel ?? "").trim();
                const inThisArea = h.areaId === areaId;
                return (
                  <li
                    key={h.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      padding: "0.5rem 0.85rem",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={inThisArea || selected.has(h.id)}
                      disabled={inThisArea}
                      onChange={() => toggle(h.id)}
                      style={{ cursor: inThisArea ? "default" : "pointer" }}
                    />
                    <span style={{ color: "var(--text-primary)", fontSize: "0.9rem", flex: 1 }}>{h.name}</span>
                    <span style={{ color: inThisArea ? "var(--text-muted)" : "var(--text-secondary)", fontSize: "0.78rem" }}>
                      {inThisArea ? "in this area" : currentLabel || "ungrouped"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <div className="alert alert--danger alert--inline" style={{ marginTop: "0.75rem" }}>
            {typeof error === "string" ? error : "Failed to assign handlers."}
          </div>
        )}

        <div className="inventory-modal-actions" style={{ marginTop: "0.85rem" }}>
          <button type="button" className="button inventory-modal-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
