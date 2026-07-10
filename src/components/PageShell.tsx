import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { TbBuilding } from "react-icons/tb";
import Sidebar from "./sidebar";
import NotificationBell from "./NotificationBell";
import { useBuilding } from "../context/BuildingContext";

// Cross-building pages where the "Viewing: <building>" context bar would mislead.
const GLOBAL_PAGES = ["/buildings", "/users", "/portfolio"];

interface PageShellProps {
  children: ReactNode;
}

export default function PageShell({ children }: PageShellProps) {
  const { activeBuilding } = useBuilding();
  const location = useLocation();
  const isGlobalPage = GLOBAL_PAGES.some((p) => location.pathname.startsWith(p));

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="page-content">
        <div className="page-topbar">
          {!isGlobalPage && activeBuilding ? (
            <div className="building-context-bar">
              <TbBuilding size={14} />
              <span>Viewing: <strong>{activeBuilding.name}</strong></span>
            </div>
          ) : (
            <span />
          )}
          {activeBuilding && <NotificationBell buildingId={activeBuilding.buildingId} />}
        </div>
        {children}
      </main>
    </div>
  );
}
