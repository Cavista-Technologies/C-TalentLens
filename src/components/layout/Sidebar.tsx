import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../features/auth/authContext";

import {
  appRoles,
  canUseRecruitmentWrite,
  canViewAnalytics,
  hasAnyRole,
} from "../../features/auth/roleAccess";

import "../../styles/Sidebar.css";

import {
  BellIcon,
  BriefcaseIcon,
  ChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  DashboardIcon,
  LogoutIcon,
  UploadIcon,
  UsersIcon,
} from "./LayoutIcons";

/* =========================================================
   TYPES
========================================================= */

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
};

type NavigationItem = {
  label: string;
  path: string;
  icon: ReactNode;
};

/* =========================================================
   SIDEBAR
========================================================= */

export function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
}: SidebarProps) {
  const { user, logout } = useAuth();

  const showAnalytics = canViewAnalytics(user);
  const showImport = canUseRecruitmentWrite(user);

  /* ---------------------------------------------------------
     Navigation items
  --------------------------------------------------------- */

  const navigationItems: NavigationItem[] = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: <DashboardIcon />,
    },
    {
      label: "Requisitions",
      path: "/requisitions",
      icon: <BriefcaseIcon />,
    },
    {
      label: "Referrals",
      path: "/referrals",
      icon: <UsersIcon />,
    },
  ];

  if (showAnalytics) {
    navigationItems.push({
      label: "Analytics",
      path: "/analytics",
      icon: <ChartIcon />,
    });
  }

  if (showImport) {
    navigationItems.push({
      label: "Import",
      path: "/imports",
      icon: <UploadIcon />,
    });
  }

  navigationItems.push({
    label: "Alerts",
    path: "/alerts",
    icon: <BellIcon />,
  });

  /* ---------------------------------------------------------
     Sidebar classes
  --------------------------------------------------------- */

  const sidebarClasses = [
    "app-sidebar",
    collapsed ? "sidebar-collapsed" : "",
    mobileOpen ? "sidebar-mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {mobileOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={onCloseMobile}
          aria-label="Close navigation"
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className={sidebarClasses} aria-label="Application sidebar">
        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="sidebar-header">
          {/* =================================================
              BRAND
          ================================================= */}

          <div className="sidebar-brand">
            <div className="talentlens-brand">
              {collapsed ? (
                <img src="/cavista colored bacground2.svg" className="cavista-logo" alt="cavistalogo" />
              ) : (
              <div className="talentlens-logo-wrapper">
                <img
                  src="../talentlens.svg"
                  alt="TalentLens"
                  className="talentlens-logo-image"
                />
              </div>
              )}
            </div>
          </div>

          {/* =================================================
              DESKTOP COLLAPSE / EXPAND BUTTON

              This button sits directly on the sidebar's
              right border so it does not interfere with
              the logo or brand.
          ================================================= */}

          <button
            type="button"
            className="sidebar-border-toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>

          {/* =================================================
              MOBILE CLOSE BUTTON
          ================================================= */}

          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            title="Close navigation"
          >
            <CloseIcon />
          </button>
        </div>

        {/* ===================================================
            NAVIGATION
        =================================================== */}

        <nav className="sidebar-navigation" aria-label="Main navigation">

          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                ["sidebar-nav-link", isActive ? "active" : ""]
                  .filter(Boolean)
                  .join(" ")
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>

              {!collapsed && (
                <span className="sidebar-nav-label">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ===================================================
            BOTTOM
        =================================================== */}

        <div className="sidebar-bottom">
          {/* =================================================
              USER SUMMARY
          ================================================= */}

          {user && !collapsed && (
            <div className="sidebar-user-summary">
              <div className="sidebar-user-avatar" aria-hidden="true">
                {user.fullName?.charAt(0).toUpperCase()}
              </div>

              <div className="sidebar-user-details">
                <strong>{user.fullName}</strong>

                <span>{getPrimaryRole(user)}</span>
              </div>
            </div>
          )}

          {/* =================================================
              LOGOUT
          ================================================= */}

          <button
            type="button"
            className="sidebar-logout"
            onClick={logout}
            title={collapsed ? "Logout" : undefined}
          >
            <LogoutIcon />

            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

/* =========================================================
   PRIMARY ROLE
========================================================= */

function getPrimaryRole(user: ReturnType<typeof useAuth>["user"]) {
  if (!user) {
    return "User";
  }

  if (hasAnyRole(user, [appRoles.leadership])) {
    return "Leadership";
  }

  if (hasAnyRole(user, [appRoles.talentAcquisitionManager])) {
    return "Talent Acquisition";
  }

  if (hasAnyRole(user, [appRoles.hiringManager])) {
    return "Hiring Manager";
  }

  return "User";
}
