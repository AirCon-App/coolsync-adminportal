import { TbCircleCheck, TbAlertTriangle, TbArrowLeft } from "react-icons/tb";
import { HORIZON_DAYS, useProcurementOutlook } from "../hooks/useProcurementOutlook";
import ProcurementTriageCards from "./ProcurementTriageCards";
import ProcurementLinesTable from "./ProcurementLinesTable";
import ProcurementBlindSpots from "./ProcurementBlindSpots";

export default function ProcurementOutlook() {
  const {
    loading,
    error,
    summary,
    verdict,
    counts,
    orderTotals,
    tier,
    toggleTier,
    building,
    drillIntoBuilding,
    clearBuilding,
    search,
    changeSearch,
    allLines,
    scopedLines,
    filteredLines,
    pagedLines,
    pageOffset,
    page,
    pageSize,
    setPage,
    changePageSize,
    notScheduled,
    blindspotPage,
    blindspotPageSize,
    setBlindspotPage,
    changeBlindspotPageSize,
  } = useProcurementOutlook();

  return (
    <div className="procurement" data-testid="procurement-outlook">
      <div className="procurement-hd">
        <div>
          <h2 className="procurement-title">Procurement Outlook</h2>
          <p className="procurement-sub">
            Every filter across your buildings, checked against the work orders due in the next {HORIZON_DAYS} days.
            {summary ? ` Covering ${summary.buildingsCovered} building${summary.buildingsCovered === 1 ? "" : "s"}.` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert--danger" style={{ marginBottom: "1rem" }}>
          <span className="alert__icon">!</span>
          <span className="alert__body">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="procurement-skeleton" aria-label="Loading procurement outlook">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="procurement-skeleton-row" />
          ))}
        </div>
      ) : (
        <>
          {!building && verdict && (
            <div
              className={`procurement-verdict procurement-verdict--${verdict.tone}`}
              data-testid="procurement-verdict"
              role="status"
            >
              {verdict.tone === "ok" ? <TbCircleCheck size={17} /> : <TbAlertTriangle size={17} />}
              <span>{verdict.text}</span>
            </div>
          )}

          {building && (
            <div className="procurement-buildingbar" data-testid="procurement-building-bar">
              <div className="procurement-buildingbar-main">
                <span className="procurement-buildingbar-name">{building.name}</span>
                <span className="procurement-buildingbar-meta">
                  {scopedLines.length} filter{scopedLines.length === 1 ? "" : "s"} tracked
                  {orderTotals.qty > 0
                    ? ` · suggested order: ${orderTotals.qty} filters across ${orderTotals.skus} SKU${orderTotals.skus === 1 ? "" : "s"}`
                    : " · nothing needs ordering here"}
                </span>
              </div>
              <button
                type="button"
                className="procurement-buildingbar-back"
                data-testid="procurement-building-clear"
                onClick={clearBuilding}
              >
                <TbArrowLeft size={14} />
                All buildings
              </button>
            </div>
          )}

          {summary && (
            <ProcurementTriageCards counts={counts} tier={tier} onToggleTier={toggleTier} />
          )}

          <ProcurementLinesTable
            pagedLines={pagedLines}
            filteredCount={filteredLines.length}
            totalCount={allLines.length}
            pageOffset={pageOffset}
            tier={tier}
            onToggleTier={toggleTier}
            search={search}
            onSearchChange={changeSearch}
            isBuildingScoped={!!building}
            onDrillIntoBuilding={drillIntoBuilding}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={changePageSize}
          />

          <ProcurementBlindSpots
            notScheduled={notScheduled}
            page={blindspotPage}
            pageSize={blindspotPageSize}
            onPageChange={setBlindspotPage}
            onPageSizeChange={changeBlindspotPageSize}
          />
        </>
      )}
    </div>
  );
}
