import { TbAlertTriangle, TbCalendarOff } from "react-icons/tb";
import { Pagination } from "./Pagination";
import { PAGE_SIZE_OPTIONS } from "../hooks/useProcurementOutlook";
import type { ProcurementBlindSpot } from "../types";

interface BlindSpotsProps {
  notScheduled: ProcurementBlindSpot[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function ProcurementBlindSpots({
  notScheduled,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: BlindSpotsProps) {
  if (notScheduled.length === 0) return null;

  const offset = (page - 1) * pageSize;
  const paged = notScheduled.slice(offset, offset + pageSize);

  return (
    <section className="procurement-section">
      <div className="procurement-section-hd">
        <span className="procurement-section-label">
          <TbAlertTriangle size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
          Not in this forecast
        </span>
        <span className="procurement-section-meta">{notScheduled.length}</span>
      </div>
      <p className="procurement-blindspot-note">
        These units have no upcoming work order, so their filters are not counted above.
        Set a change interval or schedule them to close the gap.
      </p>
      <div className="procurement-blindspots">
        {paged.map((b, i) => (
          <div
            key={`${b.handlerGuid}-${offset + i}`}
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
      <Pagination
        page={page}
        pageSize={pageSize}
        totalCount={notScheduled.length}
        onPageChange={onPageChange}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={onPageSizeChange}
      />
    </section>
  );
}
