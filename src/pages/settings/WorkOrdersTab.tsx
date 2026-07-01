import { useEffect, useState } from "react";
import { SlCheck } from "react-icons/sl";
import api from "../../data/api";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../utils/apiError";

interface Window {
  earlyCompletionWindowDays: number;
}

interface Resolution {
  global: Window;
  building: Window | null;
  effective: Window;
}

export function WorkOrdersTab({ buildingId }: { buildingId: number }) {
  const { user } = useAuth();
  const canEditGlobal = !!user?.isSuperAdmin;

  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [scope, setScope] = useState<"building" | "global">("building");
  const [days, setDays] = useState(30);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.get<Resolution>(`/workordercompletionconfig?buildingId=${buildingId}`).then((r) => {
      setResolution(r.data);
      const start = r.data.building ?? r.data.global;
      setDays(start.earlyCompletionWindowDays);
      setScope("building");
    });
  };

  useEffect(load, [buildingId]);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  // When switching scope, seed the form with that scope's current value.
  const onScopeChange = (next: "building" | "global") => {
    setScope(next);
    if (!resolution) return;
    const src = next === "global" ? resolution.global : (resolution.building ?? resolution.global);
    setDays(src.earlyCompletionWindowDays);
  };

  const valid = days >= 1 && days <= 365;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const body = { earlyCompletionWindowDays: days };
      if (scope === "global") await api.put(`/workordercompletionconfig/global`, body);
      else await api.put(`/workordercompletionconfig?buildingId=${buildingId}`, body);
      setSavedAt(new Date());
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleResetOverride = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.delete(`/workordercompletionconfig?buildingId=${buildingId}`);
      setSavedAt(new Date());
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const hasOverride = !!resolution?.building;

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <h2 className="settings-card-title">Early-completion window</h2>
        <span className={`pill pill--${hasOverride ? "success" : "muted"}`}>
          {hasOverride ? "Building override" : "Using global default"}
        </span>
      </div>
      <p className="settings-card-desc">
        How many days <strong>before a work order's due date</strong> a technician can mark its filter
        changed. It's a lower bound only — a work order at or past its due date is always completable.
        Applies to scheduled work orders; a first-ever change on a unit with no prior work order is never
        blocked.
      </p>

      {canEditGlobal && (
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
          <label htmlFor="scope-select" style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Apply to</label>
          <select id="scope-select" className="table-filter-select" value={scope} onChange={(e) => onScopeChange(e.target.value as "building" | "global")}>
            <option value="building">This building</option>
            <option value="global">All buildings (global default)</option>
          </select>
        </div>
      )}

      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <label htmlFor="window-days" style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Days before due date</label>
          <input id="window-days" type="number" min={1} max={365} className="table-filter-select" style={{ width: 120 }}
            value={days} onChange={(e) => setDays(Number(e.target.value))} />
        </div>
        <button className="inventory-button" onClick={handleSave} disabled={saving || !valid}>
          {saving ? "Saving…" : "Save"}
        </button>
        {scope === "building" && hasOverride && (
          <button className="inventory-button inventory-button--ghost" onClick={handleResetOverride} disabled={saving}>
            Use global default
          </button>
        )}
        {savedAt && <span className="saved-flash"><SlCheck /> Saved.</span>}
      </div>

      {!valid && (
        <p style={{ marginTop: "0.6rem", color: "var(--warning)", fontSize: "0.82rem" }}>
          Window must be between 1 and 365 days.
        </p>
      )}
      {error && <div className="alert alert--danger alert--inline" style={{ marginTop: "0.6rem" }}>{String(error)}</div>}

      <p style={{ marginTop: "1.3rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
        Example: with a {days}-day window, a work order due on the 30th unlocks for completion{" "}
        {days} day{days === 1 ? "" : "s"} earlier.
      </p>
    </div>
  );
}
