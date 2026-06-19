import { useState, useEffect, useCallback } from "react";
import api from "../data/api";
import { getErrorMessage } from "../utils/apiError";
import { formatDate } from "../utils/formatDate";

interface LedgerEntry {
  id: number;
  catalogItemId: number;
  catalogItemName?: string;
  catalogItemSku?: string;
  inventoryItemNumber?: number;
  qtyBefore: number;
  qtyAfter: number;
  qtyDelta: number;
  changeType: string;
  reason?: string;
  referenceNumber?: string;
  restockRequestId?: number;
  workOrderId?: number;
  userId?: string;
  userName?: string;
  createdAt: string;
}

interface Props {
  buildingId: number;
  catalogItemId?: number;
  itemName?: string;
  onClose: () => void;
}

const CHANGE_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  Restock:              { label: "Restock",       color: "var(--success)",    bg: "rgba(34,197,94,0.12)" },
  PhysicalCount:        { label: "Physical count", color: "var(--accent)",     bg: "rgba(59,130,246,0.12)" },
  WorkOrderConsumption: { label: "Work order",     color: "var(--warning)",    bg: "rgba(234,179,8,0.12)" },
  ManualAdjustment:     { label: "Manual edit",    color: "var(--text-secondary)", bg: "var(--bg-subtle)" },
  NewItem:              { label: "Created",         color: "var(--text-muted)", bg: "var(--bg-subtle)" },
  BulkUploadNew:        { label: "Bulk upload",    color: "var(--text-secondary)", bg: "var(--bg-subtle)" },
  BulkUploadAdd:        { label: "Bulk add",       color: "var(--text-secondary)", bg: "var(--bg-subtle)" },
  BulkUploadOverwrite:  { label: "Bulk overwrite", color: "var(--text-secondary)", bg: "var(--bg-subtle)" },
  ZohoSync:             { label: "Zoho sync",      color: "var(--accent)",     bg: "rgba(59,130,246,0.12)" },
};

function ChangeTypeBadge({ type }: { type: string }) {
  const meta = CHANGE_TYPE_LABELS[type] ?? { label: type, color: "var(--text-muted)", bg: "var(--bg-subtle)" };
  return (
    <span style={{
      display: "inline-block",
      fontSize: "0.72rem",
      fontWeight: 600,
      padding: "2px 7px",
      borderRadius: 4,
      color: meta.color,
      background: meta.bg,
      whiteSpace: "nowrap",
    }}>
      {meta.label}
    </span>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const positive = delta > 0;
  const zero = delta === 0;
  return (
    <span style={{
      fontFamily: "monospace",
      fontWeight: 600,
      color: zero ? "var(--text-muted)" : positive ? "var(--success)" : "var(--danger)",
    }}>
      {positive ? "+" : ""}{delta}
    </span>
  );
}

const PAGE_SIZE = 20;

export default function LedgerModal({ buildingId, catalogItemId, itemName, onClose }: Props) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        buildingId: String(buildingId),
        page: String(p),
        pageSize: String(PAGE_SIZE),
      });
      if (catalogItemId != null) params.set("catalogItemId", String(catalogItemId));
      const res = await api.get(`/Inventory/ledger?${params}`);
      setEntries(res.data.items);
      setTotalCount(res.data.totalCount);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [buildingId, catalogItemId]);

  useEffect(() => { load(1); }, [load]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handlePage = (p: number) => {
    setPage(p);
    load(p);
  };

  return (
    <div
      className="inventory-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Inventory ledger"
    >
      <div className="inventory-modal-card" style={{ maxWidth: 780, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0 }}>Inventory ledger</h2>
            {itemName && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {itemName}
              </p>
            )}
            {!itemName && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                All items — full transaction history
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--text-muted)", lineHeight: 1, marginLeft: "1rem" }}
          >✕</button>
        </div>

        {error && (
          <div className="alert alert--danger alert--inline" style={{ marginBottom: "1rem", flexShrink: 0 }}>{error}</div>
        )}

        {/* Scrollable table */}
        <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "0.5rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>Date</th>
                {!catalogItemId && <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>Item</th>}
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>Type</th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600 }}>Before</th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600 }}>After</th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600 }}>Change</th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={catalogItemId ? 6 : 7} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && entries.length === 0 && (
                <tr>
                  <td colSpan={catalogItemId ? 6 : 7} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No transaction history yet.
                  </td>
                </tr>
              )}
              {!loading && entries.map((entry) => {
                const details: string[] = [];
                if (entry.referenceNumber) details.push(`Ref: ${entry.referenceNumber}`);
                if (entry.workOrderId) details.push(`WO #${entry.workOrderId}`);
                if (entry.userName) details.push(entry.userName);
                if (entry.reason) details.push(entry.reason);

                return (
                  <tr key={entry.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem 0.75rem", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                      {formatDate(entry.createdAt)}{" "}
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    {!catalogItemId && (
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{entry.catalogItemName ?? "—"}</span>
                        {entry.catalogItemSku && (
                          <span style={{ marginLeft: "0.35rem", fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{entry.catalogItemSku}</span>
                        )}
                      </td>
                    )}
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <ChangeTypeBadge type={entry.changeType} />
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "var(--text-secondary)", fontFamily: "monospace" }}>{entry.qtyBefore}</td>
                    <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "var(--text-primary)", fontFamily: "monospace", fontWeight: 600 }}>{entry.qtyAfter}</td>
                    <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>
                      <DeltaBadge delta={entry.qtyDelta} />
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-muted)", fontSize: "0.78rem", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {details.length > 0 ? details.join(" · ") : <span style={{ color: "var(--border)" }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", flexShrink: 0 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {totalCount} transaction{totalCount !== 1 ? "s" : ""}
          </span>
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <button
                className="inventory-button"
                style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", padding: "4px 10px", fontSize: "0.8rem" }}
                onClick={() => handlePage(page - 1)}
                disabled={page <= 1 || loading}
              >← Prev</button>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {page} / {totalPages}
              </span>
              <button
                className="inventory-button"
                style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", padding: "4px 10px", fontSize: "0.8rem" }}
                onClick={() => handlePage(page + 1)}
                disabled={page >= totalPages || loading}
              >Next →</button>
            </div>
          )}
          <button className="inventory-button" onClick={onClose}
            style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
