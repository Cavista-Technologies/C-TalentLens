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
            HEADER / BRAND
        =================================================== */}

        <div className="sidebar-header">
          <div className="sidebar-brand">
            {/* -------------------------------------------------
                CSS LOGO

                Expanded:
                C-TalentLens

                Collapsed:
                C only
            ------------------------------------------------- */}

            <div className="talentlens-logo" aria-label="C-TalentLens">
              {/* ===============================================
                  STYLIZED C MARK
              =============================================== */}

              <div className="talentlens-mark" aria-hidden="true">
                <span className="talentlens-coil talentlens-coil-one" />
                <span className="talentlens-coil talentlens-coil-two" />
                <span className="talentlens-coil talentlens-coil-three" />

                <span className="talentlens-mark-core" />
              </div>

              {/* ===============================================
                  WORDMARK
              =============================================== */}

              <div className="talentlens-wordmark">
                <span className="talentlens-hyphen">-</span>

                <span className="talentlens-name">TalentLens</span>
              </div>
            </div>
          </div>

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
          <div className="sidebar-navigation-label">MENU</div>

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
              COLLAPSE / EXPAND
          ================================================= */}

          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="sidebar-collapse-icon">
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </span>

            {!collapsed && (
              <span className="sidebar-collapse-label">Collapse</span>
            )}
          </button>

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
