import { useEffect, useState, useMemo } from "react";
import PageShell from "../components/PageShell";
import { Link } from "react-router-dom";
import { TbAlertTriangle, TbCircleCheck, TbArrowRight } from "react-icons/tb";
import api from "../data/api";
import { useBuilding } from "../context/BuildingContext";
import { useAuth } from "../context/AuthContext";
import ProcurementOutlook from "../components/ProcurementOutlook";

interface WorkOrder {
  handler: string;
  dueDate?: string;
  completedDate?: string;
  activityDate?: string;
  count?: number;
}

interface AirHandler {
  airHandlerGuid: string;
  name: string;
  filtersName?: string;
}

interface InventoryItem {
  quantity: number;
  minLevel?: number;
}

type StatusSeverity = "danger" | "warning" | "info";

interface StatusItem {
  severity: StatusSeverity;
  message: string;
  to: string;
}

type LedgerStatus = "overdue" | "due-soon" | "upcoming" | "on-time" | "late";

interface LedgerRow {
  handlerName: string;
  date: string;
  status: LedgerStatus;
}

function complianceColor(pct: number | null): string | undefined {
  if (pct === null) return undefined;
  if (pct < 70) return "var(--danger)";
  if (pct < 85) return "var(--warning)";
  return "var(--success)";
}

