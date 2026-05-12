import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../data/api";
import { useAuth } from "./AuthContext";

const BuildingContext = createContext(null);

const STORAGE_KEY = "cs-active-building";

export function BuildingProvider({ children }) {
  const { user, token } = useAuth();
  const [buildings, setBuildings] = useState([]);
  const [activeBuilding, setActiveBuildingState] = useState(null);
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
        const res = await api.get("/Auth/me/buildings");
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

  const setActiveBuilding = useCallback((building) => {
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

export function useBuilding() {
  return useContext(BuildingContext);
}
