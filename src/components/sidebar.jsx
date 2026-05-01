import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  SlGrid,
  SlSettings,
  SlPeople,
  SlDrawer,
  SlChart,
  SlLogin,
} from "react-icons/sl";
import { TbAirConditioning } from "react-icons/tb";
import logo from "../assets/coolsync white no text.png";

const NAV_ITEMS = [
  { to: "/home", label: "Dashboard", icon: SlGrid },
  { to: "/airhandlers", label: "Air Handlers", icon: TbAirConditioning },
  { to: "/inventory", label: "Inventory", icon: SlDrawer },
  { to: "/users", label: "Users", icon: SlPeople },
  { to: "/reports", label: "Reports", icon: SlChart },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}>
      <div className="sidebar-header">
        <NavLink to="/home" className="sidebar-logo">
          <img src={logo} alt="CoolSync" />
          {!collapsed && <span className="sidebar-brand">CoolSync</span>}
        </NavLink>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {collapsed ? (
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      </div>

      {!collapsed && (
        <p className="sidebar-tenant">Caesar's Superdome</p>
      )}

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-nav-item${isActive ? " sidebar-nav-item--active" : ""}`
            }
          >
            <Icon className="sidebar-nav-icon" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to="/usermanagement"
          className={({ isActive }) =>
            `sidebar-nav-item${isActive ? " sidebar-nav-item--active" : ""}`
          }
        >
          <SlSettings className="sidebar-nav-icon" />
          {!collapsed && <span>My Account</span>}
        </NavLink>
        <button
          className="sidebar-nav-item sidebar-logout-btn"
          onClick={() => navigate("/")}
        >
          <SlLogin className="sidebar-nav-icon" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
