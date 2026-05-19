import client from "./client";
import type { AirHandler } from "../types";

export const airhandlersApi = {
  getByBuilding: (buildingId: number) =>
    client.get<AirHandler[]>(`/Handler?buildingId=${buildingId}`),
  getById: (id: number) => client.get<AirHandler>(`/Handler/${id}`),
  create: (data: Omit<AirHandler, "airHandlerId">) =>
    client.post<AirHandler>("/Handler", data),
  update: (id: number, data: Partial<AirHandler>) =>
    client.put<AirHandler>(`/Handler/${id}`, data),
  delete: (id: number) => client.delete(`/Handler/${id}`),
};
