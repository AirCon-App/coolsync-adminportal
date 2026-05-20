import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  SlInfo,
  SlEnvolopeLetter,
  SlCalender,
  SlBell,
  SlSettings,
  SlTrash,
  SlCheck,
  SlActionUndo,
} from "react-icons/sl";
import { TbLayoutList, TbClockHour4 } from "react-icons/tb";
import PageShell from "../components/PageShell";
import api from "../data/api";
import { useBuilding } from "../context/BuildingContext";

const TABS = [
  { key: "general",    label: "Overview",         icon: SlInfo,             needsBuilding: false },
  { key: "recipients", label: "Report Recipients", icon: SlEnvolopeLetter,  needsBuilding: true  },
  { key: "schedule",   label: "Report Schedule",   icon: SlCalender,        needsBuilding: true  },
  { key: "jobs",       label: "Job Cadence",       icon: TbClockHour4,      needsBuilding: false },
  { key: "messages",   label: "Messages",          icon: SlBell,            needsBuilding: true  },
  { key: "areas",      label: "Areas",             icon: TbLayoutList,      needsBuilding: false },
];

// ──────────────────────────────────────────────────────────────────────────────
// Cron describer — turns a 5-field expression into plain English.
// Known preset patterns return the preset label verbatim; everything else returns
// "Custom — …" with a description derived from per-field parsing.
// ──────────────────────────────────────────────────────────────────────────────

const PRESET_LABEL = {
  "*/15 * * * *": "Every 15 minutes",
  "*/30 * * * *": "Every 30 minutes",
  "0 * * * *":    "Every hour at :00",
  "0 */6 * * *":  "Every 6 hours",
  "0 8 * * *":    "Daily at 08:00",
  "0 0 * * *":    "Daily at midnight",
  "0 8 * * 1":    "Weekly — Monday at 08:00",
};

const DOW_NAMES   = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"];

function pad2(n) { return String(n).padStart(2, "0"); }

// Parse a single cron field into a structured shape:
//   { kind: "any" }
//   { kind: "every", step }
//   { kind: "list", values: number[] }
// Returns null for unparsable input.
function parseField(token, min, max) {
  if (token === "*") return { kind: "any" };

  // Pure shorthand step over wildcard, e.g. "*/15"
  if (/^\*\/\d+$/.test(token)) {
    const step = parseInt(token.slice(2), 10);
    if (!Number.isFinite(step) || step <= 0) return null;
    return { kind: "every", step };
  }

  // Comma-separated list, each item may be a number, a range "a-b", or
  // a range with step "a-b/N" / "*/N".
  const out = new Set<number>();
  for (const raw of token.split(",")) {
    const part = raw.trim();
    if (!part) return null;

    let body = part, step = 1;
    if (part.includes("/")) {
      const [b, s] = part.split("/");
      body = b;
      step = parseInt(s, 10);
      if (!Number.isFinite(step) || step <= 0) return null;
    }

    if (body === "*") {
      for (let i = min; i <= max; i += step) out.add(i);
    } else if (body.includes("-")) {
      const [aS, bS] = body.split("-");
      const a = parseInt(aS, 10);
      const b = parseInt(bS, 10);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      for (let i = a; i <= b; i += step) out.add(i);
    } else {
      const n = parseInt(body, 10);
      if (!Number.isFinite(n)) return null;
      out.add(n);
    }
  }
  return { kind: "list", values: [...out].sort((a, b) => a - b) };
}

