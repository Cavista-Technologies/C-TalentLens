import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ErrorState, LoadingState } from "../components/feedback/StateMessage";
import { AppLayout } from "../components/layout/AppLayout";
import { PageContainer } from "../components/layout/PageContainer";
import { useAuth } from "../features/auth/authContext";
import { appRoles, hasAnyRole } from "../features/auth/roleAccess";
import { getDashboard } from "../features/dashboard/dashboardApi";
import type { DashboardResponse } from "../features/dashboard/dashboardTypes";
import { getRequisitions } from "../features/requisitions/requisitionApi";
import { formatValue } from "../features/requisitions/requisitionDisplay";
import type { Requisition } from "../features/requisitions/requisitionTypes";
import type { UserProfile } from "../features/auth/authTypes";

import "../styles/Dashboard.css";

export function DashboardPage() {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);

  const [requisitions, setRequisitions] = useState<Requisition[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRequisitionsLoading, setIsRequisitionsLoading] = useState(true);

  const [error, setError] = useState("");
  const [requisitionsError, setRequisitionsError] = useState("");

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [recruiter, setRecruiter] = useState("All Recruiters");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const response = await getDashboard();

        if (!isMounted) {
          return;
        }

        setDashboard(response);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Dashboard could not be loaded.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRequisitions() {
      setIsRequisitionsLoading(true);
      setRequisitionsError("");

      try {
        const response = await getRequisitions({
          page: 1,
          pageSize: 10,
          search: "",
          openOnly: true,
          overdueOnly: false,
          nearSlaBreach: false,
          status: "Active",
          stage: "",
        });

        if (!isMounted) {
          return;
        }

        setRequisitions(response.items);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setRequisitionsError(
          err instanceof Error
            ? err.message
            : "Requisitions could not be loaded.",
        );
      } finally {
        if (isMounted) {
          setIsRequisitionsLoading(false);
        }
      }
    }

    void loadRequisitions();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppLayout title="Dashboard">
      <PageContainer>
        {isLoading && <LoadingState message="Loading dashboard..." />}

        {!isLoading && error && (
          <ErrorState title="Dashboard unavailable" message={error} />
        )}

        {!isLoading && dashboard && (
          <DashboardContent
            dashboard={dashboard}
            user={user}
            requisitions={requisitions}
            isRequisitionsLoading={isRequisitionsLoading}
            requisitionsError={requisitionsError}
            search={search}
            setSearch={setSearch}
            department={department}
            setDepartment={setDepartment}
            recruiter={recruiter}
            setRecruiter={setRecruiter}
          />
        )}
      </PageContainer>
    </AppLayout>
  );
}

