export interface CatalogItem {
  catalogItemId: number;
  name: string;
  sku?: string;
}

export interface InventoryItem {
  itemNumber: number;
  quantity: number;
  minLevel?: number;
  reorderQty?: number;
  buildingId: number;
  areaId?: number | null;
  areaName?: string | null;
  catalogItem?: CatalogItem;
}

export interface Area {
  id: number;
  name: string;
}