function describeCron(cron) {
  if (!cron || typeof cron !== "string") return "Custom — (empty)";
  const trimmed = cron.trim();

  if (PRESET_LABEL[trimmed]) return PRESET_LABEL[trimmed];

  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) return `Custom — Unrecognized cron format (expected 5 fields)`;

  const [mF, hF, domF, monF, dowF] = fields;
  const minute = parseField(mF,   0, 59);
  const hour   = parseField(hF,   0, 23);
  const dom    = parseField(domF, 1, 31);
  const mon    = parseField(monF, 1, 12);
  const dow    = parseField(dowF, 0, 6);

  if (!minute || !hour || !dom || !mon || !dow) {
    return `Custom — Unparsable cron pattern`;
  }

  // Time-of-day phrase
  let timePhrase;
  const minuteIsExact = minute.kind === "list" && minute.values.length === 1;
  const hourIsExact   = hour.kind   === "list" && hour.values.length   === 1;

  if (minuteIsExact && hourIsExact) {
    timePhrase = `at ${pad2(hour.values[0])}:${pad2(minute.values[0])}`;
  } else if (minute.kind === "every" && hour.kind === "any") {
    timePhrase = `every ${minute.step} minute${minute.step !== 1 ? "s" : ""}`;
  } else if (hour.kind === "every" && minuteIsExact) {
    timePhrase = `every ${hour.step} hour${hour.step !== 1 ? "s" : ""} at minute ${minute.values[0]}`;
  } else if (hour.kind === "every") {
    timePhrase = `every ${hour.step} hour${hour.step !== 1 ? "s" : ""}`;
  } else if (minute.kind === "any" && hour.kind === "any") {
    timePhrase = `every minute`;
  } else if (minuteIsExact && hour.kind === "any") {
    timePhrase = `at minute ${minute.values[0]} of every hour`;
  } else if (minute.kind === "any" && hourIsExact) {
    timePhrase = `every minute during hour ${hour.values[0]}`;
  } else {
    const m = minute.kind === "any"   ? "every minute"
            : minute.kind === "every" ? `every ${minute.step} min`
            : `minute${minute.values.length > 1 ? "s" : ""} ${minute.values.join(",")}`;
    const h = hour.kind === "any"     ? "every hour"
            : hour.kind === "every"   ? `every ${hour.step} hr`
            : `hour${hour.values.length > 1 ? "s" : ""} ${hour.values.join(",")}`;
    timePhrase = `${m}, ${h}`;
  }

  // Day / month qualifiers
  const qualifiers = [];

  if (dow.kind === "list" && dow.values.length > 0 && dow.values.length < 7) {
    qualifiers.push(`on ${dow.values.map((v) => DOW_NAMES[((v % 7) + 7) % 7]).join(", ")}`);
  } else if (dow.kind === "every") {
    qualifiers.push(`every ${dow.step} day${dow.step !== 1 ? "s" : ""} of the week`);
  }

  if (dom.kind === "list") {
    if (dom.values.length === 1) {
      qualifiers.push(`on day ${dom.values[0]} of the month`);
    } else if (dom.values.length > 1) {
      qualifiers.push(`on days ${dom.values.join(", ")} of the month`);
    }
  } else if (dom.kind === "every") {
    qualifiers.push(`every ${dom.step} day${dom.step !== 1 ? "s" : ""} of the month`);
  }

  if (mon.kind === "list" && mon.values.length > 0 && mon.values.length < 12) {
    qualifiers.push(`in ${mon.values.map((v) => MONTH_NAMES[v] ?? v).join(", ")}`);
  } else if (mon.kind === "every") {
    qualifiers.push(`every ${mon.step} month${mon.step !== 1 ? "s" : ""}`);
  }

  const sentence = [timePhrase, ...qualifiers].join(" ");
  return `Custom — ${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared building-required guard
// ──────────────────────────────────────────────────────────────────────────────

function BuildingRequired() {
  return (
    <div className="settings-empty" role="status">
      <SlInfo aria-hidden="true" style={{ fontSize: "1.1rem" }} />
      <p style={{ margin: 0 }}>
        Select a building from the sidebar building switcher to manage these settings.
      </p>
    </div>
  );
}

// Local style block — kept inline so we don't fragment App.css for a one-page redesign.
function SettingsStyles() {
  return (
    <style>{`
      .settings-shell { max-width: 980px; }
      .settings-header { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; }
      .settings-header h1 { margin: 0; color: var(--text-primary); }
      .settings-header p { margin: 0; color: var(--text-secondary); font-size: 0.92rem; }

      .settings-tabbar {
        display: flex; gap: 0.15rem;
        border-bottom: 1px solid var(--border);
        margin-bottom: 1.5rem;
        overflow-x: auto;
        /* Hide the horizontal scrollbar visually — content still scrolls on small viewports. */
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .settings-tabbar::-webkit-scrollbar { display: none; height: 0; width: 0; }
      .settings-tab {
        display: inline-flex; align-items: center; gap: 0.45rem;
        background: transparent; border: none;
        padding: 0.65rem 0.95rem;
        cursor: pointer; white-space: nowrap;
        color: var(--text-secondary);
        font-weight: 500; font-size: 0.9rem;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        transition: color 0.15s, border-color 0.15s, background 0.15s;
        border-radius: 6px 6px 0 0;
      }
      .settings-tab:hover { color: var(--text-primary); background: var(--accent-sub); }
      .settings-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      .settings-tab[aria-selected="true"] {
        color: var(--text-primary);
        font-weight: 700;
        border-bottom-color: var(--text-primary);
      }
      .settings-tab-icon { font-size: 1rem; }

      .settings-section { display: flex; flex-direction: column; gap: 1rem; }
      .settings-card {
        background: var(--bg-raised);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 1.1rem 1.2rem;
      }
      .settings-card-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
      .settings-card-title { margin: 0; color: var(--text-primary); font-size: 1rem; font-weight: 700; }
      .settings-card-desc  { margin: 0 0 0.85rem; color: var(--text-secondary); font-size: 0.875rem; line-height: 1.45; }

      .settings-overview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 0.85rem;
      }
      .settings-overview-card {
        background: var(--bg-raised);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 1rem;
        text-align: left;
        cursor: pointer;
        color: var(--text-primary);
        display: flex; flex-direction: column; gap: 0.4rem;
        transition: border-color 0.15s, transform 0.12s;
      }
      .settings-overview-card:hover { border-color: var(--border-strong); transform: translateY(-1px); }
      .settings-overview-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      .settings-overview-card .label {
        font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em;
        color: var(--text-muted); font-weight: 700;
      }
      .settings-overview-card .value {
        font-size: 1.6rem; line-height: 1.1; color: var(--text-primary); font-weight: 700;
      }
      .settings-overview-card .desc {
        font-size: 0.82rem; color: var(--text-secondary);
      }

      .settings-empty {
        display: flex; align-items: center; gap: 0.6rem;
        background: var(--info-sub);
        color: var(--text-primary);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0.85rem 1rem;
        font-size: 0.9rem;
      }

      .pill {
        display: inline-flex; align-items: center; gap: 0.3rem;
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
        font-size: 0.72rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.05em;
      }
      .pill--success { background: var(--success-sub); color: var(--success); }
      .pill--muted   { background: var(--accent-sub);  color: var(--text-muted); }
      .pill--warn    { background: var(--warning-sub); color: var(--warning); }
      .pill--info    { background: var(--info-sub);    color: var(--info); }
      .pill--danger  { background: var(--danger-sub);  color: var(--danger); }

      .switch { position: relative; width: 38px; height: 22px; display: inline-block; }
      .switch input { opacity: 0; width: 0; height: 0; }
      .switch .track {
        position: absolute; inset: 0;
        background: var(--border-strong);
        border-radius: 999px;
        transition: background 0.15s;
        cursor: pointer;
      }
      .switch .thumb {
        position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
        background: var(--bg-raised);
        border-radius: 50%;
        transition: transform 0.15s;
        box-shadow: 0 1px 2px rgba(0,0,0,0.4);
      }
      .switch input:checked + .track { background: var(--success); }
      .switch input:checked + .track .thumb { transform: translateX(16px); }
      .switch input:focus-visible + .track { outline: 2px solid var(--accent); outline-offset: 2px; }

      .icon-btn {
        background: transparent;
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text-secondary);
        padding: 0.35rem 0.5rem;
        cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
        transition: color 0.15s, border-color 0.15s, background 0.15s;
      }
      .icon-btn:hover { color: var(--text-primary); border-color: var(--border-strong); background: var(--accent-sub); }
      .icon-btn--danger:hover { color: var(--danger); border-color: var(--danger); background: var(--danger-sub); }
      .icon-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

      .job-row {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }
      .job-row .cron-line { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
      .job-row .cron-input {
        flex: 1 1 220px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .job-row .english {
        color: var(--text-secondary);
        font-size: 0.85rem;
      }
      .job-row .english strong { color: var(--text-primary); font-weight: 600; }

      .cron-help {
        background: var(--bg-subtle);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0.65rem 0.9rem;
        margin-bottom: 1rem;
      }
      .cron-help > summary {
        cursor: pointer;
        color: var(--text-primary);
        font-weight: 600;
        font-size: 0.88rem;
        list-style: none;
        display: flex; align-items: center; gap: 0.4rem;
      }
      .cron-help > summary::before {
        content: "▸";
        color: var(--text-muted);
        transition: transform 0.15s;
        display: inline-block;
      }
      .cron-help[open] > summary::before { transform: rotate(90deg); }
      .cron-help > summary::-webkit-details-marker { display: none; }
      .cron-help:focus-within { border-color: var(--border-strong); }
      .cron-help-body { margin-top: 0.7rem; color: var(--text-secondary); font-size: 0.88rem; line-height: 1.55; }
      .cron-help-body code { background: var(--accent-sub); padding: 0.05rem 0.35rem; border-radius: 4px; font-size: 0.85em; color: var(--text-primary); }
      .cron-diagram {
        background: var(--bg-base);
        color: var(--text-primary);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 0.7rem 0.85rem;
        margin: 0 0 0.7rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.78rem;
        line-height: 1.45;
        overflow-x: auto;
        white-space: pre;
      }

      .saved-flash {
        color: var(--success);
        font-size: 0.82rem;
        display: inline-flex; align-items: center; gap: 0.25rem;
      }

      .message-card {
        display: flex; flex-direction: column; gap: 0.5rem;
        padding: 0.85rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--bg-raised);
      }
      .message-meta { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
      .message-author { color: var(--text-primary); font-weight: 700; font-size: 0.92rem; }
      .message-time { color: var(--text-muted); font-size: 0.78rem; }
      .message-body { margin: 0; color: var(--text-primary); white-space: pre-wrap; font-size: 0.92rem; line-height: 1.45; }
      .message-actions { display: flex; gap: 0.5rem; }

      @media (max-width: 640px) {
        .settings-overview-card .value { font-size: 1.35rem; }
        .settings-card { padding: 0.95rem 1rem; }
      }
    `}</style>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page shell
// ──────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const navigate = useNavigate();
  const { activeBuilding } = useBuilding();
  const [tab, setTab] = useState("general");

  const activeTabDef = TABS.find((t) => t.key === tab);
  const needsBuilding = activeTabDef?.needsBuilding && !activeBuilding;

  return (
    <PageShell>
      <SettingsStyles />
      <div className="inventory-container settings-shell">
        <header className="settings-header">
          <h1>Settings</h1>
          <p>
            {activeBuilding
              ? <>Configuration for <strong style={{ color: "var(--text-primary)" }}>{activeBuilding.name}</strong></>
              : "System and per-building configuration."}
          </p>
        </header>

        <div className="settings-tabbar" role="tablist" aria-label="Settings sections">
          {TABS.map((t) => {
            const Icon = t.icon;
            const selected = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={selected}
                aria-controls={`settings-panel-${t.key}`}
                id={`settings-tab-${t.key}`}
                tabIndex={selected ? 0 : -1}
                className="settings-tab"
                onClick={() => setTab(t.key)}
              >
                <Icon className="settings-tab-icon" aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </div>

        <section
          role="tabpanel"
          id={`settings-panel-${tab}`}
          aria-labelledby={`settings-tab-${tab}`}
          className="settings-section"
        >
          {needsBuilding && <BuildingRequired />}

          {!needsBuilding && tab === "general"    && <OverviewTab activeBuilding={activeBuilding} setTab={setTab} navigate={navigate} />}
          {!needsBuilding && tab === "recipients" && <RecipientsTab buildingId={activeBuilding.buildingId} />}
          {!needsBuilding && tab === "schedule"   && <ScheduleTab buildingId={activeBuilding.buildingId} />}
          {!needsBuilding && tab === "jobs"       && <JobsTab />}
          {!needsBuilding && tab === "messages"   && <MessagesTab buildingId={activeBuilding.buildingId} />}
          {!needsBuilding && tab === "areas"      && <AreasTab activeBuilding={activeBuilding} navigate={navigate} />}
        </section>
      </div>
    </PageShell>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Overview / General
// ──────────────────────────────────────────────────────────────────────────────

function OverviewTab({ activeBuilding, setTab, navigate }) {
  const [recipients, setRecipients] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [openMessages, setOpenMessages] = useState(null);
  const [areas, setAreas] = useState(null);
  const [jobs, setJobs] = useState(null);

  useEffect(() => {
    if (!activeBuilding) return;
    api.get(`/ReportRecipients?buildingId=${activeBuilding.buildingId}`).then((r) => setRecipients(r.data));
    api.get(`/scheduledreportconfigs?buildingId=${activeBuilding.buildingId}`).then((r) => setSchedule(r.data));
    api.get(`/technicianmessages?buildingId=${activeBuilding.buildingId}&status=Open`).then((r) => setOpenMessages(r.data));
    api.get(`/BuildingAreas?buildingId=${activeBuilding.buildingId}`).then((r) => setAreas(r.data));
    api.get(`/recurringjobs`).then((r) => setJobs(r.data));
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
              ? `Last sent ${new Date(schedule.lastSentAt).toLocaleDateString()}`
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
          accent={openMessages?.length > 0 ? "warn" : null}
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
    </>
  );
}

function OverviewCard({ label, value, desc, onClick, accent = null }) {
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

// ──────────────────────────────────────────────────────────────────────────────
// Report Recipients
// ──────────────────────────────────────────────────────────────────────────────

function RecipientsTab({ buildingId }) {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);

  const refresh = () =>
    api.get(`/ReportRecipients?buildingId=${buildingId}`).then((r) => setRows(r.data));

  useEffect(() => { refresh(); }, [buildingId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return;
    try {
      await api.post(`/ReportRecipients`, { buildingId, name: name.trim(), email: email.trim(), isActive: true });
      setName(""); setEmail("");
      await refresh();
    } catch (err) {
      setError(err.response?.data || "Failed to add recipient.");
    }
  };

  const handleToggle = async (r) => {
    await api.put(`/ReportRecipients/${r.id}`, { ...r, isActive: !r.isActive });
    await refresh();
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Remove ${r.email} from report recipients?`)) return;
    await api.delete(`/ReportRecipients/${r.id}`);
    await refresh();
  };

  const activeCount = rows.filter((r) => r.isActive).length;

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div>
          <h2 className="settings-card-title">Report recipients</h2>
        </div>
        <span className="pill pill--muted">{activeCount} active · {rows.length} total</span>
      </div>
      <p className="settings-card-desc">
        Active recipients receive scheduled email reports and low-stock alerts for this building.
        Toggle the switch to pause without removing the address.
      </p>

      <form
        onSubmit={handleAdd}
        aria-label="Add recipient"
        style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}
      >
        <input
          className="inventory-modal-input"
          style={{ marginBottom: 0, flex: "1 1 180px" }}
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Recipient name"
        />
        <input
          className="inventory-modal-input"
          style={{ marginBottom: 0, flex: "2 1 240px" }}
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-label="Recipient email"
        />
        <button type="submit" className="inventory-button">Add recipient</button>
      </form>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>{String(error)}</p>}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th style={{ width: 80, textAlign: "center" }}>Active</th>
              <th style={{ width: 60 }}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                  No recipients yet. Add one above to start sending automated reports.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name || <span className="td-empty">—</span>}</td>
                <td className="td-mono">{r.email}</td>
                <td style={{ textAlign: "center" }}>
                  <label className="switch" aria-label={`Toggle ${r.email} active`}>
                    <input
                      type="checkbox"
                      checked={!!r.isActive}
                      onChange={() => handleToggle(r)}
                    />
                    <span className="track"><span className="thumb" /></span>
                  </label>
                </td>
                <td>
                  <button
                    className="icon-btn icon-btn--danger"
                    onClick={() => handleDelete(r)}
                    aria-label={`Remove ${r.email}`}
                    title="Remove recipient"
                  >
                    <SlTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Report Schedule
