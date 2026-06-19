import { useState, useEffect, useMemo } from "react";
import { SlCheck, SlActionUndo } from "react-icons/sl";
import { TbEdit } from "react-icons/tb";
import api from "../../data/api";
import { getErrorMessage } from "../../utils/apiError";
import WorkOrderEditModal, { WorkOrderModalData } from "../../components/WorkOrderEditModal";
import { formatDateTime } from "../../utils/formatDate";

export function MessagesTab({ buildingId }: { buildingId: number }) {
  const [allRows, setAllRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("Open");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editWo, setEditWo] = useState<{ wo: WorkOrderModalData; messageId: number } | null>(null);
  const [loadingWoId, setLoadingWoId] = useState<number | null>(null);

  const counts = useMemo(() => ({
    open:     allRows.filter((m) => m.status === "Open").length,
    resolved: allRows.filter((m) => m.status === "Resolved").length,
  }), [allRows]);

  const rows = useMemo(() =>
    filter === "all" ? allRows : allRows.filter((m) => m.status === filter),
    [allRows, filter]
  );

  const refresh = () =>
    api.get(`/technicianmessages?buildingId=${buildingId}`)
      .then((r) => { setAllRows(r.data); setFetchError(null); })
      .catch((err) => setFetchError(getErrorMessage(err)));

  useEffect(() => { refresh(); }, [buildingId]);

  const setStatus = async (m: any, status: string) => {
    await api.patch(`/technicianmessages/${m.id}/status`, { status });
    await refresh();
  };

  const handleEditWorkOrder = async (message: any) => {
    if (!message.workOrderId) return;
    setLoadingWoId(message.id);
    try {
      const res = await api.get(`/WorkOrders/${message.workOrderId}`);
      setEditWo({ wo: res.data, messageId: message.id });
    } catch (err) {
      setFetchError(getErrorMessage(err));
    } finally {
      setLoadingWoId(null);
    }
  };

  const handleWoSaved = () => {
    setEditWo(null);
    refresh();
  };

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h2 className="settings-card-title">Technician messages</h2>
          {counts.open > 0 && <span className="pill pill--warn">{counts.open} open</span>}
        </div>
        <select
          className="table-filter-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter messages by status"
        >
          <option value="Open">Open ({counts.open})</option>
          <option value="Resolved">Resolved ({counts.resolved})</option>
          <option value="all">All ({counts.open + counts.resolved})</option>
        </select>
      </div>
      <p className="settings-card-desc">
        Messages flagged from the technician app. Click "Edit Work Order" to correct the linked
        record and resolve the message in one action.
      </p>

      {fetchError && (
        <div className="alert alert--danger alert--inline" style={{ marginBottom: "0.5rem" }}>{fetchError}</div>
      )}

      {rows.length === 0 ? (
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          {filter === "Open" ? "No open messages — you're all caught up." : "No messages in this view."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {rows.map((m) => {
            const isOpen = m.status === "Open";
            return (
              <article key={m.id} className="message-card" aria-label={`Message ${m.id}`}>
                <header className="message-meta">
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <span className="message-author">{m.userFullName || m.userId}</span>
                    {m.handlerName && (
                      <span className="pill pill--info" title="Air handler">{m.handlerName}</span>
                    )}
                    {m.workOrderId != null && (
                      <span className="pill pill--info">WO #{m.workOrderId}</span>
                    )}
                    <span className={`pill pill--${isOpen ? "warn" : "muted"}`}>
                      {m.status}
                    </span>
                  </div>
                  <time className="message-time" dateTime={m.createdAt}>
                    {formatDateTime(m.createdAt)}
                  </time>
                </header>

                <p className="message-body">{m.body}</p>

                <div className="message-actions">
                  {m.workOrderId != null && isOpen && (
                    <button
                      className="inventory-button"
                      style={{ padding: "0.35rem 0.8rem", fontSize: "0.82rem" }}
                      onClick={() => handleEditWorkOrder(m)}
                      disabled={loadingWoId === m.id}
                      title="Edit the linked work order and resolve this message"
                    >
                      <TbEdit style={{ marginRight: "0.3rem" }} />
                      {loadingWoId === m.id ? "Loading…" : "Edit Work Order"}
                    </button>
                  )}
                  {isOpen ? (
                    <button
                      className="inventory-button inventory-button--secondary"
                      style={{ padding: "0.35rem 0.8rem", fontSize: "0.82rem" }}
                      onClick={() => setStatus(m, "Resolved")}
                    >
                      <SlCheck style={{ marginRight: "0.3rem" }} /> Mark resolved
                    </button>
                  ) : (
                    <button
                      className="inventory-button inventory-button--secondary"
                      style={{ padding: "0.35rem 0.8rem", fontSize: "0.82rem" }}
                      onClick={() => setStatus(m, "Open")}
                    >
                      <SlActionUndo style={{ marginRight: "0.3rem" }} /> Reopen
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editWo && (
        <WorkOrderEditModal
          workOrder={editWo.wo}
          messageId={editWo.messageId}
          onClose={() => setEditWo(null)}
          onSaved={handleWoSaved}
        />
      )}
    </div>
  );
}