function DashboardContent({
  dashboard,
  user,
  requisitions,
  isRequisitionsLoading,
  requisitionsError,
  search,
  setSearch,
  department,
  setDepartment,
  recruiter,
  setRecruiter,
}: {
  dashboard: DashboardResponse;
  user: UserProfile | null;
  requisitions: Requisition[];
  isRequisitionsLoading: boolean;
  requisitionsError: string;
  search: string;
  setSearch: (value: string) => void;
  department: string;
  setDepartment: (value: string) => void;
  recruiter: string;
  setRecruiter: (value: string) => void;
}) {
  const metrics = getRoleMetrics(dashboard, user);
  const attentionItems = getAttentionItems(dashboard, user);

  const pipeline = [
    ["JD / Job Posting", dashboard.pipeline.rolesInJobPosting],
    ["Pipelining / Sourcing", dashboard.pipeline.rolesInPipeliningSourcing],
    ["Spark Hire", dashboard.pipeline.rolesInSparkHire],
    ["Interview", dashboard.pipeline.rolesInInterviewStage],
    ["Request-to-Hire", dashboard.pipeline.rolesInRequestToHire],
    ["Offered / Hired", dashboard.pipeline.rolesOfferedOrHired],
  ] as const;

  const totalPipeline = pipeline.reduce((total, [, count]) => total + count, 0);

  const recruitmentHealth = getRecruitmentHealth(dashboard);

  const departments = useMemo(
    () => getDepartments(requisitions),
    [requisitions],
  );

  const recruiters = useMemo(() => getRecruiters(requisitions), [requisitions]);

  return (
    <div className="dashboard-page">
      <section className="dashboard-toolbar">
        <div className="dashboard-subtitle">
          Recruitment overview for {formatToday()}
        </div>

        <div className="dashboard-toolbar-actions">
          <div className="dashboard-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search requisitions, roles..."
              aria-label="Search requisitions and roles"
            />
          </div>

          <Link className="new-requisition-button" to="/requisitions/new">
            <span>+</span>
            New Requisition
          </Link>
        </div>
      </section>

      <section className="dashboard-filters" aria-label="Dashboard filters">
        <label className="dashboard-select">
          <span className="sr-only">Department</span>

          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <option>All Departments</option>

            {departments.map((item) => (
              <option key={item} value={item}>
                {formatDepartment(item)}
              </option>
            ))}
          </select>
        </label>

        <label className="dashboard-select">
          <span className="sr-only">Recruiter</span>

          <select
            value={recruiter}
            onChange={(event) => setRecruiter(event.target.value)}
          >
            <option>All Recruiters</option>

            {recruiters.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="metric-grid" aria-label="Recruitment metrics">
        {metrics.map((metric) => (
          <Link
            className={`metric-card metric-${metric.tone} dashboard-link-card`}
            key={metric.label}
            to={metric.href}
          >
            <div className="metric-card-top">
              <span className="metric-icon">{metric.icon}</span>

              <span className="metric-label">{metric.label}</span>
            </div>

            <strong>{metric.value}</strong>

            <p>
              {metric.trend && (
                <span
                  className={`metric-trend metric-trend-${metric.trendTone}`}
                >
                  {metric.trend}
                </span>
              )}

              {metric.detail}
            </p>
          </Link>
        ))}
      </section>

      <section className="dashboard-overview-grid">
        <article className="dashboard-card hiring-pipeline-card">
          <div className="dashboard-card-header">
            <h2>Hiring Pipeline</h2>
          </div>

          <div className="hiring-pipeline-list">
            {pipeline.map(([label, count]) => {
              const percentage = getPercentExact(count, totalPipeline);

              return (
                <Link
                  className="hiring-pipeline-row dashboard-link-card"
                  key={label}
                  to={getPipelineHref(label)}
                >
                  <span className="pipeline-stage-label">{label}</span>

                  <div className="pipeline-bar" aria-label={`${percentage}%`}>
                    <span
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <span className="pipeline-percentage">{percentage}%</span>

                  <strong className="pipeline-count">{count}</strong>
                </Link>
              );
            })}
          </div>
        </article>

        <article className="dashboard-card needs-attention-card">
          <div className="dashboard-card-header">
            <h2>{getAttentionTitle(user)}</h2>
          </div>

          <div className="attention-list">
            {attentionItems.map((item) => (
              <Link
                className={`attention-row attention-${item.tone} dashboard-link-card`}
                key={item.label}
                to={item.href}
              >
                <span className="attention-dot" />

                <span className="attention-label">{item.label}</span>

                <strong className="attention-value">{item.value}</strong>
              </Link>
            ))}
          </div>
        </article>

        <article className="dashboard-card recruitment-health-card">
          <div className="dashboard-card-header">
            <h2>Recruitment Health</h2>
          </div>

          <div className="health-content">
            <div className="health-chart-wrap">
              <div
                className="health-donut"
                style={{
                  background: `conic-gradient(
                    #4caf50 0 ${recruitmentHealth.onTrackPercent}%,
                    #ff9800 ${recruitmentHealth.onTrackPercent}% ${
                      recruitmentHealth.onTrackPercent +
                      recruitmentHealth.atRiskPercent
                    }%,
                    #f44336 ${
                      recruitmentHealth.onTrackPercent +
                      recruitmentHealth.atRiskPercent
                    }% 100%
                  )`,
                }}
                aria-label={`Recruitment health: ${recruitmentHealth.onTrack} on track, ${recruitmentHealth.atRisk} at risk, ${recruitmentHealth.critical} critical`}
              >
                <div className="health-donut-center">
                  <span>Total</span>

                  <strong>{recruitmentHealth.total}</strong>
                </div>
              </div>
            </div>

            <div className="health-legend">
              <Link
                to="/requisitions?status=Active"
                className="health-legend-row dashboard-link-card"
              >
                <span className="legend-dot legend-green" />

                <span>
                  On Track {recruitmentHealth.onTrack} (
                  {recruitmentHealth.onTrackPercent}%)
                </span>
              </Link>

              <Link
                to="/requisitions?nearSlaBreach=true"
                className="health-legend-row dashboard-link-card"
              >
                <span className="legend-dot legend-orange" />

                <span>
                  At Risk {recruitmentHealth.atRisk} (
                  {recruitmentHealth.atRiskPercent}%)
                </span>
              </Link>

              <Link
                to="/requisitions?overdueOnly=true"
                className="health-legend-row dashboard-link-card"
              >
                <span className="legend-dot legend-red" />

                <span>
                  Critical {recruitmentHealth.critical} (
                  {recruitmentHealth.criticalPercent}%)
                </span>
              </Link>
            </div>
          </div>
        </article>
      </section>

      <OpenRequisitions
        requisitions={requisitions}
        isLoading={isRequisitionsLoading}
        error={requisitionsError}
        search={search}
        department={department}
        recruiter={recruiter}
      />
    </div>
  );
}

function OpenRequisitions({
  requisitions,
  isLoading,
  error,
  search,
  department,
  recruiter,
}: {
  requisitions: Requisition[];
  isLoading: boolean;
  error: string;
  search: string;
  department: string;
  recruiter: string;
}) {
  const displayedRequisitions = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = requisitions.filter((requisition) => {
      const matchesSearch =
        !query ||
        requisition.roleName.toLowerCase().includes(query) ||
        requisition.department.toLowerCase().includes(query) ||
        requisition.recruiter.toLowerCase().includes(query) ||
        requisition.hiringManager.toLowerCase().includes(query);

      const matchesDepartment =
        department === "All Departments" ||
        requisition.department === department;

      const matchesRecruiter =
        recruiter === "All Recruiters" || requisition.recruiter === recruiter;

      return matchesSearch && matchesDepartment && matchesRecruiter;
    });

    return filtered.slice(0, 3);
  }, [requisitions, search, department, recruiter]);

  return (
    <section className="open-requisitions-card">
      <div className="open-requisitions-header">
        <h2>Open Requisitions</h2>

        <Link to="/requisitions?status=Active" className="view-all-link">
          View all open requisitions
        </Link>
      </div>

      {isLoading ? (
        <div className="open-requisitions-empty">
          <div>
            <strong>Loading open requisitions...</strong>

            <span>Retrieving active requisitions...</span>
          </div>
        </div>
      ) : error ? (
        <div className="open-requisitions-empty">
          <div>
            <strong>Open requisitions unavailable</strong>

            <span>{error}</span>
          </div>

          <Link to="/requisitions?status=Active">View active requisitions</Link>
        </div>
      ) : displayedRequisitions.length === 0 ? (
        <div className="open-requisitions-empty">
          <div>
            <strong>No open requisitions found</strong>

            <span>
              {requisitions.length === 0
                ? "There are currently no active requisitions."
                : "No active requisitions match the current filters."}
            </span>
          </div>

          <Link to="/requisitions?status=Active">View active requisitions</Link>
        </div>
      ) : (
        <div className="requisitions-table-wrapper">
          <table className="requisitions-table">
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Department</th>
                <th scope="col">Recruiter</th>
                <th scope="col">Hiring Manager</th>
                <th scope="col">Stage</th>
                <th scope="col">Days Open</th>
                <th scope="col">SLA Status</th>
              </tr>
            </thead>

            <tbody>
              {displayedRequisitions.map((requisition) => (
                <tr key={requisition.id}>
                  <td className="role-cell">{requisition.roleName}</td>

                  <td>{formatValue(requisition.department)}</td>

                  <td>{requisition.recruiter}</td>

                  <td>{requisition.hiringManager}</td>

                  <td>
                    <span className="stage-pill">
                      {formatValue(requisition.currentStage)}
                    </span>
                  </td>

                  <td>{requisition.daysOpen}</td>

                  <td>
                    <span className={getSlaStatusClass(requisition.slaState)}>
                      {formatValue(requisition.slaState)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function getSlaStatusClass(status: string) {
  const normalized = status.trim().toLowerCase();

  if (
    normalized.includes("critical") ||
    normalized.includes("breach") ||
    normalized === "breached"
  ) {
    return "sla-status sla-status-critical";
  }

  if (
    normalized.includes("near") ||
    normalized.includes("risk") ||
    normalized === "atrisk"
  ) {
    return "sla-status sla-status-warning";
  }

  return "sla-status sla-status-good";
}

function getDepartments(requisitions: Requisition[]) {
  return Array.from(
    new Set(requisitions.map((item) => item.department).filter(Boolean)),
  ).sort();
}

function getRecruiters(requisitions: Requisition[]) {
  return Array.from(
    new Set(requisitions.map((item) => item.recruiter).filter(Boolean)),
  ).sort();
}

function formatDepartment(department: string) {
  return formatValue(department);
}

type SummaryTone = "neutral" | "success" | "warning" | "danger";

type Metric = {
  label: string;
  value: number | string;
  detail: string;
  tone: SummaryTone;
  href: string;
  icon: string;
  trend?: string;
  trendTone?: "positive" | "negative" | "neutral";
};

function getRoleMetrics(
  dashboard: DashboardResponse,
  user: UserProfile | null,
): Metric[] {
  if (hasAnyRole(user, [appRoles.hiringManager])) {
    return [
      metric(
        "My open requisitions",
        dashboard.recruitmentOverview.totalOpenRoles,
        `${dashboard.recruitmentOverview.outstandingGoals} positions remaining`,
        "success",
        "/requisitions?status=Active",
        "▱",
      ),

      metric(
        "Feedback actions",
        dashboard.actions.totalOpenActions,
        `${dashboard.actions.overdueActions} overdue`,
        dashboard.actions.overdueActions > 0 ? "warning" : "success",
        "/alerts",
        "✓",
      ),

      metric(
        "Open bottlenecks",
        dashboard.bottlenecks.totalOpenBottlenecks,
        `${dashboard.bottlenecks.escalatedBottlenecks} escalated`,
        dashboard.bottlenecks.escalatedBottlenecks > 0 ? "danger" : "warning",
        "/alerts",
        "!",
      ),

      metric(
        "Near SLA breach",
        dashboard.risk.rolesNearSlaBreach,
        `${dashboard.risk.overdueRoles} overdue`,
        dashboard.risk.overdueRoles > 0 ? "danger" : "warning",
        "/requisitions?nearSlaBreach=true",
        "◷",
      ),
    ];
  }

  if (hasAnyRole(user, [appRoles.leadership])) {
    return [
      metric(
        "Open requisitions",
        dashboard.recruitmentOverview.totalOpenRoles,
        `${dashboard.recruitmentOverview.outstandingGoals} positions remaining`,
        "success",
        "/requisitions?status=Active",
        "▱",
      ),

      metric(
        "Filled requisitions",
        dashboard.pipeline.rolesFilled,
        `${dashboard.recruitmentOverview.goalsFilled} hiring goals met`,
        "success",
        "/requisitions?openOnly=false",
        "✓",
      ),

      metric(
        "Avg. time to fill",
        `${dashboard.timeToFill.averageTimeToFill} days`,
        `${dashboard.slaCompliance.complianceRate}% SLA compliance`,
        dashboard.slaCompliance.complianceRate >= 80 ? "success" : "warning",
        "/analytics",
        "◷",
        "↓ 8% vs last week",
        "positive",
      ),

      metric(
        "At risk",
        dashboard.risk.items.length,
        `${dashboard.risk.stalledRequisitions} stalled`,
        dashboard.risk.items.length > 0 ? "danger" : "success",
        "/alerts",
        "!",
      ),
    ];
  }

  if (hasAnyRole(user, [appRoles.talentAcquisitionManager])) {
    return [
      metric(
        "Open requisitions",
        dashboard.recruitmentOverview.totalOpenRoles,
        `${dashboard.recruitmentOverview.outstandingGoals} positions remaining`,
        "success",
        "/requisitions?status=Active",
        "▱",
      ),

      metric(
        "SLA compliance",
        `${dashboard.slaCompliance.complianceRate}%`,
        `${dashboard.slaCompliance.rolesBreachingSla} breaching`,
        dashboard.slaCompliance.rolesBreachingSla > 0 ? "danger" : "success",
        "/requisitions?overdueOnly=true",
        "♢",
      ),

      metric(
        "Escalated bottlenecks",
        dashboard.bottlenecks.escalatedBottlenecks,
        `${dashboard.bottlenecks.highRiskBottlenecks} high risk`,
        dashboard.bottlenecks.escalatedBottlenecks > 0 ? "danger" : "success",
        "/alerts",
        "!",
      ),

      metric(
        "Overdue actions",
        dashboard.actions.overdueActions,
        `${dashboard.actions.highPriorityActions} high priority`,
        dashboard.actions.overdueActions > 0 ? "warning" : "success",
        "/alerts",
        "◷",
      ),
    ];
  }

  return [
    metric(
      "My open requisitions",
      dashboard.recruitmentOverview.totalOpenRoles,
      `${dashboard.recruitmentOverview.outstandingGoals} positions remaining`,
      "success",
      "/requisitions?status=Active",
      "▱",
    ),

    metric(
      "Filled requisitions",
      dashboard.pipeline.rolesFilled,
      `${dashboard.recruitmentOverview.goalsFilled} hiring goals met`,
      "success",
      "/requisitions?openOnly=false",
      "✓",
    ),

    metric(
      "Overdue actions",
      dashboard.actions.overdueActions,
      `${dashboard.actions.totalOpenActions} open actions`,
      dashboard.actions.overdueActions > 0 ? "warning" : "success",
      "/alerts",
      "◷",
    ),

    metric(
      "Open bottlenecks",
      dashboard.bottlenecks.totalOpenBottlenecks,
      `${dashboard.bottlenecks.escalatedBottlenecks} escalated`,
      dashboard.bottlenecks.escalatedBottlenecks > 0 ? "danger" : "success",
      "/alerts",
      "!",
    ),
  ];
}

function metric(
  label: string,
  value: number | string,
  detail: string,
  tone: SummaryTone,
  href: string,
  icon: string,
  trend?: string,
  trendTone?: "positive" | "negative" | "neutral",
): Metric {
  return {
    label,
    value,
    detail,
    tone,
    href,
    icon,
    trend,
    trendTone,
  };
}

function getAttentionItems(
  dashboard: DashboardResponse,
  user: UserProfile | null,
) {
  if (hasAnyRole(user, [appRoles.hiringManager])) {
    return [
      metric(
        "Open actions",
        dashboard.actions.totalOpenActions,
        "",
        "neutral",
        "/alerts",
        "•",
      ),

      metric(
        "Overdue actions",
        dashboard.actions.overdueActions,
        "",
        "danger",
        "/alerts",
        "•",
      ),

      metric(
        "Open bottlenecks",
        dashboard.bottlenecks.totalOpenBottlenecks,
        "",
        "warning",
        "/alerts",
        "•",
      ),

      metric(
        "Stalled requisitions",
        dashboard.risk.stalledRequisitions,
        "",
        "danger",
        "/requisitions?overdueOnly=true",
        "•",
      ),
    ];
  }

  if (hasAnyRole(user, [appRoles.talentAcquisitionManager])) {
    return [
      metric(
        "Overdue requisitions",
        dashboard.risk.overdueRoles,
        "",
        "danger",
        "/requisitions?overdueOnly=true",
        "•",
      ),

      metric(
        "Near SLA breach",
        dashboard.risk.rolesNearSlaBreach,
        "",
        "warning",
        "/requisitions?nearSlaBreach=true",
        "•",
      ),

      metric(
        "Escalated bottlenecks",
        dashboard.bottlenecks.escalatedBottlenecks,
        "",
        "danger",
        "/alerts",
        "•",
      ),

      metric(
        "High priority actions",
        dashboard.actions.highPriorityActions,
        "",
        "warning",
        "/alerts",
        "•",
      ),
    ];
  }

  return [
    metric(
      "Overdue requisitions",
      dashboard.risk.overdueRoles,
      "",
      "danger",
      "/requisitions?overdueOnly=true",
      "•",
    ),

    metric(
      "Near SLA breach",
      dashboard.risk.rolesNearSlaBreach,
      "",
      "warning",
      "/requisitions?nearSlaBreach=true",
      "•",
    ),

    metric(
      "Stalled requisitions",
      dashboard.risk.stalledRequisitions,
      "",
      "neutral",
      "/requisitions?overdueOnly=true",
      "•",
    ),

    metric(
      "Open bottlenecks",
      dashboard.bottlenecks.totalOpenBottlenecks,
      "",
      "neutral",
      "/alerts",
      "•",
    ),
  ];
}

function getAttentionTitle(user: UserProfile | null) {
  if (hasAnyRole(user, [appRoles.hiringManager])) {
    return "Needs your input";
  }

  if (hasAnyRole(user, [appRoles.talentAcquisitionManager])) {
    return "Escalations";
  }

  return "Needs Attention";
}

function getRecruitmentHealth(dashboard: DashboardResponse) {
  const onTrack = dashboard.slaCompliance.rolesWithinSla;

  const atRisk = dashboard.slaCompliance.rolesApproachingSla;

  const critical = dashboard.slaCompliance.rolesBreachingSla;

  const total = onTrack + atRisk + critical;

  if (total === 0) {
    return {
      total: 0,
      onTrack: 0,
      atRisk: 0,
      critical: 0,
      onTrackPercent: 0,
      atRiskPercent: 0,
      criticalPercent: 0,
    };
  }

  return {
    total,
    onTrack,
    atRisk,
    critical,
    onTrackPercent: Math.round((onTrack / total) * 100),
    atRiskPercent: Math.round((atRisk / total) * 100),
    criticalPercent: Math.round((critical / total) * 100),
  };
}

function getPercentExact(value: number, total: number) {
  if (total <= 0 || value <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function getPipelineHref(stage: string) {
  const stageFilters: Record<string, string> = {
    "JD / Job Posting": "JobPosting",
    "Pipelining / Sourcing": "PipeliningSourcing",
    "Spark Hire": "SparkHire",
    Interview: "Interview",
    "Request-to-Hire": "RequestToHire",
    "Offered / Hired": "OfferedHired",
  };

  return stageFilters[stage]
    ? `/requisitions?stage=${stageFilters[stage]}`
    : "/requisitions";
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
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
