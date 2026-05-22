import { useState, useEffect } from "react";
import { SlCheck } from "react-icons/sl";
import api from "../../data/api";
import { getErrorMessage } from "../../utils/apiError";

const CADENCE_HELP: Record<string, { pill: string; line: string }> = {
  Off:     { pill: "muted",   line: "No automated reports will be sent." },
  Weekly:  { pill: "success", line: "Sends every 7 days to active recipients." },
  Monthly: { pill: "success", line: "Sends every 30 days to active recipients." },
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", borderBottom: "1px dashed var(--border)", padding: "0.3rem 0" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

export function ScheduleTab({ buildingId }: { buildingId: number }) {
  const [cadence, setCadence] = useState("Off");
  const [serverCadence, setServerCadence] = useState("Off");
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api.get(`/scheduledreportconfigs?buildingId=${buildingId}`).then((r) => {
      if (!mounted) return;
      setCadence(r.data?.cadence ?? "Off");
      setServerCadence(r.data?.cadence ?? "Off");
      setLastSentAt(r.data?.lastSentAt ?? null);
    });
    api.get(`/ReportRecipients?buildingId=${buildingId}`).then((r) => {
      if (mounted) setRecipientCount(r.data.filter((x) => x.isActive).length);
    });
    return () => { mounted = false; };
  }, [buildingId]);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  const dirty = cadence !== serverCadence;

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api.put(`/scheduledreportconfigs?buildingId=${buildingId}`, { cadence });
      setServerCadence(res.data?.cadence ?? cadence);
      setSavedAt(new Date());
    } catch (err) {
      setSaveError(getErrorMessage(err));
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

      {saveError && (
        <div className="alert alert--danger alert--inline" style={{ marginTop: "0.5rem" }}>{String(saveError)}</div>
      )}

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
