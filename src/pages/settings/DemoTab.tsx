import { useState, useEffect } from "react";
import { SlCheck } from "react-icons/sl";
import { TbCopy, TbRefreshAlert } from "react-icons/tb";
import api from "../../data/api";
import { getErrorMessage } from "../../utils/apiError";
import { formatDateTime } from "../../utils/formatDate";

interface DemoStatus {
  provisioned: boolean;
  buildingId?: number;
  buildingName?: string;
  demoUsers?: string[];
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

export function DemoTab() {
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<DemoResetResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // The switcher's building list is fetched at login; a freshly provisioned demo building
  // won't appear in it until the app reloads.
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
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 5000);
    return () => clearTimeout(t);
  }, [confirming]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleReset = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setError(null);
    setResetting(true);
    const wasFirstRun = !provisioned;
    try {
      const r = await api.post<DemoResetResult>(`/demo/reset`);
      setLastResult(r.data);
      setShowReloadHint(wasFirstRun);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResetting(false);
    }
  };

  const copyEmail = async (email: string) => {
    await navigator.clipboard.writeText(email);
    setCopied(email);
  };

  const provisioned = status?.provisioned === true;
  const firstRun = !provisioned;

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <h2 className="settings-card-title">Demo tenant</h2>
        <span className={`pill pill--${provisioned ? "success" : "muted"}`}>
          {loading ? "Checking…" : provisioned ? "Provisioned" : "Not provisioned"}
        </span>
      </div>
      <p className="settings-card-desc">
        A sandboxed demo building with realistic, time-shifted data for sales demos and
        screen-shares. It is invisible to real users, excluded from cross-building reports,
        and never emails anyone. Data is refreshed automatically every night — use the button
        below to restore a pristine dataset right before a demo.
      </p>

      {error && (
        <div className="alert alert--danger alert--inline" style={{ marginBottom: "0.75rem" }}>
          {String(error)}
        </div>
      )}

      {provisioned && (
        <div style={{ marginBottom: "0.85rem" }}>
          <p style={{ margin: "0 0 0.4rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Building: <strong style={{ color: "var(--text-primary)" }}>{status?.buildingName}</strong>
            {" "}<span className="demo-badge">DEMO</span>
          </p>
          <p style={{ margin: "0 0 0.3rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Demo accounts (hand these to the presenter):
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {(status?.demoUsers ?? []).map((email) => (
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
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        <button
          className="inventory-button"
          onClick={handleReset}
          disabled={resetting || loading}
          data-testid="demo-reset-button"
        >
          <TbRefreshAlert style={{ marginRight: "0.35rem", verticalAlign: "-0.12em" }} />
          {resetting
            ? (firstRun ? "Provisioning…" : "Resetting…")
            : confirming
              ? "Click again to confirm"
              : (firstRun ? "Provision demo tenant" : "Reset demo data")}
        </button>
        {confirming && (
          <span style={{ color: "var(--warning)", fontSize: "0.8rem" }}>
            This wipes and reseeds all demo-building data.
          </span>
        )}
      </div>

      {lastResult && (
        <div style={{ marginTop: "0.85rem" }}>
          <p style={{ margin: "0 0 0.4rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Reset completed {formatDateTime(lastResult.resetAt)} — seeded:
          </p>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <span className="pill pill--info">{lastResult.areas} areas</span>
            <span className="pill pill--info">{lastResult.airHandlers} air handlers</span>
            <span className="pill pill--info">{lastResult.inventoryItems} inventory lines</span>
            <span className="pill pill--info">{lastResult.openWorkOrders} open work orders</span>
            <span className="pill pill--info">{lastResult.completedWorkOrders} completed work orders</span>
            <span className="pill pill--info">{lastResult.consumptionLogs} consumption logs</span>
          </div>
          {showReloadHint && (
            <p style={{ margin: "0.6rem 0 0", color: "var(--text-muted)", fontSize: "0.82rem" }}>
              Reload the page to see the demo building in the building switcher.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
