import client from "./client";
import type { InventoryItem, ConsumptionLog } from "../types";

export const inventoryApi = {
  getByBuilding: (buildingId: number) =>
    client.get<InventoryItem[]>(`/Inventory?buildingId=${buildingId}`),
  getById: (id: number) => client.get<InventoryItem>(`/Inventory/${id}`),
  create: (data: Omit<InventoryItem, "inventoryModelId">) =>
    client.post<InventoryItem>("/Inventory", data),
  update: (id: number, data: Partial<InventoryItem>) =>
    client.put<InventoryItem>(`/Inventory/${id}`, data),
  delete: (id: number) => client.delete(`/Inventory/${id}`),
  logConsumption: (data: Omit<ConsumptionLog, "consumptionLogId">) =>
    client.post<ConsumptionLog>("/Inventory/consume", data),
};

export const consumptionApi = {
  getByInventory: (inventoryModelId: number) =>
    client.get<ConsumptionLog[]>(`/Inventory/${inventoryModelId}/consumption`),
  getByBuilding: (buildingId: number) =>
    client.get<ConsumptionLog[]>(`/Inventory/consumption?buildingId=${buildingId}`),
};
