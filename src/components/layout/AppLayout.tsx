import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { AppFooter } from "./AppFooter";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

import "../../styles/AppLayout.css";

type AppLayoutProps = {
  title: string;
  children: ReactNode;
};

const DESKTOP_COLLAPSE_KEY = "c-talentlens-sidebar-collapsed";

export function AppLayout({ title, children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem(DESKTOP_COLLAPSE_KEY) === "true";
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(DESKTOP_COLLAPSE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768) {
        setMobileSidebarOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSidebarOpen]);

  const toggleSidebar = () => {
    setSidebarCollapsed((previous) => !previous);
  };

  const openMobileSidebar = () => {
    setMobileSidebarOpen(true);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <main
      className={[
        "app-layout",
        sidebarCollapsed ? "layout-sidebar-collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
        onToggleCollapse={toggleSidebar}
      />

      <div className="app-content">
        <Topbar
          title={title}
          sidebarCollapsed={sidebarCollapsed}
          onOpenMobileMenu={openMobileSidebar}
        />

        <main className="app-page-content">{children}</main>

        <AppFooter />
      </div>
    </main>
  );
}
