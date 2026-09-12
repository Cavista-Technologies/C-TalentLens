import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/feedback/StateMessage";
import { AppLayout } from "../components/layout/AppLayout";
import { PageContainer } from "../components/layout/PageContainer";
import { getAlerts, markAlertRead, getMyAlerts } from "../features/alerts/alertApi";
import type { Alert } from "../features/alerts/alertTypes";
import { useAuth } from "../features/auth/authContext";
import {
  appRoles,
  canViewAllAlerts,
  hasAnyRole,
} from "../features/auth/roleAccess";
import "../styles/AlertsPage.css";

type AlertScope = "mine" | "all";

const alertSeverities = ["Info", "Warning", "High", "Critical"];
const alertTypes = [
  "SlaWarning",
  "SlaBreached",
  "StalledRequisition",
  "OpenBottleneck",
  "OverdueAction",
  "CriticalRisk",
  "RequisitionAssigned",
  "BottleneckAssigned",
  "ActionAssigned",
];

export function AlertsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isLeadership = hasAnyRole(user, [appRoles.leadership]);
  const canUseAllAlerts = canViewAllAlerts(user);
  const showScopeToggle = canUseAllAlerts && !isLeadership;
  const activeScope: AlertScope =
    isLeadership || (searchParams.get("scope") === "all" && canUseAllAlerts)
      ? "all"
      : "mine";
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

  const alertGroups = getAlertGroups(alerts);
  const highlightId = searchParams.get("highlight");
  const hasHighlightedRef = useRef(false);

  useEffect(() => {
    if (!highlightId || hasHighlightedRef.current || alerts.length === 0) {
      return;
    }

    const target = alerts.find((alert) => alert.id === highlightId);
    if (!target) {
      return;
    }

    hasHighlightedRef.current = true;
    const groupKey = `${target.requisitionId}:${target.severity}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenGroups((current) => new Set(current).add(groupKey));
    markGroupRead(groupKey);

    requestAnimationFrame(() => {
      document
        .getElementById(`alert-group-${groupKey}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, alerts]);

  return (
    <AppLayout title="Alerts">
      <PageContainer>
        {showScopeToggle && (
          <div className="segmented-control" aria-label="Alert scope">
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
        )}

        <section className="alert-filter-bar" aria-label="Alert filters">
          <label>
            Severity
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
            Type
            <select
              value={searchParams.get("type") ?? ""}
              onChange={(event) => setAlertFilter("type", event.target.value)}
            >
              <option value="">All types</option>
              {alertTypes.map((type) => (
                <option value={type} key={type}>
                  {formatValue(type)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={clearAlertFilters}>
            Clear
          </button>
        </section>

        {isLoading && <LoadingState message="Loading alerts..." />}

        {!isLoading && error && (
          <ErrorState title="Alerts unavailable" message={error} />
        )}

        {!isLoading && !error && alerts.length === 0 && (
          <section className="empty-panel centered-empty-panel">
            <strong>There are no alerts left</strong>
          </section>
        )}

        {alertGroups.length > 0 && (
          <section
            className="alerts-list"
            aria-label={activeScope === "all" ? "All alerts" : "My alerts"}
          >
            {alertGroups.map((group) => (
              <article
                className="alert-group"
                key={group.key}
                id={`alert-group-${group.key}`}
              >
                <button
                  className="alert-group-header"
                  type="button"
                  aria-expanded={openGroups.has(group.key)}
                  onClick={() => toggleAlertGroup(group.key)}
                >
                  <span
                    className={`alert-group-chevron ${
                      openGroups.has(group.key) ? "open" : ""
                    }`}
                  >
                    <ChevronDown size={17} aria-hidden="true" />
                  </span>

                  <span
                    className={`severity-pill ${group.severity.toLowerCase()}`}
                  >
                    {formatValue(group.severity)}
                  </span>

                  <div className="alert-group-requisition">
                    <strong>
                      {group.requisitionCode}
                      {group.alerts.some((alert) => !alert.isRead) && (
                        <span className="alert-group-unread-dot" aria-label="Unread" />
                      )}
                    </strong>
                    <span>{group.roleName}</span>
                  </div>

                  <small>
                    {group.alerts.length}{" "}
                    {group.alerts.length === 1 ? "alert" : "alerts"}
                  </small>
                </button>

                {openGroups.has(group.key) && (
                  <div className="alert-group-items">
                    {group.alerts.map((alert) => (
                      <div
                        className="alert-card alert-card-nested"
                        key={alert.id}
                      >
                        <div>
                          <h2>{formatValue(alert.type)}</h2>
                          <p>{alert.message}</p>
                        </div>

                        <dl>
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
                          <span>Action</span>
                          <Link
                            className="table-link"
                            to={getAlertTarget(alert)}
                          >
                            {getAlertLinkLabel(alert)}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
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
    const isOpening = !openGroups.has(groupKey);

    setOpenGroups((current) => {
      const next = new Set(current);

      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }

      return next;
    });

    if (isOpening) {
      markGroupRead(groupKey);
    }
  }

  function markGroupRead(groupKey: string) {
    const group = alertGroups.find((candidate) => candidate.key === groupKey);
    const unreadIds =
      group?.alerts.filter((alert) => !alert.isRead).map((alert) => alert.id) ?? [];

    if (unreadIds.length === 0) {
      return;
    }

    void Promise.all(unreadIds.map((id) => markAlertRead(id)))
      .then(() => {
        setAlerts((current) =>
          current.map((alert) =>
            unreadIds.includes(alert.id) ? { ...alert, isRead: true } : alert,
          ),
        );
      })
      .catch(() => {});
  }
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
    (first, second) => getMostRecentCreatedAt(second.alerts) - getMostRecentCreatedAt(first.alerts),
  );
}

function getMostRecentCreatedAt(alerts: Alert[]) {
  return Math.max(...alerts.map((alert) => new Date(alert.createdAt).getTime()));
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
