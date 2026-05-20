import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import api from "../data/api";
import { useAuth } from "./AuthContext";
import type { Building, BuildingContextValue } from "../types";

const BuildingContext = createContext<BuildingContextValue | null>(null);

const STORAGE_KEY = "cs-active-building";

interface BuildingProviderProps {
  children: ReactNode;
}

export function BuildingProvider({ children }: BuildingProviderProps) {
  const { user, token } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [activeBuilding, setActiveBuildingState] = useState<Building | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      setBuildings([]);
      setActiveBuildingState(null);
      return;
    }

    const fetchBuildings = async () => {
      setLoading(true);
      try {
        const res = await api.get<Building[]>("/Auth/me/buildings");
        const list = res.data ?? [];
        setBuildings(list);

        const stored = localStorage.getItem(STORAGE_KEY);
        const storedId = stored ? Number(stored) : null;
        const match = storedId ? list.find((b) => b.buildingId === storedId) : null;
        setActiveBuildingState(match ?? list[0] ?? null);
      } catch {
        setBuildings([]);
        setActiveBuildingState(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBuildings();
  }, [token, user]);

  const setActiveBuilding = useCallback((building: Building | null) => {
    setActiveBuildingState(building);
    if (building) {
      localStorage.setItem(STORAGE_KEY, String(building.buildingId));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <BuildingContext.Provider value={{ buildings, activeBuilding, setActiveBuilding, loading }}>
      {children}
    </BuildingContext.Provider>
  );
}

export function useBuilding(): BuildingContextValue {
  const ctx = useContext(BuildingContext);
  if (!ctx) throw new Error("useBuilding must be used within BuildingProvider");
  return ctx;
}
