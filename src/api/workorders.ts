import client from "./client";
import type { WorkOrder } from "../types";

export const workordersApi = {
  getByBuilding: (buildingId: number) =>
    client.get<WorkOrder[]>(`/Work?buildingId=${buildingId}`),
  getById: (id: number) => client.get<WorkOrder>(`/Work/${id}`),
  create: (data: Omit<WorkOrder, "workOrderId" | "createdAt">) =>
    client.post<WorkOrder>("/Work", data),
  update: (id: number, data: Partial<WorkOrder>) =>
    client.put<WorkOrder>(`/Work/${id}`, data),
  complete: (id: number) =>
    client.patch<WorkOrder>(`/Work/${id}/complete`),
  delete: (id: number) => client.delete(`/Work/${id}`),
};
