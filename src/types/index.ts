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
  isDemo?: boolean;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface ReportRecipient {
  recipientId: number;
  buildingId: number;
  email: string;
  name?: string;
  isActive: boolean;
}

// Cross-building procurement outlook (ADR-011) — SuperAdmin "due soon + short on stock" rollup.
export type ProcurementUrgency = "OrderNow" | "Watch" | "Stocked";

export interface ProcurementLine {
  buildingId: number;
  buildingName: string;
  catalogItemId: number;
  filterName: string;
  onHand: number;
  minLevel: number;
  requiredWithinHorizon: number;
  shortfall: number;
  recommendedOrderQty: number;
  nextDueDate: string | null;
  daysUntilDue: number | null;
  urgency: ProcurementUrgency;
  scheduledUnits: string[];
}

export interface ProcurementBlindSpot {
  buildingId: number;
  buildingName: string;
  handlerGuid: string;
  handlerName: string;
  reason: string;
}

export interface ProcurementSummary {
  buildingsCovered: number;
  atRiskCount: number;
  totalShortfall: number;
  notScheduledCount: number;
  orderNowCount: number;
  watchCount: number;
  coveredCount: number;
  risk: string;
}

export interface ProcurementOutlook {
  horizonDays: number;
  summary: ProcurementSummary;
  atRiskLines: ProcurementLine[];
  coveredLines: ProcurementLine[];
  notScheduled: ProcurementBlindSpot[];
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
