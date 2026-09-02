import { useEffect, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/feedback/StateMessage";
import { AppLayout } from "../components/layout/AppLayout";
import { PageContainer } from "../components/layout/PageContainer";
import { getAlerts, getMyAlerts } from "../features/alerts/alertApi";
import type { Alert } from "../features/alerts/alertTypes";
import { useAuth } from "../features/auth/authContext";
import { canViewAllAlerts } from "../features/auth/roleAccess";
import "../styles/AlertsPage.css";

type AlertScope = "mine" | "all";

const alertSeverities = ["Info", "Warning", "Critical"];

const alertTypes = [
  "SlaWarning",
  "SlaBreached",
  "StalledRequisition",
  "OpenBottleneck",
  "OverdueAction",
  "CriticalRisk",
];

export function AlertsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canUseAllAlerts = canViewAllAlerts(user);

  const activeScope: AlertScope =
    searchParams.get("scope") === "all" && canUseAllAlerts ? "all" : "mine";

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAlerts() {
      setIsLoading(true);
      setError("");

      try {
        const query = {
          severity: searchParams.get("severity"),
          type: searchParams.get("type"),
        };

        const response =
          activeScope === "all"
            ? await getAlerts(query)
            : await getMyAlerts(query);

        if (!isMounted) {
          return;
        }

        setAlerts(response.items);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Alerts could not be loaded.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAlerts();

    return () => {
      isMounted = false;
    };
  }, [activeScope, searchParams]);

  const emptyMessage =
    activeScope === "all"
      ? "There are no team alerts left"
      : "You have no alerts left";

  const alertGroups = getAlertGroups(alerts);

  return (
    <AppLayout title="Alerts">
      <PageContainer>
        <div className="alerts-page">
          {/* PAGE INTRO */}
          <section className="alerts-page-header">
            <div>
              <div className="alerts-eyebrow">
                <span className="alerts-eyebrow-icon">
                  <SlidersHorizontal size={14} aria-hidden="true" />
                </span>
                Monitoring
              </div>

              <h1>Alerts</h1>

              <p>
                Stay on top of recruitment risks, overdue actions, and
                requisition bottlenecks.
              </p>
            </div>

            <div className="alerts-summary">
              <span>{alerts.length}</span>
              <small>
                {alerts.length === 1 ? "active alert" : "active alerts"}
              </small>
            </div>
          </section>

          {/* SCOPE */}
          {canUseAllAlerts && (
            <div className="alerts-scope-wrap">
              <div
                className="segmented-control alerts-segmented-control"
                aria-label="Alert scope"
              >
                <button
                  className={activeScope === "mine" ? "active" : ""}
                  type="button"
                  onClick={() => setAlertScope("mine")}
                >
                  My alerts
                </button>

                <button
                  className={activeScope === "all" ? "active" : ""}
                  type="button"
                  onClick={() => setAlertScope("all")}
                >
                  All alerts
                </button>
              </div>
            </div>
          )}

          {/* FILTERS */}
          <section className="alert-filter-bar" aria-label="Alert filters">
            <div className="alert-filter-heading">
              <div className="alert-filter-icon">
                <SlidersHorizontal size={16} aria-hidden="true" />
              </div>

              <div>
                <strong>Filter alerts</strong>
                <span>Refine the alerts shown below</span>
              </div>
            </div>

            <div className="alert-filter-fields">
              <label>
                <span>Severity</span>

                <select
                  value={searchParams.get("severity") ?? ""}
                  onChange={(event) =>
                    setAlertFilter("severity", event.target.value)
                  }
                >
                  <option value="">All severities</option>

                  {alertSeverities.map((severity) => (
                    <option value={severity} key={severity}>
                      {formatValue(severity)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Alert type</span>

                <select
                  value={searchParams.get("type") ?? ""}
                  onChange={(event) =>
                    setAlertFilter("type", event.target.value)
                  }
                >
                  <option value="">All types</option>

                  {alertTypes.map((type) => (
                    <option value={type} key={type}>
                      {formatValue(type)}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="clear-alert-filters"
                type="button"
                onClick={clearAlertFilters}
              >
                Clear filters
              </button>
            </div>
          </section>

          {/* CONTENT */}
          {isLoading && (
            <section className="alerts-state-panel">
              <LoadingState message="Loading alerts..." />
            </section>
          )}

          {!isLoading && error && (
            <section className="alerts-state-panel">
              <ErrorState title="Alerts unavailable" message={error} />
            </section>
          )}

          {!isLoading && !error && alerts.length === 0 && (
            <section className="alerts-empty-panel">
              <div className="alerts-empty-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="25"
                  height="25"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M10 21h4" />
                </svg>
              </div>

              <strong>{emptyMessage}</strong>

              <p>
                {searchParams.get("severity") || searchParams.get("type")
                  ? "Try clearing your filters to see more alerts."
                  : "Everything looks clear for now."}
              </p>

              {(searchParams.get("severity") || searchParams.get("type")) && (
                <button type="button" onClick={clearAlertFilters}>
                  Clear filters
                </button>
              )}
            </section>
          )}

          {alertGroups.length > 0 && (
            <section
              className="alerts-list"
              aria-label={activeScope === "all" ? "All alerts" : "My alerts"}
            >
              <div className="alerts-list-heading">
                <div>
                  <strong>
                    {activeScope === "all" ? "All alerts" : "My alerts"}
                  </strong>
                  <span>
                    {alertGroups.length}{" "}
                    {alertGroups.length === 1 ? "requisition" : "requisitions"}{" "}
                    requiring attention
                  </span>
                </div>
              </div>

              {alertGroups.map((group) => {
                const isOpen = openGroups.has(group.key);

                return (
                  <article
                    className={`alert-group ${
                      isOpen ? "alert-group-open" : ""
                    }`}
                    key={group.key}
                  >
                    <button
                      className="alert-group-header"
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggleAlertGroup(group.key)}
                    >
                      <span
                        className={`alert-group-chevron ${
                          isOpen ? "open" : ""
                        }`}
                      >
                        <ChevronDown size={18} aria-hidden="true" />
                      </span>

                      <span
                        className={`severity-pill ${group.severity.toLowerCase()}`}
                      >
                        <span className="severity-dot" />
                        {formatValue(group.severity)}
                      </span>

                      <span className="alert-group-requisition">
                        <strong>{group.requisitionCode}</strong>
                        <span>{group.roleName}</span>
                      </span>

                      <span className="alert-group-count">
                        {group.alerts.length}
                        <small>
                          {group.alerts.length === 1 ? "alert" : "alerts"}
                        </small>
                      </span>
                    </button>

                    {isOpen && (
                      <div className="alert-group-items">
                        {group.alerts.map((alert) => (
                          <div
                            className="alert-card alert-card-nested"
                            key={alert.id}
                          >
                            <div className="alert-card-main">
                              <div className="alert-card-icon">
                                <AlertTypeIcon type={alert.type} />
                              </div>

                              <div className="alert-card-copy">
                                <div className="alert-card-title-row">
                                  <h2>{formatValue(alert.type)}</h2>

                                  <span
                                    className={`alert-inline-severity ${alert.severity.toLowerCase()}`}
                                  >
                                    {formatValue(alert.severity)}
                                  </span>
                                </div>

                                <p>{alert.message}</p>
                              </div>
                            </div>

                            <dl className="alert-details">
                              <div>
                                <dt>Reason</dt>
                                <dd>{alert.reason}</dd>
                              </div>

                              <div>
                                <dt>Recipient</dt>
                                <dd>{alert.recipientName}</dd>
                              </div>
                            </dl>

                            <div className="alert-action">
                              <div>
                                <span>Recommended action</span>
                              </div>

                              <Link
                                className="alert-action-link"
                                to={getAlertTarget(alert)}
                              >
                                {getAlertLinkLabel(alert)}
                                <svg
                                  viewBox="0 0 24 24"
                                  width="15"
                                  height="15"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  aria-hidden="true"
                                >
                                  <path d="M5 12h14" />
                                  <path d="m13 6 6 6-6 6" />
                                </svg>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );

  function setAlertScope(nextScope: AlertScope) {
    const nextParams = new URLSearchParams(searchParams);

    if (nextScope === "all") {
      nextParams.set("scope", "all");
    } else {
      nextParams.delete("scope");
    }

    setSearchParams(nextParams);
  }

  function setAlertFilter(key: "severity" | "type", value: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }

    setSearchParams(nextParams);
  }

  function clearAlertFilters() {
    const nextParams = new URLSearchParams(searchParams);

    nextParams.delete("severity");
    nextParams.delete("type");

    setSearchParams(nextParams);
  }

  function toggleAlertGroup(groupKey: string) {
    setOpenGroups((current) => {
      const next = new Set(current);

      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }

      return next;
    });
  }
}

function AlertTypeIcon({ type }: { type: string }) {
  if (type === "OpenBottleneck") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M12 3v18" />
        <path d="M5 7h14" />
        <path d="M5 17h14" />
        <circle cx="12" cy="7" r="2" />
        <circle cx="12" cy="17" r="2" />
      </svg>
    );
  }

  if (type === "OverdueAction") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (type === "StalledRequisition") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 12h8" />
      </svg>
    );
  }

  if (type === "CriticalRisk") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M12 3 3.5 19h17L12 3Z" />
        <path d="M12 9v4" />
        <path d="M12 16h.01" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

type AlertGroup = {
  key: string;
  requisitionCode: string;
  roleName: string;
  severity: string;
  alerts: Alert[];
};

function getAlertGroups(alerts: Alert[]): AlertGroup[] {
  const groups = new Map<string, AlertGroup>();

  for (const alert of alerts) {
    const key = `${alert.requisitionId}:${alert.severity}`;
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.alerts.push(alert);
      continue;
    }

    groups.set(key, {
      key,
      requisitionCode: alert.requisitionCode,
      roleName: alert.roleName,
      severity: alert.severity,
      alerts: [alert],
    });
  }

  return [...groups.values()].sort(
    (first, second) =>
      getSeverityRank(first.severity) - getSeverityRank(second.severity) ||
      first.requisitionCode.localeCompare(second.requisitionCode),
  );
}

function getSeverityRank(severity: string) {
  if (severity === "Critical") {
    return 0;
  }

  if (severity === "Warning") {
    return 1;
  }

  return 2;
}

function formatValue(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function getAlertTarget(alert: Alert) {
  const section = getAlertSection(alert);

  return section
    ? `/requisitions/${alert.requisitionId}?section=${section}`
    : `/requisitions/${alert.requisitionId}`;
}

function getAlertSection(alert: Alert) {
  if (alert.metadata.bottleneckId || alert.type === "OpenBottleneck") {
    return "bottlenecks";
  }

  if (alert.metadata.actionItemId || alert.type === "OverdueAction") {
    return "actions";
  }

  return "overview";
}

function getAlertLinkLabel(alert: Alert) {
  const section = getAlertSection(alert);

  if (section === "bottlenecks") {
    return "View bottleneck";
  }

  if (section === "actions") {
    return "View action";
  }

  return "View requisition";
}
