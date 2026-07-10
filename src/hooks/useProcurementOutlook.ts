import { useEffect, useMemo, useState } from "react";
import { procurementApi } from "../data/reports-api";
import { useApiData } from "./useApiData";
import type {
  ProcurementLine,
  ProcurementOutlook as Outlook,
  ProcurementUrgency,
} from "../types";

// Fixed forecast window. The backend classifies each tracked filter line against work
// orders due within HORIZON_DAYS; URGENT_DAYS mirrors its UrgentWithinDays boundary.
export const HORIZON_DAYS = 90;
export const URGENT_DAYS = 60;
export const PAGE_SIZE_OPTIONS = [15, 30, 50];
const DEFAULT_PAGE_SIZE = 15;

export type TierKey = "all" | "ordernow" | "watch" | "stocked";

const URGENCY_RANK: Record<ProcurementUrgency, number> = { OrderNow: 0, Watch: 1, Stocked: 2 };

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.ceil((t - Date.now()) / 86_400_000));
}

/** Sort key: urgency tier first, then how soon the filter is needed. Unscheduled
 *  below-min lines are needed immediately; unscheduled stocked lines go last. */
function dueSortValue(line: ProcurementLine): number {
  if (line.daysUntilDue !== null) return line.daysUntilDue;
  return line.urgency === "OrderNow" ? -1 : Number.MAX_SAFE_INTEGER;
}

export interface OutlookVerdict {
  tone: "danger" | "warning" | "ok";
  text: string;
}

/** All state and derived data for the Portfolio Outlook; components stay presentational. */
export function useProcurementOutlook() {
  const { data, loading, error } = useApiData<Outlook>(
    () => procurementApi.getOutlook(HORIZON_DAYS).then((res) => res.data),
    "Procurement outlook failed to load. Try again or check your connection.",
  );
  const [tier, setTier] = useState<TierKey>("all");
  const [building, setBuilding] = useState<{ id: number; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [blindspotPage, setBlindspotPage] = useState(1);
  const [blindspotPageSize, setBlindspotPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Fresh data restarts both lists from the first page.
  useEffect(() => {
    if (data) {
      setPage(1);
      setBlindspotPage(1);
    }
  }, [data]);

  const summary = data?.summary;

  const allLines = useMemo((): ProcurementLine[] => {
    if (!data) return [];
    // Normalize lines from an API that predates the tier fields: derive the day count
    // from nextDueDate and approximate the tier, so nothing renders as "undefined".
    const normalize = (l: ProcurementLine, atRisk: boolean): ProcurementLine => {
      const days = l.daysUntilDue ?? daysUntil(l.nextDueDate);
      const urgency: ProcurementUrgency = l.urgency
        ?? (!atRisk ? "Stocked" : days === null || days <= URGENT_DAYS ? "OrderNow" : "Watch");
      return { ...l, daysUntilDue: days, urgency };
    };
    return [
      ...data.atRiskLines.map((l) => normalize(l, true)),
      ...(data.coveredLines ?? []).map((l) => normalize(l, false)),
    ].sort((a, b) => {
      const rank = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
      if (rank !== 0) return rank;
      return dueSortValue(a) - dueSortValue(b);
    });
  }, [data]);

  // Drill-down scope: everything below the header (cards, table) reflects one building
  // when set, so an order can be rounded out from that building's complete inventory.
  const scopedLines = useMemo((): ProcurementLine[] => (
    building ? allLines.filter((l) => l.buildingId === building.id) : allLines
  ), [allLines, building]);

  const filteredLines = useMemo((): ProcurementLine[] => {
    const byTier = tier === "all"
      ? scopedLines
      : scopedLines.filter((l) => l.urgency.toLowerCase() === tier);
    const q = search.trim().toLowerCase();
    if (!q) return byTier;
    return byTier.filter((l) =>
      l.buildingName.toLowerCase().includes(q) ||
      l.filterName.toLowerCase().includes(q) ||
      l.scheduledUnits.some((u) => u.toLowerCase().includes(q))
    );
  }, [scopedLines, tier, search]);

  const pageOffset = (page - 1) * pageSize;
  const pagedLines = filteredLines.slice(pageOffset, pageOffset + pageSize);

  // Derived from the normalized lines (not the summary DTO) so counts stay correct
  // even against an API that predates the tier fields.
  const counts = useMemo(() => ({
    orderNow: scopedLines.filter((l) => l.urgency === "OrderNow").length,
    watch: scopedLines.filter((l) => l.urgency === "Watch").length,
    stocked: scopedLines.filter((l) => l.urgency === "Stocked").length,
  }), [scopedLines]);

  // "Make one order" support: what this building should order across every SKU.
  const orderTotals = useMemo(() => {
    const toOrder = scopedLines.filter((l) => l.recommendedOrderQty > 0);
    return {
      qty: toOrder.reduce((sum, l) => sum + l.recommendedOrderQty, 0),
      skus: toOrder.length,
    };
  }, [scopedLines]);

  // One plain sentence a non-specialist can act on, before any table reading.
  const verdict = useMemo((): OutlookVerdict | null => {
    if (!summary) return null;
    if (counts.orderNow > 0) {
      const qty = allLines
        .filter((l) => l.urgency === "OrderNow")
        .reduce((sum, l) => sum + l.recommendedOrderQty, 0);
      const n = counts.orderNow;
      return {
        tone: "danger",
        text: `${n} filter${n === 1 ? " needs" : "s need"} ordering now. Ordering ${qty} filters covers the work due in the next ${URGENT_DAYS} days and refills stock that is under minimum.`,
      };
    }
    if (counts.watch > 0) {
      const n = counts.watch;
      return {
        tone: "warning",
        text: `Nothing needs ordering today, but ${n} filter${n === 1 ? "" : "s"} will run short in ${URGENT_DAYS + 1} to ${HORIZON_DAYS} days. Plan the next order.`,
      };
    }
    return {
      tone: "ok",
      text: `Stock covers every scheduled filter change for the next ${HORIZON_DAYS} days.`,
    };
  }, [summary, counts, allLines]);

  const drillIntoBuilding = (l: ProcurementLine) => {
    setBuilding({ id: l.buildingId, name: l.buildingName });
    setTier("all");
    setSearch("");
    setPage(1);
  };

  const clearBuilding = () => {
    setBuilding(null);
    setTier("all");
    setPage(1);
  };

  // Clicking a card filters the table; clicking the active card again shows everything.
  const toggleTier = (key: TierKey) => { setTier((prev) => (prev === key ? "all" : key)); setPage(1); };

  const changeSearch = (value: string) => { setSearch(value); setPage(1); };

  const changePageSize = (size: number) => { setPageSize(size); setPage(1); };

  const changeBlindspotPageSize = (size: number) => { setBlindspotPageSize(size); setBlindspotPage(1); };

  return {
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
    notScheduled: data?.notScheduled ?? [],
    blindspotPage,
    blindspotPageSize,
    setBlindspotPage,
    changeBlindspotPageSize,
  };
}
