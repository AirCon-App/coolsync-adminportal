import client from "./api";

export type NotificationType = "LowStock" | "OutOfStock" | "PastDueWorkOrder";
export type NotificationSeverity = "Critical" | "Warning";

export interface Notification {
  id: number;
  buildingId: number;
  type: NotificationType;
  entityId: number;
  severity: NotificationSeverity;
  message: string;
  firstDetectedUtc: string;
  isRead: boolean;
}

export interface NotificationList {
  unreadCount: number;
  items: Notification[];
}

export const notificationsApi = {
  list: (buildingId: number) =>
    client.get<NotificationList>(`/notifications?buildingId=${buildingId}`),

  markRead: (id: number) => client.post(`/notifications/${id}/read`),

  dismiss: (id: number) => client.post(`/notifications/${id}/dismiss`),

  markAllRead: (buildingId: number) =>
    client.post(`/notifications/read-all?buildingId=${buildingId}`),
};
