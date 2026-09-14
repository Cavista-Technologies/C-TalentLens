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
import { ChartIcon } from "../components/layout/LayoutIcons";
import { AlertCircle } from "lucide-react";

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
  const haveAllAccess = hasAnyRole(user, [appRoles.talentAcquisitionManager])
  const metrics = getRoleMetrics(dashboard, user);
  const attentionItems = getAttentionItems(dashboard, user);

  const pipeline = [
    ["Job Posting", dashboard.pipeline.rolesInJobPosting],
    ["Sourcing", dashboard.pipeline.rolesInPipeliningSourcing],
    ["Spark Hire", dashboard.pipeline.rolesInSparkHire],
    ["Interview", dashboard.pipeline.rolesInInterviewStage],
    ["Request-to-Hire", dashboard.pipeline.rolesInRequestToHire],
    ["Hired", dashboard.pipeline.rolesOfferedOrHired],
  ] as const;

  const totalPipeline = pipeline.reduce((total, [, count]) => total + count, 0);
  const recruitmentHealth = getRecruitmentHealth(dashboard);
  const departments = useMemo(
    () => getDepartments(requisitions),
    [requisitions],
  );
  const recruiters = useMemo(() => getRecruiters(requisitions), [requisitions]);
  const healthStatus = 
    recruitmentHealth.criticalPercent > 0 ? "critical"
    : recruitmentHealth.atRisk > 30 ? "at-risk"
    : "good"

    const healthStatusCheck = {
      good: {
        title: "Recruitment health is good",
        description: `${recruitmentHealth.onTrackPercent}% of requisitions are on track`,
        className: "on-track",
      },
      "at-risk": {
        title: "Recruitment health needs attention",
        description: `${recruitmentHealth.atRiskPercent}% of requisitions are at risk`,
        className: "at-risk",
      },
      critical: {
        title: "Recruitment health is critical",
        description: `${recruitmentHealth.criticalPercent}% of requisitions are critical`,
        className: "critical",
      },
    };

    const currentHealth = healthStatusCheck[healthStatus];

  return (
    <div className="dashboard-page">
      <section className="dashboard-toolbar">
        <div className="dashboard-subtitle"></div>
      </section>

    { haveAllAccess  &&  <section className="dashboard-filters" aria-label="Dashboard filters">
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
      </section>}

      {/* =========================================================
          METRIC CARDS
          ========================================================= */}
      <section className="metric-grid" aria-label="Recruitment metrics">
        {metrics.map((metric) => (
          <Link
            className={`metric-card metric-${metric.tone} dashboard-link-card`}
            key={metric.label}
            to={metric.href}
          >
            <span
              className={`metric-icon metric-icon-${metric.icon}`}
              aria-hidden="true"
            >
              <MetricIcon icon={metric.icon} />
            </span>

            <span className="metric-card-content">
              <span className="metric-label">{metric.label}</span>

              <span className="metric-value">
                {metric.value}
                {metric.valueSuffix && (
                  <span className="metric-value-suffix">
                    {metric.valueSuffix}
                  </span>
                )}
              </span>

              {metric.detail && (
                <span className="metric-detail">{metric.detail}</span>
              )}

              {metric.trend && (
                <span
                  className={`metric-trend metric-trend-${metric.trendTone}`}
                >
                  <span className="metric-trend-arrow">
                    {metric.trendDirection === "up"
                      ? "↑"
                      : metric.trendDirection === "down"
                        ? "↓"
                        : "—"}
                  </span>

                  {metric.trend}
                </span>
              )}
            </span>
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
                    <span style={{ width: `${percentage}%` }} />
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
                className={`attention-row attention-${item.tone} attention-level-${getAttentionColor(Number(item.value))} dashboard-link-card`}
                key={item.label}
                to={item.href}
              >
               <div className="attention-div">
                <AlertCircle className="attention-icon" size={18} aria-hidden="true" />
               </div>

                <div className="attention-label">
                  <h4> {item.label} </h4>
                  <p>
                    {item.value} {""}
                    {Number(item.value) > 0 ? "requisitions" : "requisition"}
                  </p>
                </div>
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
          <div className={`on-track-div ${currentHealth.className}`}>
            <span className="chart-icon">
              <ChartIcon />
            </span>

            <span>
              <span className="on-track-head">{currentHealth.title}</span>
              <br />

              <span className="on-track-text">{currentHealth.description}</span>
            </span>
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

/* ================================================================
   METRIC ICONS
   ================================================================ */

type MetricIconName = "briefcase" | "check" | "clock" | "shield" | "alert" | "warning";

function MetricIcon({ icon }: { icon: MetricIconName }) {
  if (icon === "briefcase") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="7"
          width="18"
          height="13"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />

        <path
          d="M8 7V5.5C8 4.67 8.67 4 9.5 4h5c.83 0 1.5.67 1.5 1.5V7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        <path
          d="M3 12h18M10 12v2h4v-2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (icon === "check") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />

        <path
          d="m8 12 2.6 2.6L16.5 9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (icon === "clock") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />

        <path
          d="M12 7v5l3.2 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (icon === "shield") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3.5 19 6v5.2c0 4.5-2.8 7.8-7 9.3-4.2-1.5-7-4.8-7-9.3V6l7-2.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        <path
          d="m9 12 2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (icon === "warning") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />

        <path
          d="M12 8v5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        <circle cx="12" cy="16.5" r=".8" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3 21 19H3L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <path
        d="M12 9v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <circle cx="12" cy="16.5" r=".8" fill="currentColor" />
    </svg>
  );
}

/* ================================================================
   OPEN REQUISITIONS
   ================================================================ */

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
    const { user } = useAuth();
    const haveAllAccess = hasAnyRole(user, [appRoles.talentAcquisitionManager])
    function getStageClass(stage: string) {
      switch (stage.toLowerCase()) {
        case "requesttohire":
          return "stage-pill request-to-hire";

        case "pipeliningsourcing":
          return "stage-pill sourcing";

        case "jobposting":
          return "stage-pill job-posting";

        case "interview":
          return "stage-pill interview";
          
        case "sparkhire":
          return "stage-pill spark-hire";
          
        case "offeredhired":
          return "stage-pill stage-offer";

        default:
          return "stage-pill";
      }
    }
    
    
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
          View all requisitions &#8594;
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
                {haveAllAccess && <th scope="col">Recruiter</th>}
                {haveAllAccess && <th scope="col">Hiring Manager</th>}
                <th scope="col">Stage</th>
                <th scope="col">Days Open</th>
                {haveAllAccess && <th scope="col">SLA Status</th>}
                <th scope="col">Priority</th>
              </tr>
            </thead>

            <tbody>
              {displayedRequisitions.map((requisition) => (
                <tr key={requisition.id}>
                  <td className="role-cell">{requisition.roleName}</td>
                  <td>{formatValue(requisition.department)}</td>
                  { haveAllAccess && <td>{requisition.recruiter}</td> }
                  {haveAllAccess && <td>{requisition.hiringManager}</td>}
                  <td>
                      <span className={getStageClass(requisition.currentStage)}>
                      {formatValue(requisition.currentStage)}
                      </span>
                  </td>
                  <td>{requisition.daysOpen}</td>
                  {haveAllAccess && <td>
                    <span className={getSlaStatusClass(requisition.slaState)}>
                      {formatValue(requisition.slaState)}
                    </span>
                  </td>}
                  <td>
                    <span
                      className={`priority-pill ${requisition.priority.toLowerCase()}`}
                    >
                      {formatValue(requisition.priority)}
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

/* ================================================================
   METRICS
   ================================================================ */

type SummaryTone = "neutral" | "success" | "warning" | "danger";

type Metric = {
  label: string;
  value: number | string;
  valueSuffix?: string;
  detail: string;
  tone: SummaryTone;
  href: string;
  icon: MetricIconName;
  trend?: string;
  trendTone?: "positive" | "negative" | "neutral";
  trendDirection?: "up" | "down" | "neutral";
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
        "/requisitions?openOnly=true",
        "briefcase",
      ),

      metric(
        "Feedback actions",
        dashboard.actions.totalOpenActions,
        `${dashboard.actions.overdueActions} overdue`,
        dashboard.actions.overdueActions > 0 ? "warning" : "success",
        "/alerts",
        "check",
      ),

      metric(
        "Open bottlenecks",
        dashboard.bottlenecks.totalOpenBottlenecks,
        `${dashboard.bottlenecks.escalatedBottlenecks} escalated`,
        dashboard.bottlenecks.escalatedBottlenecks > 0 ? "danger" : "warning",
        "/alerts?type=OpenBottleneck",
        "alert",
      ),

      metric(
        "Near SLA breach",
        dashboard.risk.rolesNearSlaBreach,
        `${dashboard.risk.overdueRoles} overdue`,
        dashboard.risk.overdueRoles > 0 ? "danger" : "warning",
        "/requisitions?nearSlaBreach=true",
        "clock",
      ),
    ];
  }

  /*
   * Leadership cards intentionally follow the reference image:
   *
   * Open Requisitions
   * Filled Requisitions
   * Avg. Time to Fill
   * SLA Compliance
   */
  if (hasAnyRole(user, [appRoles.leadership])) {
    return [
      metric(
        "Open Requisitions",
        dashboard.recruitmentOverview.totalOpenRoles,
        `${dashboard.recruitmentOverview.outstandingGoals} positions remaining`,
        "success",
        "/requisitions?openOnly=true",
        "briefcase",
        "12% vs last week",
        "positive",
        "up",
      ),

      metric(
        "Filled Requisitions",
        dashboard.pipeline.rolesFilled,
        `${dashboard.recruitmentOverview.goalsFilled} hiring goals met`,
        "success",
        "/requisitions?status=Closed",
        "check",
        "0% vs last week",
        "neutral",
        "neutral",
      ),

      metric(
        "Avg. Time to Fill",
        dashboard.timeToFill.averageTimeToFill,
        "",
        "success",
        "/analytics",
        "clock",
        "8% vs last week",
        "positive",
        "down",
        "days",
      ),

      metric(
        "SLA Compliance",
        `${dashboard.slaCompliance.complianceRate}%`,
        "On track",
        dashboard.slaCompliance.complianceRate >= 80 ? "success" : "warning",
        "/analytics",
        "shield",
        "5% vs last week",
        "positive",
        "up",
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
        "/requisitions?openOnly=true",
        "briefcase",
      ),

      metric(
        "SLA compliance",
        `${dashboard.slaCompliance.complianceRate}%`,
        `${dashboard.slaCompliance.rolesBreachingSla} breaching`,
        dashboard.slaCompliance.rolesBreachingSla > 0 ? "danger" : "success",
        "/requisitions?overdueOnly=true",
        "shield",
      ),

      metric(
        "Escalated bottlenecks",
        dashboard.bottlenecks.escalatedBottlenecks,
        `${dashboard.bottlenecks.highRiskBottlenecks} high risk`,
        dashboard.bottlenecks.escalatedBottlenecks > 0 ? "danger" : "success",
        "/alerts",
        "alert",
      ),

      metric(
        "Overdue actions",
        dashboard.actions.overdueActions,
        `${dashboard.actions.highPriorityActions} high priority`,
        dashboard.actions.overdueActions > 0 ? "warning" : "success",
        "/alerts?type=OverdueAction",
        "clock",
      ),
    ];
  }

  return [
    metric(
      "My open requisitions",
      dashboard.recruitmentOverview.totalOpenRoles,
      `${dashboard.recruitmentOverview.outstandingGoals} positions remaining`,
      "success",
      "/requisitions?openOnly=true",
      "briefcase",
    ),

    metric(
      "Filled requisitions",
      dashboard.pipeline.rolesFilled,
      `${dashboard.recruitmentOverview.goalsFilled} hiring goals met`,
      "success",
      "/requisitions?status=Closed",
      "check",
    ),

    metric(
      "Overdue actions",
      dashboard.actions.overdueActions,
      `${dashboard.actions.totalOpenActions} open actions`,
      dashboard.actions.overdueActions > 0 ? "warning" : "success",
      "/alerts?type=OverdueAction",
      "clock",
    ),

    metric(
      "Open bottlenecks",
      dashboard.bottlenecks.totalOpenBottlenecks,
      `${dashboard.bottlenecks.escalatedBottlenecks} escalated`,
      dashboard.bottlenecks.escalatedBottlenecks > 0 ? "danger" : "success",
      "/alerts?type=OpenBottleneck",
      "alert",
    ),
  ];
}

function metric(
  label: string,
  value: number | string,
  detail: string,
  tone: SummaryTone,
  href: string,
  icon: MetricIconName,
  trend?: string,
  trendTone?: "positive" | "negative" | "neutral",
  trendDirection?: "up" | "down" | "neutral",
  valueSuffix?: string,
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
    trendDirection,
    valueSuffix,
  };
}

/* ================================================================
   ATTENTION
   ================================================================ */

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
        "check",
      ),

      metric(
        "Overdue actions",
        dashboard.actions.overdueActions,
        "",
        "danger",
        "/alerts",
        "alert",
      ),

      metric(
        "Open bottlenecks",
        dashboard.bottlenecks.totalOpenBottlenecks,
        "",
        "warning",
        "/alerts?overdueOnly=true",
        "alert",
      ),

      metric(
        "Stalled requisitions",
        dashboard.risk.stalledRequisitions,
        "",
        "danger",
        "/requisitions?overdueOnly=true",
        "clock",
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
        "alert",
      ),

      metric(
        "Near SLA breach",
        dashboard.risk.rolesNearSlaBreach,
        "",
        "warning",
        "/requisitions?nearSlaBreach=true",
        "clock",
      ),

      metric(
        "Escalated bottlenecks",
        dashboard.bottlenecks.escalatedBottlenecks,
        "",
        "danger",
        "/alerts",
        "alert",
      ),

      metric(
        "High priority actions",
        dashboard.actions.highPriorityActions,
        "",
        "warning",
        "/alerts",
        "clock",
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
      "alert",
    ),

    metric(
      "Near SLA breach",
      dashboard.risk.rolesNearSlaBreach,
      "",
      "warning",
      "/requisitions?nearSlaBreach=true",
      "clock",
    ),

    metric(
      "Stalled requisitions",
      dashboard.risk.stalledRequisitions,
      "",
      "neutral",
      "/requisitions?overdueOnly=true",
      "alert",
    ),

    metric(
      "Open bottlenecks",
      dashboard.bottlenecks.totalOpenBottlenecks,
      "",
      "neutral",
      "/alerts",
      "alert",
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

function getAttentionColor(value: number) {
  const num = Number(value);
  if (num === 0) return "low";
  return "high";
}

/* ================================================================
   HELPERS
   ================================================================ */

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
    "Job Posting": "JobPosting",
    "Sourcing": "PipeliningSourcing",
    "Spark Hire": "SparkHire",
    Interview: "Interview",
    "Request-to-Hire": "RequestToHire",
    "Hired": "OfferedHired",
  };

  return stageFilters[stage]
    ? `/requisitions?stage=${stageFilters[stage]}`
    : "/requisitions";
}
