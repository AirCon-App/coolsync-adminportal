import { useState, useEffect } from "react";
import { SlCheck } from "react-icons/sl";
import { TbCopy, TbPlus, TbRefresh, TbTrash } from "react-icons/tb";
import api from "../../data/api";
import { getErrorMessage } from "../../utils/apiError";
import { formatDateTime } from "../../utils/formatDate";

interface DemoSlot {
  ordinal: number;
  profileName: string;
  provisioned: boolean;
  buildingId: number | null;
  buildingName: string | null;
  demoUsers: string[];
}

interface DemoStatus {
  provisioned: boolean;
  maxBuildings: number;
  slots: DemoSlot[];
}

interface DemoResetResult {
  buildingId: number;
  buildingName: string;
  areas: number;
  airHandlers: number;
  inventoryItems: number;
  openWorkOrders: number;
  completedWorkOrders: number;
  consumptionLogs: number;
  resetAt: string;
}

interface DemoDeleteResult {
  buildingId: number;
  buildingName: string;
  usersRemoved: string[];
}

type SlotAction = "populate" | "refresh" | "delete";

interface LastAction {
  action: SlotAction;
  seed?: DemoResetResult;
  deletion?: DemoDeleteResult;
}

const actionButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.25rem",
  fontSize: "0.75rem",
  padding: "0.25rem 0.7rem",
  borderRadius: "999px",
  border: "1px solid var(--border, currentColor)",
  background: "none",
  color: "var(--text-secondary)",
  cursor: "pointer",
};

