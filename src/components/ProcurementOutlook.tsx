import { useEffect, useState } from "react";
import { TbCircleCheck, TbAlertTriangle, TbCalendarOff } from "react-icons/tb";
import { procurementApi } from "../data/reports-api";
import type { ProcurementOutlook as Outlook } from "../types";

const HORIZONS = [30, 60, 90] as const;

function riskColor(risk: string): string | undefined {
  if (risk === "High") return "var(--danger)";
  if (risk === "Low–Moderate") return "var(--warning)";
  return "var(--success)";
}

function formatDue(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProcurementOutlook() {
  const [horizon, setHorizon] = useState<number>(60);
  const [data, setData] = useState<Outlook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await procurementApi.getOutlook(horizon);
        if (mounted) setData(res.data);
      } catch {
        if (mounted) setError("Procurement outlook failed to load. Try again or check your connection.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [horizon]);

  const summary = data?.summary;

  return (
    <div className="procurement" data-testid="procurement-outlook">
      <div className="procurement-hd">
        <div>
          <h2 className="procurement-title">Procurement Outlook</h2>
          <p className="procurement-sub">
            Filters due within the window and short on inventory, across all your buildings.
          </p>
        </div>
        <div className="procurement-horizon" role="group" aria-label="Forecast window">
          {HORIZONS.map((h) => (
            <button
              key={h}
              type="button"
              data-testid={`procurement-horizon-${h}`}
              className={`procurement-horizon-btn${horizon === h ? " is-active" : ""}`}
              aria-pressed={horizon === h}
              onClick={() => setHorizon(h)}
            >
              {h} days
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert--danger" style={{ marginBottom: "1rem" }}>
          <span className="alert__icon">!</span>
          <span className="alert__body">{error}</span>
        </div>
      )}

      {summary && (
        <div className="procurement-summary">
          <div className="procurement-stat">
            <span className="procurement-stat-val">{summary.buildingsCovered}</span>
            <span className="procurement-stat-label">Buildings</span>
          </div>
          <div className="procurement-stat">
            <span className="procurement-stat-val">{summary.atRiskCount}</span>
            <span className="procurement-stat-label">At-risk filters</span>
          </div>
          <div className="procurement-stat">
            <span className="procurement-stat-val">{summary.totalShortfall}</span>
            <span className="procurement-stat-label">Total shortfall</span>
          </div>
          <div className="procurement-stat">
            <span className="procurement-stat-val" style={{ color: riskColor(summary.risk) }}>
              {summary.risk}
            </span>
            <span className="procurement-stat-label">Risk</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="procurement-skeleton" aria-label="Loading procurement outlook">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="procurement-skeleton-row" />
          ))}
        </div>
      ) : (
        <>
          <section className="procurement-section">
            <div className="procurement-section-hd">
              <span className="procurement-section-label">Shortfalls</span>
              {data && <span className="procurement-section-meta">Soonest due first</span>}
            </div>

            {!data || data.atRiskLines.length === 0 ? (
              <div className="procurement-allclear" data-testid="procurement-allclear">
                <TbCircleCheck size={16} />
                <span>No shortfalls in the next {horizon} days. Inventory covers every scheduled change.</span>
              </div>
            ) : (
              <div className="procurement-table" role="table">
                <div className="procurement-row procurement-row--head" role="row">
                  <span role="columnheader">Building</span>
                  <span role="columnheader">Filter</span>
                  <span role="columnheader">Next due</span>
                  <span role="columnheader" className="procurement-num">On hand</span>
                  <span role="columnheader" className="procurement-num">Required</span>
                  <span role="columnheader" className="procurement-num">Short</span>
                  <span role="columnheader" className="procurement-num">Order</span>
                </div>
                {data.atRiskLines.map((line, i) => (
                  <div
                    key={`${line.buildingId}-${line.catalogItemId}-${i}`}
                    className="procurement-row"
                    role="row"
                    data-testid="procurement-atrisk-row"
                  >
                    <span role="cell" className="procurement-building">{line.buildingName || "—"}</span>
                    <span role="cell">
                      {line.filterName}
                      {line.scheduledUnits.length > 0 && (
                        <span className="procurement-units">{line.scheduledUnits.join(", ")}</span>
                      )}
                    </span>
                    <span role="cell">{formatDue(line.nextDueDate)}</span>
                    <span role="cell" className="procurement-num">{line.onHand}</span>
                    <span role="cell" className="procurement-num">{line.requiredWithinHorizon}</span>
                    <span role="cell" className="procurement-num procurement-short">{line.shortfall}</span>
                    <span role="cell" className="procurement-num procurement-order">{line.recommendedOrderQty}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {data && data.notScheduled.length > 0 && (
            <section className="procurement-section">
              <div className="procurement-section-hd">
                <span className="procurement-section-label">
                  <TbAlertTriangle size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                  Not scheduled — invisible to the forecast
                </span>
                <span className="procurement-section-meta">{data.notScheduled.length}</span>
              </div>
              <div className="procurement-blindspots">
                {data.notScheduled.map((b, i) => (
                  <div
                    key={`${b.handlerGuid}-${i}`}
                    className="procurement-blindspot"
                    data-testid="procurement-notscheduled-row"
                  >
                    <TbCalendarOff size={14} className="procurement-blindspot-icon" />
                    <span className="procurement-blindspot-unit">{b.handlerName}</span>
                    <span className="procurement-blindspot-building">{b.buildingName}</span>
                    <span className="procurement-blindspot-reason">{b.reason}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
