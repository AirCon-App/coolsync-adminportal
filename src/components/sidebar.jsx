import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  SlGrid,
  SlSettings,
  SlPeople,
  SlDrawer,
  SlChart,
  SlLogin,
  SlMenu,
} from "react-icons/sl";
import { TbAirConditioning, TbSun, TbMoon, TbBuildingSkyscraper, TbLayoutList } from "react-icons/tb";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import CoolSyncLogo from "./CoolSyncLogo";
import BuildingSwitcher from "./BuildingSwitcher";

const NAV_GROUPS = [
  {
    label: "Building Data",
    items: [
      { to: "/home", label: "Dashboard", icon: SlGrid },
      { to: "/airhandlers", label: "Air Handlers", icon: TbAirConditioning },
      { to: "/inventory", label: "Inventory", icon: SlDrawer },
      { to: "/areas", label: "Areas", icon: TbLayoutList },
      { to: "/reports", label: "Reports", icon: SlChart },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/buildings", label: "Buildings", icon: TbBuildingSkyscraper, superAdminOnly: true },
      { to: "/users", label: "Users", icon: SlPeople },
      { to: "/settings", label: "Settings", icon: SlSettings },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSuperAdmin = user?.isSuperAdmin || user?.role === "SuperAdmin";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  return (
    <>
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        aria-controls="primary-sidebar"
        data-testid="mobile-menu-toggle"
      >
        <SlMenu />
      </button>

      {mobileOpen && (
        <div
          className="sidebar-backdrop sidebar-backdrop--open"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        id="primary-sidebar"
        className={`sidebar${collapsed ? " sidebar--collapsed" : ""}${mobileOpen ? " sidebar--mobile-open" : ""}`}
      >
      <div className="sidebar-header">
        <NavLink to="/home" className="sidebar-logo" onClick={closeMobile}>
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
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `sidebar-nav-item${isActive ? " sidebar-nav-item--active" : ""}`
                  }
                  data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
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
          data-testid="theme-toggle"
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
          onClick={closeMobile}
          className={({ isActive }) =>
            `sidebar-nav-item${isActive ? " sidebar-nav-item--active" : ""}`
          }
        >
          <SlSettings className="sidebar-nav-icon" />
          {!collapsed && <span>My Account</span>}
        </NavLink>
        <button
          className="sidebar-nav-item sidebar-logout-btn"
          onClick={() => { closeMobile(); handleLogout(); }}
          data-testid="logout-button"
        >
          <SlLogin className="sidebar-nav-icon" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
