import { SlInfo } from "react-icons/sl";

export function BuildingRequired() {
  return (
    <div className="settings-empty" role="status">
      <SlInfo aria-hidden="true" style={{ fontSize: "1.1rem" }} />
      <p style={{ margin: 0 }}>
        Select a building from the sidebar building switcher to manage these settings.
      </p>
    </div>
  );
}

export function SettingsStyles() {
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
