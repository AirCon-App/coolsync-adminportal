import React, { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { Link } from "react-router-dom";
import { TbAirConditioning, TbClipboardList, TbPackage, TbChecks } from "react-icons/tb";
import api from "../data/api";
import { useBuilding } from "../context/BuildingContext";

function StatCard({ icon: Icon, label, value, sub, to }) {
  const inner = (
    <div className="stat-card">
      <div className="stat-card-icon">
        <Icon size={20} />
      </div>
      <div className="stat-card-body">
        <p className="stat-card-label">{label}</p>
        <p className="stat-card-value">{value}</p>
        {sub && <p className="stat-card-sub">{sub}</p>}
      </div>
    </div>
  );

  return to ? <Link to={to} className="stat-card-link">{inner}</Link> : inner;
}

export default function HomePage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { activeBuilding } = useBuilding();

  useEffect(() => {
    if (!activeBuilding) return;
    const load = async () => {
      setLoading(true);
      try {
        const bid = activeBuilding.buildingId;
        const [ahRes, woRes, invRes] = await Promise.all([
          api.get(`/AirHandlers?buildingId=${bid}`),
          api.get(`/WorkOrders?buildingId=${bid}`),
          api.get(`/Inventory?buildingId=${bid}`),
        ]);

        const airHandlers = ahRes.data ?? [];
        const workOrders = woRes.data ?? [];
        const inventory = invRes.data ?? [];

        const openOrders = workOrders.filter((wo) => !wo.completedDate);
        const completed = workOrders.filter((wo) => wo.completedDate && wo.dueDate);
        const onTime = completed.filter(
          (wo) => new Date(wo.completedDate) <= new Date(wo.dueDate)
        );
        const compliancePct =
          completed.length > 0
            ? Math.round((onTime.length / completed.length) * 100)
            : null;

        const totalOnHand = inventory.reduce((s, i) => s + (i.quantity ?? 0), 0);

        setStats({
          airHandlers: airHandlers.length,
          openOrders: openOrders.length,
          totalOnHand,
          compliancePct,
        });
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeBuilding]);

  const fmt = (v) => (v === null || v === undefined ? "—" : String(v));

  return (
    <PageShell>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-sub">{activeBuilding?.name ?? "—"} — overview</p>
        </div>

        <div className="stat-grid">
          <StatCard
            icon={TbAirConditioning}
            label="Air Handlers"
            value={loading ? "…" : fmt(stats?.airHandlers)}
            sub="Total units registered"
            to="/airhandlers"
          />
          <StatCard
            icon={TbClipboardList}
            label="Open Work Orders"
            value={loading ? "…" : fmt(stats?.openOrders)}
            sub="Pending filter changes"
            to="/reports"
          />
          <StatCard
            icon={TbPackage}
            label="Filters On Hand"
            value={loading ? "…" : fmt(stats?.totalOnHand)}
            sub="Total across all SKUs"
            to="/inventory"
          />
          <StatCard
            icon={TbChecks}
            label="On-Time Rate"
            value={
              loading
                ? "…"
                : stats?.compliancePct !== null && stats?.compliancePct !== undefined
                ? `${stats.compliancePct}%`
                : "—"
            }
            sub="Completed work orders"
            to="/reports"
          />
        </div>

        <h2 className="dashboard-section-title">Quick actions</h2>
        <div className="quick-actions">
          <Link to="/airhandlers" className="quick-action-card">
            <TbAirConditioning size={22} className="quick-action-icon" />
            <span>Manage Air Handlers</span>
          </Link>
          <Link to="/inventory" className="quick-action-card">
            <TbPackage size={22} className="quick-action-icon" />
            <span>Update Inventory</span>
          </Link>
          <Link to="/users" className="quick-action-card">
            <span className="quick-action-icon" style={{ fontSize: "1.25rem" }}>👥</span>
            <span>Manage Users</span>
          </Link>
          <Link to="/reports" className="quick-action-card">
            <TbClipboardList size={22} className="quick-action-icon" />
            <span>View Reports</span>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
