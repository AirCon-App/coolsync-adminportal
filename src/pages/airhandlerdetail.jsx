import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SlArrowLeft } from "react-icons/sl";
import PageShell from "../components/PageShell";
import api from "../data/api";

// ── Agenda helpers ──────────────────────────────────────────────────────────

function woStatus(wo) {
  const now = new Date();
  if (wo.completedDate || wo.activityDate) return "completed";
  if (!wo.dueDate) return "upcoming";
  const due = new Date(wo.dueDate);
  if (due < now) return "overdue";
  const diff = (due - now) / (1000 * 60 * 60 * 24);
  if (diff <= 7) return "due-soon";
  return "upcoming";
}

const STATUS_COLOR = {
  overdue: "#ef4444",
  "due-soon": "#f97316",
  upcoming: "#3b82f6",
  completed: "#22c55e",
};

const STATUS_LABEL = {
  overdue: "Overdue",
  "due-soon": "Due Soon",
  upcoming: "Upcoming",
  completed: "Completed",
};

function AgendaView({ workOrders, users }) {
  const userMap = useMemo(() => {
    const m = {};
    (users || []).forEach((u) => { m[u.id] = u.fullName || u.email || "Unassigned"; });
    return m;
  }, [users]);

  const upcomingOrders = useMemo(() => {
    const now = new Date();
    return workOrders
      .filter((wo) => !wo.completedDate && !wo.activityDate)
      .sort((a, b) => {
        const aDate = a.dueDate ? new Date(a.dueDate) : new Date(9999, 0);
        const bDate = b.dueDate ? new Date(b.dueDate) : new Date(9999, 0);
        return aDate - bDate;
      });
  }, [workOrders]);

  const formatRelativeDate = (dateStr) => {
    if (!dateStr) return "No due date";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} overdue`;
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    return `Due ${date.toLocaleDateString()}`;
  };

  if (upcomingOrders.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
        <p style={{ fontSize: "0.95rem" }}>No upcoming filter changes scheduled.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {Object.entries(STATUS_COLOR).filter(([k]) => k !== "completed").map(([key, color]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
            {STATUS_LABEL[key]}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {upcomingOrders.map((wo) => {
          const status = woStatus(wo);
          const color = STATUS_COLOR[status];
          return (
            <div
              key={wo.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem",
                border: "1px solid var(--border)",
                borderRadius: 8,
                borderLeft: `4px solid ${color}`,
                background: "var(--bg-card)",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem" }}>
                    Work Order #{wo.id}
                  </span>
                  <span style={{
                    background: color,
                    color: "#fff",
                    borderRadius: 4,
                    padding: "2px 8px",
                    fontSize: "0.72rem",
                    fontWeight: 600
                  }}>
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  <span><strong style={{ color: "var(--text-primary)" }}>Due:</strong> {formatRelativeDate(wo.dueDate)}</span>
                  {wo.count != null && <span><strong style={{ color: "var(--text-primary)" }}>Filters:</strong> {wo.count}</span>}
                  {wo.technicianId && (
                    <span><strong style={{ color: "var(--text-primary)" }}>Assigned:</strong> {userMap[wo.technicianId] ?? "Unassigned"}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AirHandlerDetailPage() {
  const { guid } = useParams();
  const navigate = useNavigate();
  const [handler, setHandler] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("workorders");

  useEffect(() => {
    Promise.all([
      api.get(`/AirHandlers/${guid}`),
      api.get("/Auth/users"),
    ])
      .then(([ahRes, usersRes]) => {
        setHandler(ahRes.data);
        setUsers(usersRes.data ?? []);
      })
      .finally(() => setLoading(false));
  }, [guid]);

  if (loading) {
    return <PageShell><p style={{ color: "var(--text-secondary)" }}>Loading...</p></PageShell>;
  }

  if (!handler) {
    return <PageShell><p style={{ color: "var(--danger)" }}>Air handler not found.</p></PageShell>;
  }

  const tabs = [
    { id: "workorders", label: "Work Orders" },
    { id: "upcoming", label: "Upcoming" },
  ];

  return (
    <PageShell>
      <div className="inventory-container">
        <button
          onClick={() => navigate("/airhandlers")}
          style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem", padding: 0, marginBottom: "1rem", fontFamily: "inherit" }}
        >
          <SlArrowLeft /> Back to air handlers
        </button>

        <h1 style={{ color: "var(--text-primary)", marginBottom: "0.25rem" }}>{handler.name}</h1>
        {handler.description && (
          <p style={{ color: "var(--text-secondary)", marginTop: 0, marginBottom: "0.5rem", fontSize: "0.95rem" }}>
            {handler.description}
          </p>
        )}
        {handler.areaLabel && (
          <p style={{ color: "var(--text-muted)", marginTop: 0, marginBottom: "1.5rem", fontSize: "0.82rem" }}>
            Area: <strong style={{ color: "var(--text-secondary)" }}>{handler.areaLabel}</strong>
          </p>
        )}

        <div className="inventory-list" style={{ marginBottom: "2rem" }}>
          {handler.filtersName && (
            <div className="inventory-item">
              <div>
                <p className="inventory-subtitle">Filters</p>
                <h1 className="inventory-title">{handler.filtersName}</h1>
              </div>
            </div>
          )}
          {handler.quantity != null && (
            <div className="inventory-item">
              <div>
                <p className="inventory-subtitle">Quantity</p>
                <h1 className="inventory-title">{handler.quantity}</h1>
              </div>
            </div>
          )}
          {handler.scheduleChangeInterval && (
            <div className="inventory-item">
              <div>
                <p className="inventory-subtitle">Change interval</p>
                <h1 className="inventory-title">{handler.scheduleChangeInterval}</h1>
              </div>
            </div>
          )}
          {handler.sku && (
            <div className="inventory-item">
              <div>
                <p className="inventory-subtitle">SKU</p>
                <h1 className="inventory-title">{handler.sku}</h1>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid var(--primary, #3b82f6)" : "2px solid transparent",
                color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
                fontWeight: activeTab === tab.id ? 700 : 400,
                padding: "0.6rem 1.1rem",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontFamily: "inherit",
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Work Orders Tab */}
        {activeTab === "workorders" && (
          <>
            {handler.workOrders?.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>No work orders for this air handler.</p>
            ) : (
              <div className="inventory-list">
                {handler.workOrders?.map((wo) => {
                  const status = woStatus(wo);
                  return (
                    <div className="inventory-item" key={wo.id}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
                          <h1 className="inventory-title" style={{ margin: 0 }}>Work Order #{wo.id}</h1>
                          <span style={{ background: STATUS_COLOR[status], color: "#fff", borderRadius: 4, padding: "1px 8px", fontSize: "0.72rem", fontWeight: 600 }}>
                            {STATUS_LABEL[status]}
                          </span>
                        </div>
                        <p className="inventory-subtitle">Filters: {wo.count}</p>
                        {wo.dueDate && <p className="inventory-subtitle">Due: {new Date(wo.dueDate).toLocaleDateString()}</p>}
                        {(wo.completedDate || wo.activityDate) && (
                          <p className="inventory-subtitle">Completed: {new Date(wo.activityDate ?? wo.completedDate).toLocaleDateString()}</p>
                        )}
                        {wo.technicianId && (
                          <p className="inventory-subtitle">
                            Technician: {users.find((u) => u.id === wo.technicianId)?.fullName ?? wo.technicianId}
                          </p>
                        )}
                        {wo.notes && (
                          <p className="inventory-subtitle" style={{ marginTop: "0.4rem", whiteSpace: "pre-wrap" }}>
                            <strong style={{ color: "var(--text-primary)" }}>Notes:</strong> {wo.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Upcoming Tab */}
        {activeTab === "upcoming" && (
          <AgendaView workOrders={handler.workOrders ?? []} users={users} />
        )}
      </div>
    </PageShell>
  );
}
