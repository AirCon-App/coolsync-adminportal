import api from "../../data/api";
import { useApiData } from "../../hooks/useApiData";
import type { Building } from "../../types";

interface AreasTabProps {
  activeBuilding: Building | null;
  navigate: (path: string) => void;
}

export function AreasTab({ activeBuilding, navigate }: AreasTabProps) {
  const { data } = useApiData<{ items: { id: number; name: string }[] }>(
    () => api.get(`/BuildingAreas?buildingId=${activeBuilding!.buildingId}`).then((r) => r.data),
    "Areas failed to load.",
    { key: activeBuilding?.buildingId ?? null, enabled: !!activeBuilding },
  );
  const areas = data?.items ?? [];

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
