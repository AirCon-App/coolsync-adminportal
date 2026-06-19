import { useState, useEffect, MouseEvent, KeyboardEvent } from "react";
import api from "../data/api";
import { getErrorMessage } from "../utils/apiError";

interface Recipient {
  id: number;
  name: string;
  email: string;
}

interface EmailReportModalProps {
  buildingId: number;
  reportType: string;            // display label, e.g. "Filter Activity"
  apiReportType: "filter" | "inventory"; // server report key
  dateFrom: Date;
  dateTo: Date;
  buildingName: string;
  dateRange: string;
  onClose: () => void;
}

export default function EmailReportModal({ buildingId, reportType, apiReportType, dateFrom, dateTo, buildingName, dateRange, onClose }: EmailReportModalProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Recipient[]>(`/ReportRecipients?buildingId=${buildingId}`)
      .then((r) => { setRecipients(r.data); setLoading(false); })
      .catch(() => { setError("Failed to load recipients."); setLoading(false); });
  }, [buildingId]);

  function toggleRecipient(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  async function handleSend() {
    if (selected.size === 0) return;
    setSending(true);
    setError(null);
    try {
      // The PDF is computed and rendered server-side (single source of truth,
      // shared with the mobile email path) — the client only sends parameters.
      await api.post(`/Reports/email?buildingId=${buildingId}`, {
        recipientIds: [...selected],
        reportType: apiReportType,
        buildingId,
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function handleAddRecipient() {
    if (!newName.trim() || !newEmail.trim()) return;
    setAddingNew(true);
    setAddError(null);
    try {
      const res = await api.post<Recipient>("/ReportRecipients", {
        buildingId,
        name: newName.trim(),
        email: newEmail.trim(),
        isActive: true,
      });
      setRecipients((prev) => [...prev, res.data]);
      setSelected((prev) => new Set([...prev, res.data.id]));
      setNewName("");
      setNewEmail("");
    } catch (err) {
      setAddError(getErrorMessage(err));
    } finally {
      setAddingNew(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/ReportRecipients/${id}`);
      setRecipients((prev) => prev.filter((r) => r.id !== id));
      setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAddRecipient();
  };

  return (
    <div className="inventory-modal-backdrop" onClick={handleBackdropClick}>
      <div className="inventory-modal-card" style={{ maxWidth: 500, padding: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ margin: "0 0 0.2rem", fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Email {reportType} Report
            </h2>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>{buildingName}</p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>{dateRange}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.1rem", lineHeight: 1, padding: "0.1rem 0.25rem", borderRadius: "0.3rem" }}
          >
            ✕
          </button>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <p style={{ color: "var(--success)", fontWeight: 700, fontSize: "1rem", margin: "0 0 0.4rem" }}>Report sent!</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: "0 0 1.25rem" }}>
              Delivered to {selected.size} recipient{selected.size !== 1 ? "s" : ""}.
            </p>
            <button className="button" style={{ margin: 0, width: "auto", padding: "0.5rem 1.5rem" }} onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "1.25rem" }}>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
                Recipients
              </p>
              {loading ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic", margin: 0 }}>Loading...</p>
              ) : recipients.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic", margin: 0 }}>No recipients yet. Add one below.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", maxHeight: 200, overflowY: "auto" }}>
                  {recipients.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => toggleRecipient(r.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        padding: "0.5rem 0.6rem",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                        background: selected.has(r.id) ? "var(--accent-sub)" : "var(--bg-subtle)",
                        border: `1px solid ${selected.has(r.id) ? "var(--border-strong)" : "var(--border)"}`,
                        transition: "background 0.12s, border-color 0.12s",
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                        style={{ accentColor: "var(--accent)", width: 15, height: 15, flexShrink: 0, cursor: "pointer" }}
                      />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ color: "var(--text-primary)", fontSize: "0.88rem", fontWeight: 600, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.name}
                        </span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{r.email}</span>
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.85rem", padding: "0.1rem 0.3rem", borderRadius: "0.25rem", flexShrink: 0 }}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.1rem", marginBottom: "1.25rem" }}>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
                Add Recipient
              </p>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <input
                  className="inventory-modal-input"
                  placeholder="Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{ marginBottom: 0, flex: "1 1 0" }}
                />
                <input
                  className="inventory-modal-input"
                  placeholder="Email address"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{ marginBottom: 0, flex: "1.6 1 0" }}
                />
                <button
                  className="button"
                  onClick={handleAddRecipient}
                  disabled={addingNew || !newName.trim() || !newEmail.trim()}
                  style={{ margin: 0, width: "auto", padding: "0.58rem 1rem", fontSize: "0.85rem", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {addingNew ? "…" : "Add"}
                </button>
              </div>
              {addError && (
                <div className="alert alert--danger alert--inline" style={{ marginTop: "0.35rem" }}>{addError}</div>
              )}
            </div>

            {error && (
              <div className="alert alert--danger alert--inline" style={{ marginBottom: "0.75rem" }}>{error}</div>
            )}
            <div className="inventory-modal-actions">
              <button
                className="button inventory-modal-cancel"
                onClick={onClose}
                style={{ width: "auto", margin: 0, padding: "0.5rem 1.1rem" }}
              >
                Cancel
              </button>
              <button
                className="button"
                onClick={handleSend}
                disabled={sending || selected.size === 0}
                style={{ margin: 0, width: "auto", padding: "0.5rem 1.25rem", opacity: selected.size === 0 ? 0.45 : 1 }}
              >
                {sending ? "Sending…" : `Send to ${selected.size} recipient${selected.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