export function DemoTab() {
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<{ ordinal: number; action: SlotAction } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // The switcher's building list is fetched at login; a freshly populated demo building
  // won't appear in it (nor a deleted one disappear) until the app reloads.
  const [showReloadHint, setShowReloadHint] = useState(false);

  const refresh = async () => {
    try {
      const r = await api.get<DemoStatus>(`/demo/status`);
      setStatus(r.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (confirmingDelete === null) return;
    const t = setTimeout(() => setConfirmingDelete(null), 5000);
    return () => clearTimeout(t);
  }, [confirmingDelete]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const runAction = async (slot: DemoSlot, action: SlotAction) => {
    if (action === "delete" && confirmingDelete !== slot.ordinal) {
      setConfirmingDelete(slot.ordinal);
      return;
    }
    setConfirmingDelete(null);
    setError(null);
    setActing({ ordinal: slot.ordinal, action });
    try {
      if (action === "delete") {
        const r = await api.delete<DemoDeleteResult>(`/demo/slots/${slot.ordinal}`);
        setLastAction({ action, deletion: r.data });
        setShowReloadHint(true);
      } else {
        const r = await api.post<DemoResetResult>(`/demo/slots/${slot.ordinal}/${action}`);
        setLastAction({ action, seed: r.data });
        if (action === "populate" && !slot.provisioned) setShowReloadHint(true);
      }
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActing(null);
    }
  };

  const copyEmail = async (email: string) => {
    await navigator.clipboard.writeText(email);
    setCopied(email);
  };

  const provisionedCount = status?.slots.filter((s) => s.provisioned).length ?? 0;
  const busy = acting !== null || loading;

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <h2 className="settings-card-title">Demo tenant</h2>
        <span className={`pill pill--${provisionedCount > 0 ? "success" : "muted"}`}>
          {loading ? "Checking…" : provisionedCount > 0
            ? `Provisioned (${provisionedCount}/${status?.maxBuildings ?? 5})`
            : "Not provisioned"}
        </span>
      </div>
      <p className="settings-card-desc">
        Up to {status?.maxBuildings ?? 5} sandboxed demo buildings with realistic, time-shifted
        data for sales demos and screen-shares — each with its own areas, air handlers, and demo
        accounts. They are invisible to real users, excluded from cross-building reports, and
        never email anyone. Provisioned buildings are refreshed automatically every night.
        <strong> Populate</strong> creates and seeds a building, <strong>Refresh</strong> restores
        its pristine dataset, and <strong>Delete</strong> removes the building, all of its data,
        and its demo accounts.
      </p>

      {error && (
        <div className="alert alert--danger alert--inline" style={{ marginBottom: "0.75rem" }}>
          {String(error)}
        </div>
      )}

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {(status?.slots ?? []).map((slot) => {
          const isActing = acting?.ordinal === slot.ordinal;
          return (
            <li
              key={slot.ordinal}
              data-testid={`demo-slot-${slot.ordinal}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                padding: "0.6rem 0.75rem",
                border: "1px solid var(--border, rgba(128,128,128,0.35))",
                borderRadius: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <strong style={{ color: "var(--text-primary)", fontSize: "0.9rem" }}>
                  {slot.buildingName ?? slot.profileName}
                </strong>
                <span className="demo-badge">DEMO</span>
                <span className={`pill pill--${slot.provisioned ? "success" : "muted"}`}>
                  {slot.provisioned ? "Provisioned" : "Empty"}
                </span>
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  {!slot.provisioned && (
                    <button
                      style={actionButtonStyle}
                      onClick={() => runAction(slot, "populate")}
                      disabled={busy}
                      data-testid={`demo-populate-${slot.ordinal}`}
                    >
                      <TbPlus size={13} />
                      {isActing && acting?.action === "populate" ? "Populating…" : "Populate"}
                    </button>
                  )}
                  {slot.provisioned && (
                    <>
                      <button
                        style={actionButtonStyle}
                        onClick={() => runAction(slot, "refresh")}
                        disabled={busy}
                        data-testid={`demo-refresh-${slot.ordinal}`}
                      >
                        <TbRefresh size={13} />
                        {isActing && acting?.action === "refresh" ? "Refreshing…" : "Refresh"}
                      </button>
                      <button
                        style={{ ...actionButtonStyle, color: "var(--danger, #c0392b)", borderColor: "var(--danger, #c0392b)" }}
                        onClick={() => runAction(slot, "delete")}
                        disabled={busy}
                        data-testid={`demo-delete-${slot.ordinal}`}
                      >
                        <TbTrash size={13} />
                        {isActing && acting?.action === "delete"
                          ? "Deleting…"
                          : confirmingDelete === slot.ordinal
                            ? "Click again to confirm"
                            : "Delete"}
                      </button>
                    </>
                  )}
                </span>
              </div>
              {confirmingDelete === slot.ordinal && (
                <span style={{ color: "var(--warning)", fontSize: "0.78rem" }}>
                  Deletes this building, all of its data, and its demo accounts.
                </span>
              )}
              {slot.provisioned && (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {slot.demoUsers.map((email) => (
                    <li key={email} style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <code style={{ fontSize: "0.8rem" }}>{email}</code>
                      <button
                        className="icon-button"
                        onClick={() => copyEmail(email)}
                        aria-label={`Copy ${email}`}
                        title="Copy email"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "inline-flex" }}
                      >
                        <TbCopy size={14} />
                      </button>
                      {copied === email && <span className="saved-flash"><SlCheck /> Copied</span>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {lastAction?.seed && (
        <div style={{ marginTop: "0.85rem" }}>
          <p style={{ margin: "0 0 0.4rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            {lastAction.action === "populate" ? "Populated" : "Refreshed"}{" "}
            <strong style={{ color: "var(--text-primary)" }}>{lastAction.seed.buildingName}</strong>{" "}
            {formatDateTime(lastAction.seed.resetAt)} — seeded:
          </p>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <span className="pill pill--info">{lastAction.seed.areas} areas</span>
            <span className="pill pill--info">{lastAction.seed.airHandlers} air handlers</span>
            <span className="pill pill--info">{lastAction.seed.inventoryItems} inventory lines</span>
            <span className="pill pill--info">{lastAction.seed.openWorkOrders} open work orders</span>
            <span className="pill pill--info">{lastAction.seed.completedWorkOrders} completed work orders</span>
            <span className="pill pill--info">{lastAction.seed.consumptionLogs} consumption logs</span>
          </div>
        </div>
      )}
      {lastAction?.deletion && (
        <p style={{ margin: "0.85rem 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Deleted <strong style={{ color: "var(--text-primary)" }}>{lastAction.deletion.buildingName}</strong>
          {lastAction.deletion.usersRemoved.length > 0 && (
            <> and removed {lastAction.deletion.usersRemoved.map((e) => <code key={e} style={{ fontSize: "0.8rem", marginLeft: "0.3rem" }}>{e}</code>)}</>
          )}
          .
        </p>
      )}
      {showReloadHint && (
        <p style={{ margin: "0.6rem 0 0", color: "var(--text-muted)", fontSize: "0.82rem" }}>
          Reload the page to update the building switcher.
        </p>
      )}
    </div>
  );
}