export default function HomePage() {
  const { activeBuilding } = useBuilding();
  const { user } = useAuth();
  const isSuperAdmin = !!(user?.isSuperAdmin || user?.role === "SuperAdmin");
  const [view, setView] = useState<"building" | "portfolio">("building");
  const [airHandlers, setAirHandlers] = useState<AirHandler[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBuilding) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const bid = activeBuilding.buildingId;
        const [ahRes, woRes, invRes] = await Promise.all([
          api.get(`/AirHandlers?buildingId=${bid}`),
          api.get(`/WorkOrders?buildingId=${bid}`),
          api.get(`/Inventory?buildingId=${bid}`),
        ]);
        if (mounted) {
          setAirHandlers(ahRes.data.items ?? []);
          setWorkOrders(woRes.data ?? []);
          setInventory(invRes.data.items ?? []);
        }
      } catch {
        if (mounted) setFetchError("Dashboard data failed to load. Check your connection and try refreshing.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [activeBuilding]);

  const handlerMap = useMemo(() => {
    const m: Record<string, AirHandler> = {};
    airHandlers.forEach((ah) => { m[ah.airHandlerGuid] = ah; });
    return m;
  }, [airHandlers]);

  const metrics = useMemo(() => {
    const now = new Date();
    // Open-ness by completedDate alone (matches backend + mobile); activityDate is an admin-edit
    // stamp, not a completion signal. The service/change date still prefers activityDate (the
    // admin-corrected date) per BuiltInReportService.
    const open = workOrders.filter((wo) => !wo.completedDate);
    const overdueCount = open.filter((wo) => wo.dueDate && new Date(wo.dueDate) < now).length;
    const lowStockCount = inventory.filter(
      (i) => (i.minLevel ?? 0) > 0 && i.quantity < i.minLevel!
    ).length;
    const completed = workOrders.filter(
      (wo) => wo.completedDate && wo.dueDate
    );
    const onTime = completed.filter((wo) => {
      const serviceDate = new Date((wo.activityDate ?? wo.completedDate)!);
      return serviceDate <= new Date(wo.dueDate!);
    });
    const compliancePct = completed.length > 0
      ? Math.round((onTime.length / completed.length) * 100)
      : null;
    const totalOnHand = inventory.reduce((s, i) => s + (i.quantity ?? 0), 0);
    return {
      openCount: open.length,
      overdueCount,
      lowStockCount,
      compliancePct,
      completedCount: completed.length,
      onTimeCount: onTime.length,
      totalOnHand,
    };
  }, [workOrders, inventory]);

  const statusItems = useMemo((): StatusItem[] => {
    const items: StatusItem[] = [];
    if (metrics.overdueCount > 0) {
      items.push({
        severity: "danger",
        message: `${metrics.overdueCount} work order${metrics.overdueCount === 1 ? " is" : "s are"} overdue.`,
        to: "/reports",
      });
    }
    if (metrics.lowStockCount > 0) {
      items.push({
        severity: "warning",
        message: `${metrics.lowStockCount} SKU${metrics.lowStockCount === 1 ? " is" : "s are"} below minimum stock.`,
        to: "/inventory?stockStatus=low",
      });
    }
    if (!loading && airHandlers.length === 0) {
      items.push({
        severity: "info",
        message: "No air handlers registered. Add your first unit to start tracking.",
        to: "/airhandlers",
      });
    }
    return items;
  }, [metrics, airHandlers.length, loading]);

  const upcomingLedger = useMemo((): LedgerRow[] => {
    const now = new Date();
    const thirtyAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return workOrders
      .filter((wo) => !wo.completedDate && wo.dueDate && new Date(wo.dueDate) <= thirtyAhead)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 8)
      .map((wo) => {
        const due = new Date(wo.dueDate!);
        const status: LedgerStatus =
          due < now ? "overdue" : due <= sevenAhead ? "due-soon" : "upcoming";
        return {
          handlerName: handlerMap[wo.handler]?.name ?? "Unknown unit",
          date: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          status,
        };
      });
  }, [workOrders, handlerMap]);

  const recentLedger = useMemo((): LedgerRow[] => {
    const now = new Date();
    const fourteenBack = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    return workOrders
      .filter((wo) => {
        if (!wo.completedDate) return false; // only genuinely-completed orders count as recent service
        const sd = wo.activityDate ?? wo.completedDate;
        const d = new Date(sd);
        return d >= fourteenBack && d <= now;
      })
      .sort((a, b) => {
        const da = new Date((a.activityDate ?? a.completedDate)!).getTime();
        const db = new Date((b.activityDate ?? b.completedDate)!).getTime();
        return db - da;
      })
      .slice(0, 8)
      .map((wo) => {
        const sd = (wo.activityDate ?? wo.completedDate)!;
        const completedAt = new Date(sd);
        const isLate = wo.dueDate ? completedAt > new Date(wo.dueDate) : false;
        return {
          handlerName: handlerMap[wo.handler]?.name ?? "Unknown unit",
          date: completedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          status: isLate ? "late" : "on-time",
        };
      });
  }, [workOrders, handlerMap]);

  const highestSeverity = statusItems.length === 0 ? null
    : statusItems.some((i) => i.severity === "danger") ? "danger"
    : statusItems.some((i) => i.severity === "warning") ? "warning"
    : "info";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const portfolioToggle = isSuperAdmin ? (
    <div className="dash-viewtoggle" role="tablist" aria-label="Dashboard scope">
      <button
        type="button"
        role="tab"
        data-testid="dash-view-building"
        aria-selected={view === "building"}
        className={`dash-viewtoggle-btn${view === "building" ? " is-active" : ""}`}
        onClick={() => setView("building")}
      >
        This building
      </button>
      <button
        type="button"
        role="tab"
        data-testid="dash-view-portfolio"
        aria-selected={view === "portfolio"}
        className={`dash-viewtoggle-btn${view === "portfolio" ? " is-active" : ""}`}
        onClick={() => setView("portfolio")}
      >
        All buildings
      </button>
    </div>
  ) : null;

  // SuperAdmin portfolio (cross-building) view — independent of the active building.
  if (isSuperAdmin && view === "portfolio") {
    return (
      <PageShell>
        <div className="dash">
          <div className="dash-header">
            <div>
              <h1 className="dash-building">Portfolio Outlook</h1>
              <p className="dash-date">{today}</p>
            </div>
            {portfolioToggle}
          </div>
          <ProcurementOutlook />
        </div>
      </PageShell>
    );
  }

  if (!activeBuilding) {
    return (
      <PageShell>
        {portfolioToggle && (
          <div className="dash-header dash-header--toggle-only">{portfolioToggle}</div>
        )}
        <div className="dash-empty-state">
          <p className="dash-empty-label">Select a building from the sidebar to view your dashboard.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="dash">

        <div className="dash-header">
          <div>
            <h1 className="dash-building">{activeBuilding.name}</h1>
            <p className="dash-date">{today}</p>
          </div>
          {portfolioToggle}
        </div>

        {fetchError && (
          <div className="alert alert--danger" style={{ marginBottom: "1rem" }}>
            <span className="alert__icon">!</span>
            <span className="alert__body">{fetchError}</span>
          </div>
        )}

        {!loading && (
          <div className={`status-band${highestSeverity ? ` status-band--${highestSeverity}` : " status-band--ok"}`}>
            {statusItems.length === 0 ? (
              <div className="status-band-row">
                <TbCircleCheck size={14} />
                <span>All systems on track</span>
              </div>
            ) : (
              statusItems.map((item, i) => (
                <Link key={i} to={item.to} className="status-band-row status-band-row--link">
                  <TbAlertTriangle size={14} />
                  <span>{item.message}</span>
                  <TbArrowRight size={12} className="status-band-arrow" />
                </Link>
              ))
            )}
          </div>
        )}

        {loading ? (
          <div className="dash-skeleton" aria-label="Loading dashboard data">
            <div className="dash-skeleton-band" />
            <div className="dash-skeleton-main">
              <div className="dash-skeleton-ledger">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="dash-skeleton-row" />
                ))}
              </div>
              <div className="dash-skeleton-metrics">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="dash-skeleton-metric" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="dash-main">

            <div className="ledger">
              <section className="ledger-section">
                <div className="ledger-section-hd">
                  <span className="ledger-section-label">Upcoming</span>
                  <span className="ledger-section-meta">Next 30 days</span>
                </div>
                {upcomingLedger.length === 0 ? (
                  <p className="ledger-empty">No filter changes due in the next 30 days.</p>
                ) : (
                  <div className="ledger-rows">
                    {upcomingLedger.map((row, i) => (
                      <div key={i} className="ledger-row">
                        <span className="ledger-unit">{row.handlerName}</span>
                        <span className="ledger-date">{row.date}</span>
                        <span className={`ledger-badge ledger-badge--${row.status}`}>
                          {row.status === "overdue" ? "Overdue" : row.status === "due-soon" ? "Due soon" : "Scheduled"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {metrics.openCount > 8 && (
                  <Link to="/reports" className="ledger-more">
                    +{metrics.openCount - 8} more <TbArrowRight size={11} />
                  </Link>
                )}
              </section>

              <div className="ledger-rule" />

              <section className="ledger-section">
                <div className="ledger-section-hd">
                  <span className="ledger-section-label">Recent</span>
                  <span className="ledger-section-meta">Last 14 days</span>
                </div>
                {recentLedger.length === 0 ? (
                  <p className="ledger-empty">No filter changes completed in the last 14 days.</p>
                ) : (
                  <div className="ledger-rows">
                    {recentLedger.map((row, i) => (
                      <div key={i} className="ledger-row">
                        <span className="ledger-unit">{row.handlerName}</span>
                        <span className="ledger-date">{row.date}</span>
                        <span className={`ledger-badge ledger-badge--${row.status}`}>
                          {row.status === "late" ? "Late" : "On time"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <Link to="/reports" className="ledger-more">
                  Full activity report <TbArrowRight size={11} />
                </Link>
              </section>
            </div>

            <aside className="metrics-col" aria-label="Standing metrics">
              <p className="metrics-col-label">At a glance</p>

              <div className="metric-row">
                <span className="metric-name">On-Time Rate</span>
                <span
                  className="metric-val"
                  style={complianceColor(metrics.compliancePct) ? { color: complianceColor(metrics.compliancePct) } : undefined}
                >
                  {metrics.compliancePct !== null ? `${metrics.compliancePct}%` : "—"}
                </span>
                <span className="metric-note">
                  {metrics.completedCount > 0
                    ? `${metrics.onTimeCount} of ${metrics.completedCount} on time`
                    : "No completed orders yet"}
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-name">Open Work Orders</span>
                <span
                  className="metric-val"
                  style={
                    metrics.openCount > 15 ? { color: "var(--danger)" }
                    : metrics.openCount > 8 ? { color: "var(--warning)" }
                    : undefined
                  }
                >
                  {metrics.openCount}
                </span>
                {metrics.overdueCount > 0 && (
                  <span className="metric-note metric-note--danger">{metrics.overdueCount} overdue</span>
                )}
              </div>

              <div className="metric-row">
                <span className="metric-name">Filters On Hand</span>
                <span className="metric-val">{metrics.totalOnHand}</span>
                {metrics.lowStockCount > 0 && (
                  <span className="metric-note metric-note--warning">
                    {metrics.lowStockCount} SKU{metrics.lowStockCount !== 1 ? "s" : ""} below min
                  </span>
                )}
              </div>

              <div className="metric-row">
                <span className="metric-name">Air Handlers</span>
                <span className="metric-val">{airHandlers.length}</span>
                <span className="metric-note">Registered units</span>
              </div>

              <Link to="/reports" className="metrics-report-link">
                View full report <TbArrowRight size={11} />
              </Link>
            </aside>

          </div>
        )}

      </div>
    </PageShell>
  );
}