// ──────────────────────────────────────────────────────────────────────────────

const CADENCE_HELP = {
  Off:     { pill: "muted",   line: "No automated reports will be sent." },
  Weekly:  { pill: "success", line: "Sends every 7 days to active recipients." },
  Monthly: { pill: "success", line: "Sends every 30 days to active recipients." },
};

function ScheduleTab({ buildingId }) {
  const [cadence, setCadence] = useState("Off");
  const [serverCadence, setServerCadence] = useState("Off");
  const [lastSentAt, setLastSentAt] = useState(null);
  const [recipientCount, setRecipientCount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    api.get(`/scheduledreportconfigs?buildingId=${buildingId}`).then((r) => {
      setCadence(r.data?.cadence ?? "Off");
      setServerCadence(r.data?.cadence ?? "Off");
      setLastSentAt(r.data?.lastSentAt ?? null);
    });
    api.get(`/ReportRecipients?buildingId=${buildingId}`).then((r) => {
      setRecipientCount(r.data.filter((x) => x.isActive).length);
    });
  }, [buildingId]);

  // Auto-clear "Saved" indicator
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  const dirty = cadence !== serverCadence;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/scheduledreportconfigs?buildingId=${buildingId}`, { cadence });
      setServerCadence(res.data?.cadence ?? cadence);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  const help = CADENCE_HELP[cadence] ?? CADENCE_HELP.Off;

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <h2 className="settings-card-title">Automated report schedule</h2>
        <span className={`pill pill--${help.pill}`}>{cadence}</span>
      </div>
      <p className="settings-card-desc">
        Schedule recurring summary emails for this building. Each report contains the period's
        completed work orders, low-stock items, and current inventory snapshot.
      </p>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <label htmlFor="cadence-select" style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Cadence
        </label>
        <select
          id="cadence-select"
          className="table-filter-select"
          value={cadence}
          onChange={(e) => setCadence(e.target.value)}
        >
          <option value="Off">Off</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
        </select>
        <button className="inventory-button" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </button>
        {savedAt && <span className="saved-flash"><SlCheck /> Saved.</span>}
      </div>

      <p style={{ margin: "1rem 0 0", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
        {help.line}
      </p>

      <div style={{ marginTop: "1.1rem", display: "grid", gap: "0.4rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
        <Row label="Recipients" value={recipientCount == null ? "…" : `${recipientCount} active`} />
        <Row label="Last sent"  value={lastSentAt ? new Date(lastSentAt).toLocaleString() : "Never"} />
      </div>

      {recipientCount === 0 && cadence !== "Off" && (
        <p style={{ marginTop: "1rem", color: "var(--warning)", fontSize: "0.85rem" }}>
          ⚠ No active recipients — reports will be generated but not delivered. Add one on the
          Report Recipients tab.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", borderBottom: "1px dashed var(--border)", padding: "0.3rem 0" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Job Cadence
// ──────────────────────────────────────────────────────────────────────────────

const JOB_LABELS = {
  "low-stock-alerts": {
    title: "Low-stock alerts",
    desc: "Scans inventory and emails active recipients when items fall below their minimum levels. Auto-throttled to one email per building per 24 hours.",
  },
  "scheduled-reports": {
    title: "Scheduled reports",
    desc: "Sends recurring summary emails per building based on each building's Report Schedule cadence.",
  },
};

const CRON_PRESETS = [
  { label: "Every 15 minutes",     value: "*/15 * * * *" },
  { label: "Every 30 minutes",     value: "*/30 * * * *" },
  { label: "Hourly (top of hour)", value: "0 * * * *"    },
  { label: "Every 6 hours",        value: "0 */6 * * *"  },
  { label: "Daily at 08:00",       value: "0 8 * * *"    },
  { label: "Daily at midnight",    value: "0 0 * * *"    },
  { label: "Weekly (Mon 08:00)",   value: "0 8 * * 1"    },
];

function JobsTab() {
  const [rows, setRows] = useState([]);
  const [edits, setEdits] = useState({});
  const [savingName, setSavingName] = useState(null);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  const refresh = async () => {
    const r = await api.get(`/recurringjobs`);
    setRows(r.data);
    setEdits(Object.fromEntries(r.data.map((j) => [j.jobName, { cron: j.cron, enabled: j.enabled }])));
  };

  useEffect(() => { refresh(); }, []);

  // Auto-clear saved indicator
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  const handleSave = async (jobName) => {
    setError(null);
    setSavingName(jobName);
    try {
      await api.put(`/recurringjobs/${encodeURIComponent(jobName)}`, edits[jobName]);
      setSavedAt({ jobName, at: new Date() });
      await refresh();
    } catch (err) {
      setError(err.response?.data || "Failed to save.");
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

      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>{String(error)}</p>}

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
              <article
                key={j.jobName}
                className="message-card"
                aria-label={`Job ${meta.title}`}
              >
                <header className="message-meta">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
                    <strong style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>{meta.title}</strong>
                    <code style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{j.jobName}</code>
                    <span className={`pill pill--${edit.enabled ? "success" : "muted"}`}>
                      {edit.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <span className="message-time">
                    Updated {new Date(j.updatedAt).toLocaleString()}
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

// ──────────────────────────────────────────────────────────────────────────────
// Messages
// ──────────────────────────────────────────────────────────────────────────────

function MessagesTab({ buildingId }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("Open");
  const [counts, setCounts] = useState({ open: 0, resolved: 0 });

  const refresh = () => {
    const qs = filter === "all" ? "" : `&status=${filter}`;
    api.get(`/technicianmessages?buildingId=${buildingId}${qs}`).then((r) => setRows(r.data));
    // separate count call for sticky counts independent of filter
    api.get(`/technicianmessages?buildingId=${buildingId}`).then((r) => {
      setCounts({
        open:     r.data.filter((m) => m.status === "Open").length,
        resolved: r.data.filter((m) => m.status === "Resolved").length,
      });
    });
  };

  useEffect(() => { refresh(); }, [buildingId, filter]);

  const setStatus = async (m, status) => {
    await api.patch(`/technicianmessages/${m.id}/status`, { status });
    await refresh();
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
        Messages flagged from the technician app. Use "Mark resolved" once a correction has
        been handled in the admin portal.
      </p>

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
                    {m.workOrderId != null && (
                      <span className="pill pill--info">WO #{m.workOrderId}</span>
                    )}
                    <span className={`pill pill--${isOpen ? "warn" : "muted"}`}>
                      {m.status}
                    </span>
                  </div>
                  <time className="message-time" dateTime={m.createdAt}>
                    {new Date(m.createdAt).toLocaleString()}
                  </time>
                </header>

                <p className="message-body">{m.body}</p>

                <div className="message-actions">
                  {isOpen ? (
                    <button
                      className="inventory-button"
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
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Areas (shortcut + preview)
// ──────────────────────────────────────────────────────────────────────────────

function AreasTab({ activeBuilding, navigate }) {
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    if (!activeBuilding) return;
    api.get(`/BuildingAreas?buildingId=${activeBuilding.buildingId}`).then((r) => setAreas(r.data));
  }, [activeBuilding]);

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <h2 className="settings-card-title">Building areas</h2>
        <span className="pill pill--muted">{areas.length} configured</span>
      </div>
      <p className="settings-card-desc">
        Areas are the floors, wings, or zones inside this building. Air handlers and inventory
        items can be assigned to an area so reports and inventory views can be filtered by location.
      </p>

      {areas.length === 0 ? (
        <p style={{ color: "var(--text-muted)", margin: "0 0 0.85rem" }}>
          No areas configured yet — add some to enable per-floor filtering.
        </p>
      ) : (
        <ul style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", listStyle: "none", padding: 0, margin: "0 0 1rem" }}>
          {areas.map((a) => (
            <li key={a.id}>
              <span className="pill pill--info" style={{ fontSize: "0.8rem", textTransform: "none", letterSpacing: 0, fontWeight: 600 }}>
                {a.name}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button className="inventory-button" onClick={() => navigate("/areas")}>
        Manage Areas
      </button>
    </div>
  );
}
