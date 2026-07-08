import { useState, useEffect } from "react";
import { SlCheck } from "react-icons/sl";
import api from "../../data/api";
import { getErrorMessage } from "../../utils/apiError";
import { describeCron, PRESET_LABEL } from "../../utils/cron";
import { formatDateTime } from "../../utils/formatDate";

const JOB_LABELS: Record<string, { title: string; desc: string }> = {
  "low-stock-alerts": {
    title: "Low-stock alerts",
    desc: "Scans inventory and emails active recipients when items fall below their minimum levels. Auto-throttled to one email per building per 24 hours.",
  },
  "scheduled-reports": {
    title: "Scheduled reports",
    desc: "Sends recurring summary emails per building based on each building's Report Schedule cadence.",
  },
  "notification-evaluation": {
    title: "Notification evaluation",
    desc: "Evaluates alert conditions (low stock, overdue work orders) and creates in-app notifications.",
  },
  "demo-reset": {
    title: "Demo data refresh",
    desc: "Wipes and reseeds every demo building with fresh, time-shifted data. Does nothing until the demo tenant is provisioned (Settings → Demo Tenant).",
  },
};

const CRON_PRESETS = Object.entries(PRESET_LABEL).map(([value, label]) => ({ label, value }));

export function JobsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, { cron: string; enabled: boolean }>>({});
  const [savingName, setSavingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<{ jobName: string; at: Date } | null>(null);

  const refresh = async () => {
    const r = await api.get(`/recurringjobs`);
    setRows(r.data);
    setEdits(Object.fromEntries(r.data.map((j) => [j.jobName, { cron: j.cron, enabled: j.enabled }])));
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  const handleSave = async (jobName: string) => {
    setError(null);
    setSavingName(jobName);
    try {
      await api.put(`/recurringjobs/${encodeURIComponent(jobName)}`, edits[jobName]);
      setSavedAt({ jobName, at: new Date() });
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingName(null);
    }
  };

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <h2 className="settings-card-title">Background job cadence</h2>
        <span className="pill pill--info">{rows.filter((r) => r.enabled).length} enabled</span>
      </div>
      <p className="settings-card-desc">
        These background jobs run on a recurring schedule — independent of any user being logged in.
        Pick how often each one should fire. The simplest way is to choose a <strong>preset</strong>;
        only edit the raw cron field if you need something the presets don't cover.
        Changes apply live — no restart required.
      </p>

      <details className="cron-help">
        <summary>How cron schedules work (with an example)</summary>
        <div className="cron-help-body">
          <p style={{ margin: "0 0 0.6rem" }}>
            A cron schedule is five fields separated by spaces. Each field controls one unit
            of time, from minutes up to day-of-week:
          </p>
          <pre className="cron-diagram" aria-hidden="true">
{`┌───── minute        (0–59)
│ ┌─── hour          (0–23)
│ │ ┌─ day of month  (1–31)
│ │ │ ┌ month        (1–12)
│ │ │ │ ┌ day of week (0–6, Sun–Sat)
│ │ │ │ │
0 8 * * 1`}
          </pre>
          <p style={{ margin: "0 0 0.4rem" }}>
            The example <code>0 8 * * 1</code> means: <strong>minute 0, hour 8, any day-of-month,
            any month, only on Monday</strong> — so the job fires at <strong>08:00 every Monday</strong>.
          </p>
          <p style={{ margin: "0 0 0.4rem" }}>A few shorthands you'll see in the presets:</p>
          <ul style={{ margin: "0 0 0.6rem 1.1rem", padding: 0, color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6 }}>
            <li><code>*</code> — any value (any minute, any hour, etc.).</li>
            <li><code>*/15</code> in the minute field — every 15 minutes.</li>
            <li><code>0 */6 * * *</code> — minute 0 of every 6th hour (00:00, 06:00, 12:00, 18:00).</li>
            <li><code>0 0 * * *</code> — daily at midnight UTC.</li>
          </ul>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.82rem" }}>
            Times are evaluated in UTC. If you save an invalid expression the server rejects it
            and your previous schedule is kept.
          </p>
        </div>
      </details>

      {error && <div className="alert alert--danger alert--inline" style={{ marginBottom: "0.75rem" }}>{String(error)}</div>}

      {rows.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No jobs registered yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {rows.map((j) => {
            const edit = edits[j.jobName] ?? { cron: j.cron, enabled: j.enabled };
            const meta = JOB_LABELS[j.jobName] ?? { title: j.jobName, desc: "" };
            const dirty = edit.cron !== j.cron || edit.enabled !== j.enabled;
            const english = describeCron(edit.cron);
            return (
              <article key={j.jobName} className="message-card" aria-label={`Job ${meta.title}`}>
                <header className="message-meta">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
                    <strong style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>{meta.title}</strong>
                    <code style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{j.jobName}</code>
                    <span className={`pill pill--${edit.enabled ? "success" : "muted"}`}>
                      {edit.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <span className="message-time">
                    Updated {formatDateTime(j.updatedAt)}
                  </span>
                </header>

                {meta.desc && (
                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.45 }}>
                    {meta.desc}
                  </p>
                )}

                <div className="job-row">
                  <div className="cron-line">
                    <input
                      className="inventory-modal-input cron-input"
                      style={{ marginBottom: 0 }}
                      value={edit.cron}
                      onChange={(e) => setEdits((p) => ({ ...p, [j.jobName]: { ...edit, cron: e.target.value } }))}
                      placeholder="e.g. 0 * * * *"
                      aria-label={`Cron expression for ${meta.title}`}
                    />
                    <select
                      className="table-filter-select"
                      value=""
                      aria-label={`Apply preset for ${meta.title}`}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        setEdits((p) => ({ ...p, [j.jobName]: { ...edit, cron: e.target.value } }));
                      }}
                    >
                      <option value="">Presets…</option>
                      {CRON_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <label className="switch" aria-label={`Enable ${meta.title}`}>
                      <input
                        type="checkbox"
                        checked={edit.enabled}
                        onChange={(e) => setEdits((p) => ({ ...p, [j.jobName]: { ...edit, enabled: e.target.checked } }))}
                      />
                      <span className="track"><span className="thumb" /></span>
                    </label>
                    <button
                      className="inventory-button"
                      onClick={() => handleSave(j.jobName)}
                      disabled={!dirty || savingName === j.jobName}
                    >
                      {savingName === j.jobName ? "Saving…" : "Save"}
                    </button>
                    {savedAt?.jobName === j.jobName && (
                      <span className="saved-flash"><SlCheck /> Applied.</span>
                    )}
                  </div>
                  <p className="english">
                    Schedule: <strong>{english}</strong>
                    {english.startsWith("Custom —") && (
                      <> · pattern <code>{edit.cron}</code></>
                    )}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
