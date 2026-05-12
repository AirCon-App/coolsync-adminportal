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
import { TbAirConditioning, TbSun, TbMoon, TbBuildingSkyscraper, TbLayoutList } from "react-icons/tb";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import CoolSyncLogo from "./CoolSyncLogo";
import BuildingSwitcher from "./BuildingSwitcher";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { to: "/home", label: "Dashboard", icon: SlGrid },
    ],
  },
  {
    label: "Property",
    items: [
      { to: "/buildings", label: "Buildings", icon: TbBuildingSkyscraper, superAdminOnly: true },
      { to: "/airhandlers", label: "Air Handlers", icon: TbAirConditioning },
      { to: "/areas", label: "Areas", icon: TbLayoutList },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/inventory", label: "Inventory", icon: SlDrawer },
      { to: "/reports", label: "Reports", icon: SlChart },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/users", label: "Users", icon: SlPeople },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const isSuperAdmin = user?.isSuperAdmin || user?.role === "SuperAdmin";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}>
      <div className="sidebar-header">
        <NavLink to="/home" className="sidebar-logo">
          <CoolSyncLogo size={26} />
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

      <BuildingSwitcher collapsed={collapsed} />

      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(
            (item) => !item.superAdminOnly || isSuperAdmin
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className={`sidebar-nav-group${gi > 0 ? " sidebar-nav-group--divided" : ""}`}>
              {!collapsed && (
                <span className="sidebar-nav-group-label">{group.label}</span>
              )}
              {visibleItems.map(({ to, label, icon: Icon }) => (
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
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-nav-item sidebar-theme-btn"
          onClick={toggle}
          aria-label="Toggle theme"
        >
          {theme === "dark"
            ? <TbSun className="sidebar-nav-icon" />
            : <TbMoon className="sidebar-nav-icon" />
          }
          {!collapsed && (
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          )}
        </button>
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
          onClick={handleLogout}
        >
          <SlLogin className="sidebar-nav-icon" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
