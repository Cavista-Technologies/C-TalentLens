import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getMyAlerts, markAlertRead } from "../../features/alerts/alertApi";
import type { Alert } from "../../features/alerts/alertTypes";
import { BellIcon, ChevronDownIcon } from "./LayoutIcons";
import "../../styles/Topbar.css";

const POLL_INTERVAL_MS = 30000;
const MAX_VISIBLE_ALERTS = 5;

export function NotificationBell() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAlerts() {
      try {
        const response = await getMyAlerts({
          unreadOnly: true,
          pageSize: MAX_VISIBLE_ALERTS,
        });

        if (!isMounted) {
          return;
        }

        setAlerts(response.items);
        setUnreadCount(response.pagination.totalItems);
        setError("");
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Notifications could not be loaded.",
        );
      }
    }

    void loadAlerts();
    const intervalId = window.setInterval(() => void loadAlerts(), POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  function closeDropdown() {
    setIsOpen(false);
    setExpandedId(null);
  }

  function toggleDropdown() {
    setIsOpen((previous) => {
      const next = !previous;
      if (!next) {
        setExpandedId(null);
      }
      return next;
    });
  }

  async function handleMarkRead(notificationId: string) {
    try {
      await markAlertRead(notificationId);
      setAlerts((current) =>
        current.map((alert) =>
          alert.id === notificationId ? { ...alert, isRead: true } : alert,
        ),
      );
      void refreshUnreadCount();
    } catch {
      // no-op
    }
  }

  async function refreshUnreadCount() {
    try {
      const response = await getMyAlerts({ unreadOnly: true, pageSize: 1 });
      setUnreadCount(response.pagination.totalItems);
    } catch {
      // no-op
    }
  }

  function handleToggleRow(alert: Alert) {
    const isExpanding = expandedId !== alert.id;
    setExpandedId(isExpanding ? alert.id : null);

    if (isExpanding && !alert.isRead) {
      void handleMarkRead(alert.id);
    }
  }

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className={`notification-bell-button ${isOpen ? "open" : ""}`}
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Notifications"
      >
        <BellIcon size={20} />

        {unreadCount > 0 && (
          <span className="notification-bell-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" role="menu">
          <div className="notification-dropdown-header">
            <strong>Notifications</strong>
            <Link to="/alerts" onClick={closeDropdown}>
              View all
            </Link>
          </div>

          {error && <div className="notification-dropdown-error">{error}</div>}

          {!error && alerts.length === 0 && (
            <div className="notification-dropdown-empty">
              You&apos;re all caught up.
            </div>
          )}

          {alerts.length > 0 && (
            <div className="notification-dropdown-list">
              {alerts.map((alert) => (
                <div className="notification-item" key={alert.id}>
                  <button
                    type="button"
                    className={`notification-item-header ${
                      !alert.isRead ? "unread" : ""
                    }`}
                    onClick={() => handleToggleRow(alert)}
                    aria-expanded={expandedId === alert.id}
                  >
                    <span
                      className={`notification-severity ${alert.severity.toLowerCase()}`}
                    >
                      {alert.severity}
                    </span>

                    <span className="notification-item-message">
                      {alert.message}
                    </span>

                    <span className="notification-item-time">
                      {formatRelativeTime(alert.createdAt)}
                    </span>

                    <span
                      className={`notification-item-chevron ${
                        expandedId === alert.id ? "open" : ""
                      }`}
                    >
                      <ChevronDownIcon size={14} />
                    </span>
                  </button>

                  {expandedId === alert.id && (
                    <div className="notification-item-detail">
                      <p>{alert.reason}</p>

                      <div className="notification-item-meta">
                        <span>{alert.requisitionCode}</span>
                        <div className="notification-item-links">
                          <Link
                            to={`/alerts?highlight=${alert.id}`}
                            onClick={closeDropdown}
                          >
                            View in alerts
                          </Link>
                          <Link
                            to={`/requisitions/${alert.requisitionId}`}
                            onClick={closeDropdown}
                          >
                            View requisition
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(isoDate: string) {
  const date = new Date(isoDate);
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);

  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString();
}
