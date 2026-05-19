import client from "./client";
import type { Building, BuildingArea } from "../types";

export const buildingsApi = {
  getAll: () => client.get<Building[]>("/Buildings"),
  getById: (id: number) => client.get<Building>(`/Buildings/${id}`),
  create: (data: Omit<Building, "buildingId">) =>
    client.post<Building>("/Buildings", data),
  update: (id: number, data: Partial<Building>) =>
    client.put<Building>(`/Buildings/${id}`, data),
  delete: (id: number) => client.delete(`/Buildings/${id}`),
};

export const buildingAreasApi = {
  getByBuilding: (buildingId: number) =>
    client.get<BuildingArea[]>(`/BuildingAreas?buildingId=${buildingId}`),
  getById: (id: number) => client.get<BuildingArea>(`/BuildingAreas/${id}`),
  create: (data: Omit<BuildingArea, "areaId">) =>
    client.post<BuildingArea>("/BuildingAreas", data),
  update: (id: number, data: Partial<BuildingArea>) =>
    client.put<BuildingArea>(`/BuildingAreas/${id}`, data),
  delete: (id: number) => client.delete(`/BuildingAreas/${id}`),
};
