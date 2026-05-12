import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TbBuilding, TbChevronDown, TbSettings } from "react-icons/tb";
import { useBuilding } from "../context/BuildingContext";
import { useAuth } from "../context/AuthContext";

export default function BuildingSwitcher({ collapsed }) {
  const { buildings, activeBuilding, setActiveBuilding } = useBuilding();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!activeBuilding) return null;

  const isSuperAdmin = user?.isSuperAdmin || user?.role === "SuperAdmin";

  return (
    <div className="building-switcher" ref={ref}>
      <button
        className={`building-switcher-btn${open ? " building-switcher-btn--open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        title={collapsed ? activeBuilding.name : undefined}
      >
        <TbBuilding className="building-switcher-icon" />
        {!collapsed && (
          <>
            <span className="building-switcher-name">{activeBuilding.name}</span>
            {buildings.length > 1 && <TbChevronDown className="building-switcher-chevron" />}
          </>
        )}
      </button>

      {open && !collapsed && (
        <div className="building-switcher-dropdown">
          {buildings.map((b) => (
            <button
              key={b.buildingId}
              className={`building-switcher-option${b.buildingId === activeBuilding.buildingId ? " building-switcher-option--active" : ""}`}
              onClick={() => {
                setActiveBuilding(b);
                setOpen(false);
              }}
            >
              {b.buildingId === activeBuilding.buildingId && (
                <span className="building-switcher-check">✓</span>
              )}
              <span>{b.name}</span>
            </button>
          ))}
          {isSuperAdmin && (
            <>
              <div className="building-switcher-divider" />
              <button
                className="building-switcher-option building-switcher-option--manage"
                onClick={() => { navigate("/buildings"); setOpen(false); }}
              >
                <TbSettings size={14} />
                <span>Manage buildings</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
