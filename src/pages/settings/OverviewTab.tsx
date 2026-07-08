import { useState, useEffect } from "react";
import api from "../../data/api";
import { getErrorMessage } from "../../utils/apiError";
import type { Building } from "../../types";
import { formatDate } from "../../utils/formatDate";

interface OverviewTabProps {
  activeBuilding: Building | null;
  setTab: (tab: string) => void;
  navigate: (path: string) => void;
}

export function OverviewTab({ activeBuilding, setTab, navigate }: OverviewTabProps) {
  const [recipients, setRecipients] = useState<any[] | null>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [openMessages, setOpenMessages] = useState<any[] | null>(null);
  const [areas, setAreas] = useState<any[] | null>(null);
  const [jobs, setJobs] = useState<any[] | null>(null);

  useEffect(() => {
    if (!activeBuilding) return;
    let mounted = true;
    api.get(`/ReportRecipients?buildingId=${activeBuilding.buildingId}`).then((r) => { if (mounted) setRecipients(r.data); });
    api.get(`/scheduledreportconfigs?buildingId=${activeBuilding.buildingId}`).then((r) => { if (mounted) setSchedule(r.data); });
    api.get(`/technicianmessages?buildingId=${activeBuilding.buildingId}&status=Open`).then((r) => { if (mounted) setOpenMessages(r.data); });
    api.get(`/BuildingAreas?buildingId=${activeBuilding.buildingId}`).then((r) => { if (mounted) setAreas(r.data.items); });
    api.get(`/recurringjobs`).then((r) => { if (mounted) setJobs(r.data); });
    return () => { mounted = false; };
  }, [activeBuilding]);

  const activeRecipients = (recipients ?? []).filter((r) => r.isActive).length;
  const totalRecipients  = (recipients ?? []).length;
  const enabledJobs = (jobs ?? []).filter((j) => j.enabled).length;
  const totalJobs   = (jobs ?? []).length;

  if (!activeBuilding) {
    return (
      <div className="settings-card">
        <h2 className="settings-card-title">No building selected</h2>
        <p className="settings-card-desc">
          Use the building switcher in the sidebar to pick a building. Building-scoped settings
          (recipients, report schedule, messages, areas) will then become editable.
        </p>
        <button className="inventory-button" onClick={() => navigate("/users")}>
          Manage Users instead
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="settings-overview-grid">
        <OverviewCard
          label="Report recipients"
          value={recipients == null ? "…" : `${activeRecipients}`}
          desc={recipients == null ? "Loading…" : `${activeRecipients} active of ${totalRecipients} total`}
          onClick={() => setTab("recipients")}
        />
        <OverviewCard
          label="Report schedule"
          value={schedule?.cadence ?? "Off"}
          desc={
            schedule?.lastSentAt
              ? `Last sent ${formatDate(schedule.lastSentAt)}`
              : "Not sent yet"
          }
          onClick={() => setTab("schedule")}
        />
        <OverviewCard
          label="Open messages"
          value={openMessages == null ? "…" : `${openMessages.length}`}
          desc={
            openMessages == null
              ? "Loading…"
              : openMessages.length === 0
                ? "No flagged work orders"
                : "From technicians, needs review"
          }
          onClick={() => setTab("messages")}
          accent={(openMessages?.length ?? 0) > 0 ? "warn" : null}
        />
        <OverviewCard
          label="Background jobs"
          value={jobs == null ? "…" : `${enabledJobs}/${totalJobs}`}
          desc={jobs == null ? "Loading…" : "Enabled / total recurring jobs"}
          onClick={() => setTab("jobs")}
        />
        <OverviewCard
          label="Building areas"
          value={areas == null ? "…" : `${areas.length}`}
          desc={areas == null ? "Loading…" : "Floors / zones configured"}
          onClick={() => setTab("areas")}
        />
        <OverviewCard
          label="User management"
          value="↗"
          desc="Add, deactivate, or reassign users"
          onClick={() => navigate("/users")}
        />
      </div>

      <div className="settings-card">
        <h2 className="settings-card-title">How this page is organized</h2>
        <p className="settings-card-desc">
          The tabs above cover per-building configuration (Recipients, Schedule, Messages, Areas) and
          system-wide settings (Job Cadence). Changes save immediately — there is no "publish" step.
        </p>
      </div>

      <BackfillConsumptionCard />
    </>
  );
}

function OverviewCard({ label, value, desc, onClick, accent = null }: { label: string; value: string; desc: string; onClick: () => void; accent?: string | null }) {
  return (
    <button className="settings-overview-card" onClick={onClick} aria-label={`${label}: ${value}. ${desc}`}>
      <span className="label">{label}</span>
      <span className="value" style={accent === "warn" ? { color: "var(--warning)" } : undefined}>
        {value}
      </span>
      <span className="desc">{desc}</span>
    </button>
  );
}

interface BackfillRow {
  catalogItemId: number;
  buildingId: number;
  qtyConsumed: number;
  workOrderId?: number;
  source?: string;
  skipped: boolean;
  reason?: string;
  qtyBefore?: number;
  qtyAfter?: number;
  qtyDelta?: number;
}

interface BackfillResult {
  message: string;
  applied: boolean;
  rowsProcessed?: number;
  itemsUpdated?: number;
  rows: BackfillRow[];
}

function BackfillConsumptionCard() {
  const [status, setStatus] = useState<"idle" | "previewing" | "preview-done" | "applying" | "done" | "error">("idle");
  const [result, setResult] = useState<BackfillResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRows, setShowRows] = useState(false);

  const handlePreview = async () => {
    setStatus("previewing");
    setError(null);
    setResult(null);
    try {
      const res = await api.post(`/Inventory/backfill-consumption`);
      setResult(res.data);
      setStatus("preview-done");
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus("error");
    }
  };

  const handleApply = async () => {
    setStatus("applying");
    setError(null);
    try {
      const res = await api.post(`/Inventory/backfill-consumption?apply=true`);
      setResult(res.data);
      setStatus("done");
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus("error");
    }
  };

  const reset = () => { setStatus("idle"); setResult(null); setError(null); setShowRows(false); };

  const actionable = result?.rows ? result.rows.filter((r) => !r.skipped) : [];
  const skipped = result?.rows ? result.rows.filter((r) => r.skipped) : [];

  return (
    <div className="settings-card" style={{ borderLeft: "3px solid var(--warning)" }}>
      <h2 className="settings-card-title">Data Tools</h2>
      <p className="settings-card-desc" style={{ marginBottom: "1rem" }}>
        One-time maintenance operations. These actions affect inventory quantities permanently.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
          Backfill inventory from work orders
        </p>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
          Finds completed work orders whose filter consumption was never deducted from inventory.
          Preview first, then apply to update quantities and write the audit trail.
        </p>
      </div>

      {error && (
        <div className="alert alert--danger alert--inline" style={{ marginTop: "0.75rem" }}>{error}</div>
      )}

      {status === "preview-done" && result && (
        <div style={{
          marginTop: "0.75rem",
          padding: "0.75rem 1rem",
          borderRadius: "0.5rem",
          background: actionable.length > 0 ? "rgba(234,179,8,0.08)" : "rgba(34,197,94,0.08)",
          border: `1px solid ${actionable.length > 0 ? "rgba(234,179,8,0.3)" : "rgba(34,197,94,0.3)"}`,
          fontSize: "0.85rem",
        }}>
          <p style={{ margin: "0 0 0.35rem", fontWeight: 600, color: "var(--text-primary)" }}>
            {result.message}
          </p>
          {skipped.length > 0 && (
            <p style={{ margin: "0 0 0.35rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
              {skipped.length} row{skipped.length !== 1 ? "s" : ""} skipped — no matching inventory item found.
            </p>
          )}
          {(result.rows?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setShowRows((s) => !s)}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.78rem", padding: 0, textDecoration: "underline" }}
            >
              {showRows ? "Hide rows" : `Show ${result.rows.length} rows`}
            </button>
          )}
          {showRows && result.rows && (
            <div style={{ marginTop: "0.5rem", maxHeight: 220, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "0.375rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "4px 8px", textAlign: "left", color: "var(--text-secondary)" }}>Source</th>
                    <th style={{ padding: "4px 8px", textAlign: "left", color: "var(--text-secondary)" }}>WO #</th>
                    <th style={{ padding: "4px 8px", textAlign: "right", color: "var(--text-secondary)" }}>Consumed</th>
                    <th style={{ padding: "4px 8px", textAlign: "right", color: "var(--text-secondary)" }}>Before</th>
                    <th style={{ padding: "4px 8px", textAlign: "right", color: "var(--text-secondary)" }}>After</th>
                    <th style={{ padding: "4px 8px", textAlign: "left", color: "var(--text-secondary)" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border)", opacity: row.skipped ? 0.5 : 1 }}>
                      <td style={{ padding: "4px 8px", fontSize: "0.72rem", color: "var(--text-muted)" }}>{row.source ?? "—"}</td>
                      <td style={{ padding: "4px 8px", color: "var(--text-secondary)" }}>{row.workOrderId ?? "—"}</td>
                      <td style={{ padding: "4px 8px", textAlign: "right" }}>{row.qtyConsumed}</td>
                      <td style={{ padding: "4px 8px", textAlign: "right", color: "var(--text-muted)", fontFamily: "monospace" }}>{row.qtyBefore ?? "—"}</td>
                      <td style={{ padding: "4px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: row.skipped ? "var(--text-muted)" : "var(--text-primary)" }}>{row.qtyAfter ?? "—"}</td>
                      <td style={{ padding: "4px 8px" }}>
                        {row.skipped
                          ? <span style={{ color: "var(--danger)", fontSize: "0.72rem" }}>Skipped</span>
                          : <span style={{ color: "var(--success)", fontSize: "0.72rem" }}>Ready</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {status === "done" && result && (
        <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", borderRadius: "0.5rem", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", fontSize: "0.85rem" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "var(--success)" }}>✓ {result.message}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
        {(status === "idle" || status === "error") && (
          <button className="inventory-button inventory-button--secondary" onClick={handlePreview}>
            Preview backfill
          </button>
        )}
        {status === "previewing" && (
          <button className="inventory-button inventory-button--secondary" disabled>Checking…</button>
        )}
        {status === "preview-done" && actionable.length > 0 && (
          <>
            <button
              className="inventory-button"
              style={{ background: "var(--warning)", color: "#000" }}
              onClick={handleApply}
            >
              Apply backfill ({actionable.length} row{actionable.length !== 1 ? "s" : ""})
            </button>
            <button className="inventory-button inventory-button--secondary" onClick={reset}>
              Cancel
            </button>
          </>
        )}
        {status === "preview-done" && actionable.length === 0 && (result?.rows?.length ?? 0) === 0 && (
          <button className="inventory-button inventory-button--secondary" onClick={reset}>
            Nothing to apply — dismiss
          </button>
        )}
        {status === "preview-done" && actionable.length === 0 && (result?.rows?.length ?? 0) > 0 && (
          <>
            <button
              className="inventory-button"
              style={{ background: "var(--warning)", color: "#000" }}
              onClick={handleApply}
            >
              Apply backfill ({result!.rows.length} row{result!.rows.length !== 1 ? "s" : ""})
            </button>
            <button className="inventory-button inventory-button--secondary" onClick={reset}>
              Cancel
            </button>
          </>
        )}
        {status === "applying" && (
          <button className="inventory-button" disabled style={{ background: "var(--warning)", color: "#000" }}>
            Applying…
          </button>
        )}
        {status === "done" && (
          <button className="inventory-button inventory-button--secondary" onClick={reset}>
            Done
          </button>
        )}
      </div>
    </div>
  );
}
