export interface User {
  id: string;
  email: string;
  role: string;
  fullName: string;
  isSuperAdmin: boolean;
  buildingIds: number[];
}

export interface Building {
  buildingId: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface BuildingArea {
  areaId: number;
  buildingId: number;
  name: string;
  description?: string;
}

export interface AirHandler {
  airHandlerId: number;
  buildingId: number;
  areaId?: number;
  unitName: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  filterSize?: string;
  filterType?: string;
  merv?: number;
  location?: string;
  notes?: string;
  lastFilterChange?: string;
  buildingArea?: BuildingArea;
}

export interface InventoryItem {
  inventoryModelId: number;
  buildingId: number;
  filterSize: string;
  filterType?: string;
  merv?: number;
  quantity: number;
  minLevel: number;
  lastUpdated?: string;
}

export interface ConsumptionLog {
  consumptionLogId: number;
  inventoryModelId: number;
  airHandlerId: number;
  quantityUsed: number;
  usedAt: string;
  technicianId?: string;
  notes?: string;
}

export interface WorkOrder {
  workOrderId: number;
  buildingId: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ReportRecipient {
  recipientId: number;
  buildingId: number;
  email: string;
  name?: string;
  isActive: boolean;
}

export interface ScheduledReportConfig {
  configId: number;
  buildingId: number;
  reportType: string;
  cronSchedule: string;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
}

export interface AspNetUser {
  id: string;
  email: string;
  fullName?: string;
  role?: string;
  buildingIds?: number[];
}

export interface AuthContextValue {
  token: string | null;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
}

export interface BuildingContextValue {
  buildings: Building[];
  activeBuilding: Building | null;
  setActiveBuilding: (building: Building | null) => void;
  loading: boolean;
}

export interface ThemeContextValue {
  theme: "dark" | "light";
  toggle: () => void;
}
