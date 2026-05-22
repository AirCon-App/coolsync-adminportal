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

export interface ReportRecipient {
  recipientId: number;
  buildingId: number;
  email: string;
  name?: string;
  isActive: boolean;
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
