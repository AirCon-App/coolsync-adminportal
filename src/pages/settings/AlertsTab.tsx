import { useEffect, useMemo, useState } from "react";
import { SlCheck } from "react-icons/sl";
import api from "../../data/api";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../utils/apiError";

interface Thresholds {
  criticalPercent: number;
  lowPercent: number;
}

interface Resolution {
  global: Thresholds;
  building: Thresholds | null;
  effective: Thresholds;
}

const PREVIEW_MIN = 20;

function PreviewRow({ label, range, color }: { label: string; range: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", borderBottom: "1px dashed var(--border)", padding: "0.3rem 0" }}>
      <span style={{ color }}>{label}</span>
      <span style={{ color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>{range}</span>
    </div>
  );
}

export function AlertsTab({ buildingId }: { buildingId: number }) {
  const { user } = useAuth();
  const canEditGlobal = !!user?.isSuperAdmin;

  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [scope, setScope] = useState<"building" | "global">("building");
  const [critical, setCritical] = useState(100);
  const [low, setLow] = useState(150);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.get<Resolution>(`/alertthresholdconfig?buildingId=${buildingId}`).then((r) => {
      setResolution(r.data);
      const start = r.data.building ?? r.data.global;
      setCritical(start.criticalPercent);
      setLow(start.lowPercent);
      setScope(r.data.building ? "building" : "building");
    });
  };

  useEffect(load, [buildingId]);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  // When switching scope, seed the form with that scope's current values.
  const onScopeChange = (next: "building" | "global") => {
    setScope(next);
    if (!resolution) return;
    const src = next === "global" ? resolution.global : (resolution.building ?? resolution.global);
    setCritical(src.criticalPercent);
    setLow(src.lowPercent);
  };

  const valid = critical >= 1 && critical <= 1000 && low >= 1 && low <= 1000 && critical <= low;

  const bands = useMemo(() => {
    const crit = Math.round((PREVIEW_MIN * critical) / 100);
    const lowT = Math.round((PREVIEW_MIN * low) / 100);
    return {
      critical: crit <= 1 ? "1" : `1–${crit - 1}`,
      low: crit >= lowT ? "—" : `${crit}–${lowT - 1}`,
      inStock: `${lowT}+`,
    };
  }, [critical, low]);

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const body = { criticalPercent: critical, lowPercent: low };
      if (scope === "global") await api.put(`/alertthresholdconfig/global`, body);
      else await api.put(`/alertthresholdconfig?buildingId=${buildingId}`, body);
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
      await api.delete(`/alertthresholdconfig?buildingId=${buildingId}`);
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
        <h2 className="settings-card-title">Stock alert thresholds</h2>
        <span className={`pill pill--${hasOverride ? "success" : "muted"}`}>
          {hasOverride ? "Building override" : "Using global default"}
        </span>
      </div>
      <p className="settings-card-desc">
        Thresholds are percentages of each item's minimum level and drive the inventory status
        badges and the alert bell. <strong>Critical</strong> below the critical %, <strong>Low</strong>
        below the low %, otherwise <strong>In stock</strong>. (Quantity 0 is always <strong>No stock</strong>.)
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
          <label htmlFor="critical-pct" style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Critical below (% of min)</label>
          <input id="critical-pct" type="number" min={1} max={1000} className="table-filter-select" style={{ width: 120 }}
            value={critical} onChange={(e) => setCritical(Number(e.target.value))} />
        </div>
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <label htmlFor="low-pct" style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Low below (% of min)</label>
          <input id="low-pct" type="number" min={1} max={1000} className="table-filter-select" style={{ width: 120 }}
            value={low} onChange={(e) => setLow(Number(e.target.value))} />
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
          Percentages must be 1–1000 and Critical % cannot exceed Low %.
        </p>
      )}
      {error && <div className="alert alert--danger alert--inline" style={{ marginTop: "0.6rem" }}>{String(error)}</div>}

      <div style={{ marginTop: "1.3rem" }}>
        <p style={{ margin: "0 0 0.4rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
          Preview — example item with a min level of {PREVIEW_MIN}:
        </p>
        <div style={{ display: "grid", gap: "0.1rem", fontSize: "0.85rem" }}>
          <PreviewRow label="No stock"  range="0"            color="var(--danger)" />
          <PreviewRow label="Critical"  range={bands.critical} color="var(--danger)" />
          <PreviewRow label="Low stock" range={bands.low}      color="var(--warning)" />
          <PreviewRow label="In stock"  range={bands.inStock}  color="var(--success)" />
        </div>
      </div>
    </div>
  );
}
