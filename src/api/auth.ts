import client from "./client";
import type { User, AspNetUser } from "../types";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<LoginResponse>("/Auth/login", data),
  register: (data: RegisterRequest) =>
    client.post<{ message: string }>("/Auth/register", data),
  me: () => client.get<User>("/Auth/me"),
  refreshToken: () => client.post<{ token: string }>("/Auth/refresh"),
};

export const usersApi = {
  getAll: () => client.get<AspNetUser[]>("/AspNetUsers"),
  getById: (id: string) => client.get<AspNetUser>(`/AspNetUsers/${id}`),
  update: (id: string, data: Partial<AspNetUser>) =>
    client.put<AspNetUser>(`/AspNetUsers/${id}`, data),
  delete: (id: string) => client.delete(`/AspNetUsers/${id}`),
  assignBuildings: (userId: string, buildingIds: number[]) =>
    client.post(`/AspNetUsers/${userId}/buildings`, { buildingIds }),
};
