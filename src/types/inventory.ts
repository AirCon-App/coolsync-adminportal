export interface CatalogItem {
  catalogItemId: number;
  name: string;
  sku?: string;
  /** Archived items are inactive. Returned only when fetching with includeArchived=true. */
  isActive?: boolean;
  /** True for auto-created items a SuperAdmin has not yet confirmed. */
  needsReview?: boolean;
}

export type StockStatus = "NoStock" | "Critical" | "Low" | "InStock";

export interface InventoryItem {
  itemNumber: number;
  quantity: number;
  minLevel?: number;
  reorderQty?: number;
  buildingId: number;
  areaId?: number | null;
  areaName?: string | null;
  catalogItem?: CatalogItem;
  /** Server-computed severity (single source of truth). */
  status?: StockStatus;
}

export interface Area {
  id: number;
  name: string;
}
