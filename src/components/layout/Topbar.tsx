import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../features/auth/authContext";
import { ChevronDownIcon, LogoutIcon } from "./LayoutIcons";

import "../../styles/Topbar.css";

type TopbarProps = {
  title: string;
  sidebarCollapsed: boolean;
  onOpenMobileMenu: () => void;
};

export function Topbar({
  sidebarCollapsed,
  onOpenMobileMenu,
}: TopbarProps) {
  const { user, logout } = useAuth();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header
      className={`app-topbar ${
        sidebarCollapsed ? "topbar-sidebar-collapsed" : ""
      }`}
    >
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-sidebar-button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="topbar-heading">
          <h1>
            {getGreeting()}, {getFirstName(user?.fullName)}
          </h1>

          <span>Recruitment Overview for {formatToday()}</span>
        </div>
      </div>

      <div className="topbar-profile" ref={profileRef}>
        <button
          type="button"
          className={`topbar-profile-button ${isProfileOpen ? "open" : ""}`}
          onClick={() => setIsProfileOpen((previous) => !previous)}
          aria-expanded={isProfileOpen}
          aria-haspopup="menu"
        >
          <span className="topbar-avatar">
            {user?.fullName?.charAt(0).toUpperCase() ?? "U"}
          </span>

          <span className="topbar-user-info">
            <strong>{user?.fullName ?? "User"}</strong>
            <span>{getRoleLabel(user)}</span>
          </span>

          <ChevronDownIcon />
        </button>

        {isProfileOpen && (
          <div className="profile-dropdown" role="menu">
            <div className="profile-dropdown-user">
              <span className="topbar-avatar">
                {user?.fullName?.charAt(0).toUpperCase() ?? "U"}
              </span>

              <div>
                <strong>{user?.fullName ?? "User"}</strong>
                <span>{getRoleLabel(user)}</span>
              </div>
            </div>

            <div className="profile-dropdown-divider" />

            <button
              type="button"
              className="profile-logout-button"
              onClick={() => {
                setIsProfileOpen(false);
                logout();
              }}
              role="menuitem"
            >
              <LogoutIcon size={18} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good Morning";
  }

  if (hour < 17) {
    return "Good Afternoon";
  }

  return "Good Evening";
}

function getFirstName(fullName?: string) {
  return fullName?.trim().split(/\s+/)[0] || "there";
}

function formatToday() {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function getRoleLabel(user: ReturnType<typeof useAuth>["user"]) {
  if (!user) {
    return "User";
  }

  const roles = Array.isArray(user.roles) ? user.roles : [];

  if (roles.some((role) => String(role).toLowerCase().includes("leadership"))) {
    return "Leadership";
  }

  if (roles.some((role) => String(role).toLowerCase().includes("talent"))) {
    return "Talent Acquisition";
  }

  if (roles.some((role) => String(role).toLowerCase().includes("hiring"))) {
    return "Hiring Manager";
  }

  return "User";
}
