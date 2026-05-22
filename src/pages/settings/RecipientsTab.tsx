import { useState, useEffect } from "react";
import { SlTrash } from "react-icons/sl";
import api from "../../data/api";
import { getErrorMessage } from "../../utils/apiError";

export function RecipientsTab({ buildingId }: { buildingId: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    api.get(`/ReportRecipients?buildingId=${buildingId}`)
      .then((r) => setRows(r.data))
      .catch((err) => setError(getErrorMessage(err)));

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
      setError(getErrorMessage(err));
    }
  };

  const handleToggle = async (r) => {
    try {
      await api.put(`/ReportRecipients/${r.id}`, { ...r, isActive: !r.isActive });
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Remove ${r.email} from report recipients?`)) return;
    try {
      await api.delete(`/ReportRecipients/${r.id}`);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
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
      {error && <div className="alert alert--danger alert--inline" style={{ marginBottom: "0.5rem" }}>{String(error)}</div>}

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
