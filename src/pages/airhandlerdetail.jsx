import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SlArrowLeft } from "react-icons/sl";
import PageShell from "../components/PageShell";
import api from "../data/api";

// ── Calendar helpers ────────────────────────────────────────────────────────

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

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

function CalendarView({ workOrders, users }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tooltip, setTooltip] = useState(null);

  const userMap = useMemo(() => {
    const m = {};
    (users || []).forEach((u) => { m[u.id] = u.fullName || u.email || "Unassigned"; });
    return m;
  }, [users]);

  const eventsByDay = useMemo(() => {
    const map = {};
    workOrders.forEach((wo) => {
      const dateStr = wo.activityDate ?? wo.completedDate ?? wo.dueDate;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const day = d.getDate();
      if (!map[day]) map[day] = [];
      map[day].push(wo);
    });
    return map;
  }, [workOrders, year, month]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div style={{ position: "relative" }}>
      {/* Legend */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {Object.entries(STATUS_COLOR).map(([key, color]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
            {STATUS_LABEL[key]}
          </div>
        ))}
      </div>

      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <button onClick={prevMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "0.25rem 0.6rem", cursor: "pointer", color: "var(--text-primary)" }}>‹</button>
        <span style={{ fontWeight: 600, color: "var(--text-primary)", minWidth: 150, textAlign: "center" }}>{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "0.25rem 0.6rem", cursor: "pointer", color: "var(--text-primary)" }}>›</button>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {DAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", padding: "0.3rem 0", textTransform: "uppercase" }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const events = eventsByDay[day] || [];
          const isT = isToday(day);
          return (
            <div
              key={day}
              style={{
                minHeight: 62,
                border: `1px solid ${isT ? "var(--primary, #3b82f6)" : "var(--border)"}`,
                borderRadius: 6,
                padding: "0.3rem",
                background: isT ? "var(--bg-subtle)" : "transparent",
                position: "relative",
              }}
            >
              <div style={{ fontSize: "0.75rem", fontWeight: isT ? 700 : 400, color: isT ? "var(--primary, #3b82f6)" : "var(--text-muted)", marginBottom: 2 }}>{day}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {events.slice(0, 3).map((wo) => {
                  const status = woStatus(wo);
                  const color = STATUS_COLOR[status];
                  return (
                    <div
                      key={wo.id}
                      title={`Work Order #${wo.id} — ${STATUS_LABEL[status]}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTooltip(tooltip?.id === wo.id ? null : { ...wo, status, _x: e.clientX, _y: e.clientY });
                      }}
                      style={{
                        background: color,
                        color: "#fff",
                        borderRadius: 3,
                        padding: "1px 4px",
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      #{wo.id} {STATUS_LABEL[status]}
                    </div>
                  );
                })}
                {events.length > 3 && (
                  <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>+{events.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          onClick={() => setTooltip(null)}
          style={{ position: "fixed", inset: 0, zIndex: 50 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: Math.min(tooltip._y + 10, window.innerHeight - 220),
              left: Math.min(tooltip._x + 10, window.innerWidth - 270),
              width: 250,
              background: "var(--bg-card, #fff)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "0.85rem 1rem",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              zIndex: 51,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.9rem" }}>Work Order #{tooltip.id}</span>
              <span style={{ background: STATUS_COLOR[tooltip.status], color: "#fff", borderRadius: 4, padding: "1px 7px", fontSize: "0.72rem", fontWeight: 600 }}>{STATUS_LABEL[tooltip.status]}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              {tooltip.dueDate && <div><strong style={{ color: "var(--text-primary)" }}>Due:</strong> {new Date(tooltip.dueDate).toLocaleDateString()}</div>}
              {(tooltip.completedDate || tooltip.activityDate) && (
                <div><strong style={{ color: "var(--text-primary)" }}>Completed:</strong> {new Date(tooltip.activityDate ?? tooltip.completedDate).toLocaleDateString()}</div>
              )}
              {tooltip.count != null && <div><strong style={{ color: "var(--text-primary)" }}>Filters:</strong> {tooltip.count}</div>}
              {tooltip.technicianId && <div><strong style={{ color: "var(--text-primary)" }}>Technician:</strong> {userMap[tooltip.technicianId] ?? tooltip.technicianId}</div>}
            </div>
            <button onClick={() => setTooltip(null)} style={{ marginTop: "0.6rem", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.78rem", padding: 0 }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
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
    { id: "calendar", label: "Calendar" },
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
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <CalendarView workOrders={handler.workOrders ?? []} users={users} />
        )}
      </div>
    </PageShell>
  );
}
