import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../features/auth/authContext";

import {
  appRoles,
  canUseRecruitmentWrite,
  canViewAllAlerts,
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

export function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
}: SidebarProps) {
  const { user, logout } = useAuth();

  const showAnalytics = canViewAnalytics(user);
  const showImport = canUseRecruitmentWrite(user);
  const isManager = canViewAllAlerts(user) && !hasAnyRole(user, [appRoles.hiringManager]);
  const alertsPath = isManager ? "/alerts?scope=all" : "/alerts";

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
    path: alertsPath,
    icon: <BellIcon />,
  });

  const sidebarClasses = [
    "app-sidebar",
    collapsed ? "sidebar-collapsed" : "",
    mobileOpen ? "sidebar-mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>

      {mobileOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={onCloseMobile}
          aria-label="Close navigation"
        />
      )}

      <aside className={sidebarClasses} aria-label="Application sidebar">
        <div className="sidebar-header">

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

          <button
            type="button"
            className="sidebar-border-toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>

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

        <div className="sidebar-bottom">

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

function getPrimaryRole(user: ReturnType<typeof useAuth>["user"]) {
  if (!user) {
    return "User";
  }

  if (hasAnyRole(user, [appRoles.leadership])) {
    return "Leadership";
  }

  if (hasAnyRole(user, [appRoles.talentAcquisitionManager])) {
    return "Talent Manager";
  }

  if (hasAnyRole(user, [appRoles.hiringManager])) {
    return "Hiring Manager";
  }

  if (hasAnyRole(user, [appRoles.recruiter])) {
    return "Recruiter";
  }

  return "User";
}
