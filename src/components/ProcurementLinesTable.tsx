import { TbCircleCheck } from "react-icons/tb";
import { Pagination } from "./Pagination";
import { PAGE_SIZE_OPTIONS } from "../hooks/useProcurementOutlook";
import type { TierKey } from "../hooks/useProcurementOutlook";
import type { ProcurementLine, ProcurementUrgency } from "../types";

const URGENCY_BADGE: Record<ProcurementUrgency, { label: string; tone: string }> = {
  OrderNow: { label: "Order now", tone: "danger" },
  Watch: { label: "Watch", tone: "warning" },
  Stocked: { label: "Stocked", tone: "success" },
};

const TIER_LABEL: Record<Exclude<TierKey, "all">, string> = {
  ordernow: "Order now",
  watch: "Watch",
  stocked: "Stocked",
};

function formatDue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface LinesTableProps {
  pagedLines: ProcurementLine[];
  filteredCount: number;
  totalCount: number;
  pageOffset: number;
  tier: TierKey;
  onToggleTier: (key: TierKey) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isBuildingScoped: boolean;
  onDrillIntoBuilding: (line: ProcurementLine) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function ProcurementLinesTable({
  pagedLines,
  filteredCount,
  totalCount,
  pageOffset,
  tier,
  onToggleTier,
  search,
  onSearchChange,
  isBuildingScoped,
  onDrillIntoBuilding,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: LinesTableProps) {
  return (
    <section className="procurement-section">
      <div className="procurement-section-hd">
        <span className="procurement-section-label">
          {tier === "all" ? "All filters" : TIER_LABEL[tier]}
          {tier !== "all" && (
            <button
              type="button"
              className="procurement-clearfilter"
              onClick={() => onToggleTier(tier)}
            >
              Show all
            </button>
          )}
        </span>
        <span className="procurement-section-meta">
          Most urgent first · {filteredCount} of {totalCount}
        </span>
      </div>

      <input
        className="table-search"
        type="text"
        placeholder={isBuildingScoped ? "Search by filter or unit…" : "Search by building, filter, or unit…"}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ marginBottom: "0.75rem" }}
      />

      {totalCount === 0 ? (
        <div className="procurement-allclear" data-testid="procurement-allclear">
          <TbCircleCheck size={16} />
          <span>No tracked inventory yet. Add stock items to see the outlook.</span>
        </div>
      ) : filteredCount === 0 ? (
        <p className="procurement-empty">No filters match. Clear the search or pick another status.</p>
      ) : (
        <div className="procurement-table" role="table">
          <div className="procurement-row procurement-row--head" role="row">
            <span role="columnheader">Building</span>
            <span role="columnheader">Filter</span>
            <span role="columnheader">Needed in</span>
            <span role="columnheader">Status</span>
            <span role="columnheader" className="procurement-num">On hand</span>
            <span role="columnheader" className="procurement-num">Needed</span>
            <span role="columnheader" className="procurement-num">Order</span>
          </div>
          {pagedLines.map((line, i) => {
            const badge = URGENCY_BADGE[line.urgency];
            const dueMain = line.daysUntilDue !== null
              ? line.daysUntilDue === 0 ? "Today" : `${line.daysUntilDue} days`
              : line.urgency === "OrderNow" ? "Now" : "—";
            const dueSub = line.daysUntilDue !== null
              ? formatDue(line.nextDueDate)
              : line.urgency === "OrderNow" ? "stock under minimum" : "no work scheduled";
            return (
              <div
                key={`${line.buildingId}-${line.catalogItemId}-${pageOffset + i}`}
                className="procurement-row"
                role="row"
                data-testid="procurement-line-row"
              >
                <span role="cell" className="procurement-building">
                  {isBuildingScoped ? (
                    line.buildingName || "—"
                  ) : (
                    <button
                      type="button"
                      className="procurement-building-link"
                      data-testid="procurement-building-link"
                      title={`See every filter in ${line.buildingName}`}
                      onClick={() => onDrillIntoBuilding(line)}
                    >
                      {line.buildingName || "—"}
                    </button>
                  )}
                </span>
                <span role="cell">
                  {line.filterName}
                  {line.scheduledUnits.length > 0 && (
                    <span className="procurement-units">{line.scheduledUnits.join(", ")}</span>
                  )}
                </span>
                <span role="cell" className={`procurement-due procurement-due--${badge.tone}`}>
                  {dueMain}
                  <span className="procurement-due-date">{dueSub}</span>
                </span>
                <span role="cell">
                  <span className={`procurement-badge procurement-badge--${badge.tone}`}>
                    <span className="procurement-badge-dot" aria-hidden="true" />
                    {badge.label}
                  </span>
                </span>
                <span role="cell" className="procurement-num">{line.onHand}</span>
                <span role="cell" className="procurement-num">{line.requiredWithinHorizon}</span>
                <span role="cell" className={`procurement-num${line.recommendedOrderQty > 0 ? " procurement-order" : ""}`}>
                  {line.recommendedOrderQty > 0 ? line.recommendedOrderQty : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <Pagination
        page={page}
        pageSize={pageSize}
        totalCount={filteredCount}
        onPageChange={onPageChange}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={onPageSizeChange}
      />
    </section>
  );
}
