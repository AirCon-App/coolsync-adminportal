import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { TbBuilding } from "react-icons/tb";
import Sidebar from "./sidebar";
import { useBuilding } from "../context/BuildingContext";

const GLOBAL_PAGES = ["/buildings", "/users", "/usermanagement"];

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
        {!isGlobalPage && activeBuilding && (
          <div className="building-context-bar">
            <TbBuilding size={14} />
            <span>Viewing: <strong>{activeBuilding.name}</strong></span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
