import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/feedback/StateMessage";
import { AppLayout } from "../components/layout/AppLayout";
import { PageContainer } from "../components/layout/PageContainer";
import {
  getHiringTrends,
  getLeadershipSummary,
  getReportRequisitions,
  getSourceAnalytics,
} from "../features/analytics/analyticsApi";
import type {
  HiringTrendResponse,
  LeadershipRiskSummary,
  LeadershipSummary,
  SourceMetric,
  SourceAnalytics,
} from "../features/analytics/analyticsTypes";
import { canViewLeadershipAnalytics } from "../features/auth/roleAccess";
import { useAuth } from "../features/auth/authContext";
import {
  formatValue,
  pipelineStages,
} from "../features/requisitions/requisitionDisplay";
import type { Requisition } from "../features/requisitions/requisitionTypes";
import "../styles/Analytics.css";
import { Briefcase, CheckCircle2, Clock, Icon, ShieldCheck, type LucideIcon } from "lucide-react";

export function AnalyticsPage() {
  const { user } = useAuth();
  const [leadership, setLeadership] = useState<LeadershipSummary | null>(null);
  const [sources, setSources] = useState<SourceAnalytics | null>(null);
  const [trends, setTrends] = useState<HiringTrendResponse | null>(null);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [fromDate, setFromDate] = useState(() => getDefaultFromDate());
  const [toDate, setToDate] = useState(() => getDefaultToDate());
  const [debouncedFromDate, setDebouncedFromDate] = useState(fromDate);
  const [debouncedToDate, setDebouncedToDate] = useState(toDate);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const showLeadershipAnalytics = canViewLeadershipAnalytics(user);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedFromDate(fromDate);
      setDebouncedToDate(toDate);
    }, 400);

    return () => window.clearTimeout(handle);
  }, [fromDate, toDate]);

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      setIsLoading(true);
      setError("");

      try {
        const range = { from: debouncedFromDate, to: debouncedToDate };
        const [leadershipData, sourceData, trendData, requisitionData] =
          await Promise.all([
            showLeadershipAnalytics
              ? getLeadershipSummary(range)
              : Promise.resolve<LeadershipSummary | null>(null),
            getSourceAnalytics(range),
            getHiringTrends(range),
            getReportRequisitions(range),
          ]);

        if (!isMounted) {
          return;
        }

        setLeadership(leadershipData);
        setSources(sourceData);
        setTrends(trendData);
        setRequisitions(requisitionData);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Analytics could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [showLeadershipAnalytics, debouncedFromDate, debouncedToDate]);
  const hasDateFilter = Boolean(fromDate || toDate);
  const summaryMetrics = getSummaryMetrics(requisitions, leadership, hasDateFilter);
  const riskSummary = getRiskSummary(requisitions, leadership);
  const timeToFillBreakdowns = getTimeToFillBreakdowns(requisitions);
  const recruiterPerformance = getRecruiterPerformance(requisitions);
  const stageDistribution = getStageDistribution(requisitions);

  return (
    <AppLayout title="Analytics">
      <PageContainer>
        {isLoading && <LoadingState message="Loading analytics" />}

        {!isLoading && error && (
          <ErrorState title="Analytics unavailable" message={error} />
        )}

        {!isLoading && sources && trends && (
          <div className="analytics-page">

            <section
              className="analytics-filter-panel"
              aria-label="Analytics reporting period"
            >
              <div className="analytics-filter-copy">
                <span className="analytics-filter-eyebrow">
                  Reporting period
                </span>

                <strong>Analyse hiring performance by date range</strong>
              </div>

              <div className="analytics-filter-controls">
                <div className="analytics-date-controls">
                  <label>
                    <span>From</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                    />
                  </label>

                  <label>
                    <span>To</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                    />
                  </label>
                </div>

                {hasDateFilter && (
                  <div className="analytics-filter-actions">
                    <button
                      className="secondary-filter-action"
                      type="button"
                      onClick={handleClearDateFilter}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="metric-grid" aria-label="Executive KPIs">
              {summaryMetrics.map((metric) => (
                <Metric
                  label={metric.label}
                  tone={metric.tone}
                  value={metric.value}
                  detail={metric.detail}
                  icon={metric.icon}
                  key={metric.label}
                />
              ))}
            </section>

            <section className="dashboard-grid">
              <article className="analytics-card">
                <div className="panel-heading analytics-panel-heading">
                  <div>
                    <span className="panel-eyebrow">Acquisition</span>
                    <h2>Source performance</h2>
                  </div>
                </div>

                <SourcePerformanceChart sources={sources?.sources ?? []} />
              </article>

              <article className="analytics-card">
                <div className="panel-heading analytics-panel-heading">
                  <div>
                    <span className="panel-eyebrow">Operational health</span>
                    <h2>Hiring risk</h2>
                  </div>
                </div>

                <dl className="summary-list status-summary-list">
                  <Link
                    className="summary-warning"
                    to="/requisitions?openOnly=true&nearSlaBreach=true"
                  >
                    <dt>At risk</dt>
                    <dd>{riskSummary.totalAtRiskRequisitions}</dd>
                  </Link>

                  <Link
                    className="summary-danger"
                    to="/alerts?severity=Critical"
                  >
                    <dt>Critical</dt>
                    <dd>{riskSummary.criticalRiskRoles}</dd>
                  </Link>

                  <Link
                    className="summary-danger"
                    to="/requisitions?openOnly=true&overdueOnly=true"
                  >
                    <dt>Breaching SLA</dt>
                    <dd>{riskSummary.rolesBreachingSla}</dd>
                  </Link>

                  <Link
                    className="summary-warning"
                    to="/alerts?type=OpenBottleneck"
                  >
                    <dt>Open bottlenecks</dt>
                    <dd>{riskSummary.openBottlenecks}</dd>
                  </Link>
                </dl>
              </article>
            </section>

            <section className="dashboard-grid">
              <article className="analytics-card">
                <div className="panel-heading analytics-panel-heading">
                  <div>
                    <span className="panel-eyebrow">Trend</span>
                    <h2>Hiring movement</h2>
                  </div>
                </div>

                <HiringMovementChart trends={trends?.monthlyTrends ?? []} />
              </article>

              <article className="analytics-card">
                <div className="panel-heading analytics-panel-heading">
                  <div>
                    <span className="panel-eyebrow">Pipeline</span>
                    <h2>Pipeline stage distribution</h2>
                  </div>
                </div>

                <PipelineStageChart stages={stageDistribution} />
              </article>
            </section>

            <section className="dashboard-grid">
              <article className="analytics-card">
                <div className="panel-heading analytics-panel-heading">
                  <div>
                    <span className="panel-eyebrow">Efficiency</span>
                    <h2>Time to fill breakdowns</h2>
                  </div>
                </div>

                <div className="breakdown-grid">
                  <BreakdownList
                    title="Recruiter"
                    items={timeToFillBreakdowns.byRecruiter}
                  />

                  <BreakdownList
                    title="Team"
                    items={timeToFillBreakdowns.byDepartment}
                  />

                  <BreakdownList
                    title="Priority"
                    items={timeToFillBreakdowns.byPriority}
                  />
                </div>
              </article>

              <article className="analytics-card">
                <div className="panel-heading analytics-panel-heading">
                  <div>
                    <span className="panel-eyebrow">Performance</span>
                    <h2>Recruiter performance</h2>
                  </div>
                </div>

                <div className="recruiter-performance-table">
                  <div className="recruiter-performance-row table-head">
                    <span>Recruiter</span>
                    <span>Open reqs</span>
                    <span>Avg. TTF</span>
                    <span>SLA</span>
                    <span>Risk</span>
                    <span>Blocked</span>
                    <span>Overdue</span>
                  </div>

                  {recruiterPerformance.map((recruiter) => (
                    <article
                      className="recruiter-performance-row"
                      key={recruiter.name}
                    >
                      <div>
                        <strong>{recruiter.name}</strong>
                      </div>

                      <strong>{recruiter.activeRequisitions}</strong>
                      <strong>{recruiter.averageTimeToFill}d</strong>
                      <strong>{recruiter.slaBreaches}</strong>
                      <strong>{recruiter.riskCount}</strong>
                      <strong>{recruiter.openBottlenecks}</strong>
                      <strong>{recruiter.overdueActions}</strong>
                    </article>
                  ))}
                </div>
              </article>
            </section>

            {leadership && (
              <section className="dashboard-grid dashboard-grid-single">
                <article className="analytics-card">
                  <div className="panel-heading analytics-panel-heading">
                    <div>
                      <span className="panel-eyebrow">Leadership</span>
                      <h2>Executive notes</h2>
                    </div>
                  </div>

                  <div className="stack-list">
                    {leadership.insights.slice(0, 5).map((insight) => (
                      <article className="detail-card" key={insight.code}>
                        <strong
                          className={`insight-severity severity-${insight.severity.toLowerCase()}`}
                        >
                          {formatValue(insight.severity)}
                        </strong>

                        <p>{insight.message}</p>
                      </article>
                    ))}
                  </div>
                </article>
              </section>
            )}
          </div>
        )}
      </PageContainer>
    </AppLayout>
  );

  function handleClearDateFilter() {
    setFromDate("");
    setToDate("");
  }
}

function HiringMovementChart({
  trends,
}: {
  trends: HiringTrendResponse["monthlyTrends"];
}) {
  const maxValue = Math.max(
    1,
    ...trends.flatMap((trend) => [trend.rolesOpened, trend.rolesFilled]),
  );

  if (trends.length === 0) {
    return <p className="chart-empty">No hiring movement for this period</p>;
  }

  return (
    <div
      className="movement-chart"
      role="img"
      aria-label="Monthly opened and filled requisitions"
    >
      <div className="movement-chart-bars">
        {trends.map((trend) => (
          <div className="movement-chart-group" key={trend.month}>
            <div className="movement-bars">
              <span
                className="movement-bar movement-bar-opened"
                style={{
                  height: `${getChartHeight(trend.rolesOpened, maxValue)}%`,
                }}
                title={`${trend.rolesOpened} opened`}
              >
                <span className="movement-bar-value">{trend.rolesOpened}</span>
              </span>

              <span
                className="movement-bar movement-bar-filled"
                style={{
                  height: `${getChartHeight(trend.rolesFilled, maxValue)}%`,
                }}
                title={`${trend.rolesFilled} filled`}
              >
                <span className="movement-bar-value">{trend.rolesFilled}</span>
              </span>
            </div>

            <strong>{formatMonthLabel(trend.month)}</strong>
          </div>
        ))}
      </div>

      <div className="chart-legend">
        <span className="legend-opened">Opened</span>
        <span className="legend-filled">Filled</span>
      </div>
    </div>
  );
}

function PipelineStageChart({ stages }: { stages: StageDistributionMetric[] }) {
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);
  const maxValue = Math.max(1, ...stages.map((stage) => stage.count));
  if (total === 0) {
    return <p className="chart-empty">No requisitions in this period</p>;
  }

  return (
    <div
      className="horizontal-chart"
      role="img"
      aria-label="Requisitions by pipeline stage"
    >
      {stages.map((stage) => (
        <div className="horizontal-chart-row" key={stage.stage}>
          <div>
            <span>{formatValue(stage.stage)}</span>
            <strong>{stage.count}</strong>
          </div>

          <div className="horizontal-chart-track">
            <span
              style={{
                width: `${percentage(stage.count, maxValue)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SourcePerformanceChart({ sources }: { sources: SourceMetric[] }) {
  const maxValue = Math.max(1, ...sources.map((source) => source.activities));

  if (sources.length === 0) {
    return <p className="chart-empty">No source activity for this period</p>;
  }

  return (
    <div
      className="source-chart"
      role="img"
      aria-label="Candidates and hires by source"
    >
      {sources.map((source) => (
        <div className="source-chart-row" key={source.source}>
          <div className="source-chart-label">
            <strong>{formatValue(source.source)}</strong>
            <span>{source.sourceToHireConversionRate}% conversion</span>
          </div>

          <div className="source-chart-bars">
            <div>
              <span
                style={{
                  width: `${percentage(source.activities, maxValue)}%`,
                }}
              />
            </div>

            <div>
              <span
                style={{
                  width: `${percentage(source.hires, maxValue)}%`,
                }}
              />
            </div>
          </div>

          <div className="source-chart-values">
            <span>{source.activities}</span>
            <span>{source.hires}</span>
          </div>
        </div>
      ))}

      <div className="chart-legend">
        <span className="legend-opened">Candidates</span>
        <span className="legend-filled">Hires</span>
      </div>
    </div>
  );
}

function Metric({
  label,
  tone,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  tone: MetricTone;
  value: number | string;
  detail?: string;
  icon: LucideIcon
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <span className="metric-icon" aria-hidden="true">
        <Icon size={18} />
      </span>

      <span className="metric-card-content">
        <span className="metric-label">{label}</span>
        <strong className="metric-value">{value}</strong>
        {detail && <span className="metric-detail">{detail}</span>}
      </span>
    </article>
  );
}

type MetricTone = "neutral" | "brand" | "success" | "warning" | "danger";

function BreakdownList({
  items,
  title,
}: {
  items: BreakdownMetric[];
  title: string;
}) {
  return (
    <article className="breakdown-card">
      <h3>{title}</h3>

      {items.length === 0 ? (
        <p>No filled requisitions</p>
      ) : (
        <div>
          {items.map((item) => (
            <div className="breakdown-row" key={item.name}>
              <span>{item.name}</span>
              <strong>{item.averageTimeToFill}d</strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

type BreakdownMetric = {
  name: string;
  averageTimeToFill: number;
};

type RecruiterPerformanceMetric = {
  name: string;
  activeRequisitions: number;
  averageTimeToFill: number;
  slaBreaches: number;
  riskCount: number;
  openBottlenecks: number;
  overdueActions: number;
};

type StageDistributionMetric = {
  stage: string;
  count: number;
};

function getStageDistribution(
  requisitions: Requisition[],
): StageDistributionMetric[] {
  const counts = new Map(pipelineStages.map((stage) => [stage, 0]));

  for (const requisition of requisitions.filter((item) => !isClosed(item))) {
    counts.set(
      requisition.currentStage,
      (counts.get(requisition.currentStage) ?? 0) + 1,
    );
  }

  return pipelineStages.map((stage) => ({
    stage,
    count: counts.get(stage) ?? 0,
  }));
}

function getRiskSummary(
  requisitions: Requisition[],
  leadership: LeadershipSummary | null,
): LeadershipRiskSummary {
  if (leadership) {
    return leadership.riskSummary;
  }

  const active = requisitions.filter((requisition) => !isClosed(requisition));

  return {
    totalAtRiskRequisitions: active.filter(isAtRisk).length,

    highRiskRoles: active.filter(
      (requisition) => requisition.priority === "High",
    ).length,

    criticalRiskRoles: active.filter(
      (requisition) =>
        requisition.slaState === "Breached" ||
        requisition.bottlenecks.some(
          (bottleneck) =>
            bottleneck.status !== "Resolved" && bottleneck.daysOpen >= 14,
        ) ||
        requisition.actionItems.some((action) => action.daysOverdue >= 7),
    ).length,

    averageRiskScore: 0,

    rolesBreachingSla: active.filter(
      (requisition) => requisition.slaState === "Breached",
    ).length,

    stalledRequisitions: active.filter((requisition) => requisition.isStalled)
      .length,

    openBottlenecks: active.reduce(
      (total, requisition) =>
        total +
        requisition.bottlenecks.filter(
          (bottleneck) => bottleneck.status !== "Resolved",
        ).length,
      0,
    ),

    escalationsRequired: active.reduce(
      (total, requisition) =>
        total +
        requisition.actionItems.filter((action) => action.daysOverdue > 0)
          .length,
      0,
    ),
  };
}

function getSummaryMetrics(
  requisitions: Requisition[],
  leadership: LeadershipSummary | null,
  hasDateFilter: boolean,
) {
  if (requisitions.length === 0 && leadership && !hasDateFilter) {
    return [
      {
        label: "Open requisitions",
        value: leadership.executiveKpis.totalOpenRoles,
        tone: "brand" as const,
        icon: Briefcase,
        detail: "Active across all teams"
      },
      {
        label: "Filled",
        value: leadership.executiveKpis.totalFilledPositions,
        tone: "success" as const,
        icon: CheckCircle2,
        detail: "Position closed with a hire"
      },
      {
        label: "Avg. time to fill",
        value: `${leadership.executiveKpis.averageTimeToFill}d`,
        tone: getTimeToFillTone(leadership.executiveKpis.averageTimeToFill),
        icon: Clock,
        detail: "From opening to close"
      },
      {
        label: "SLA",
        value: `${leadership.executiveKpis.slaComplianceRate}%`,
        tone: getSlaTone(leadership.executiveKpis.slaComplianceRate),
        icon: ShieldCheck,
        detail: "Requisition with SLA target"
      },
    ];
  }

  const active = requisitions.filter((requisition) => !isClosed(requisition));
  const closed = requisitions.filter((requisition) => isClosed(requisition));
  const withinSla = active.filter(
    (requisition) =>
      requisition.slaState === "OnTrack" || requisition.slaState === "Closed",
  ).length;
  const averageFilledTimeToFill = averageTimeToFill(closed);
  const slaCompliance = percentage(withinSla, active.length);

  return [
    {
      label: "Open requisitions",
      value: active.length,
      tone: "brand" as const,
      icon: Briefcase,
      detail: `${closed.length} closed this period`
    },
    {
      label: "Filled",
      value: requisitions.reduce(
        (total, requisition) => total + requisition.filledGoal,
        0,
      ),
      tone: "success" as const,
      icon: CheckCircle2,
      detail: `Across ${requisitions.length} requisitions`
    },
    {
      label: "Avg. time to fill",
      value: `${averageFilledTimeToFill}d`,
      tone: getTimeToFillTone(averageFilledTimeToFill),
      icon: Clock,
      detail: `Based on ${closed.length} closed roles`
    },
    {
      label: "SLA",
      value: `${slaCompliance}%`,
      tone: getSlaTone(slaCompliance),
      icon: ShieldCheck,
      detail: `${withinSla} of ${active.length} on track`
    },
  ];
}

function getSlaTone(value: number): MetricTone {
  if (value >= 80) {
    return "success";
  }

  if (value >= 60) {
    return "warning";
  }

  return "danger";
}

function getTimeToFillTone(value: number): MetricTone {
  if (value <= 30) {
    return "success";
  }

  if (value <= 45) {
    return "warning";
  }

  return "danger";
}

function getTimeToFillBreakdowns(requisitions: Requisition[]) {
  const closed = requisitions.filter((requisition) => isClosed(requisition));

  return {
    byRecruiter: groupAverageTimeToFill(
      closed,
      (requisition) => requisition.recruiter,
    ),

    byDepartment: groupAverageTimeToFill(closed, (requisition) =>
      formatValue(requisition.department),
    ),

    byPriority: groupAverageTimeToFill(closed, (requisition) =>
      formatValue(requisition.priority),
    ),
  };
}

function getRecruiterPerformance(
  requisitions: Requisition[],
): RecruiterPerformanceMetric[] {
  return groupBy(requisitions, (requisition) => requisition.recruiter)
    .map(([name, items]) => {
      const active = items.filter((requisition) => !isClosed(requisition));

      return {
        name,
        activeRequisitions: active.length,

        averageTimeToFill: averageTimeToFill(
          items.filter((requisition) => isClosed(requisition)),
        ),

        slaBreaches: active.filter(
          (requisition) => requisition.slaState === "Breached",
        ).length,

        riskCount: active.filter(isAtRisk).length,

        openBottlenecks: active.reduce(
          (total, requisition) =>
            total +
            requisition.bottlenecks.filter(
              (bottleneck) => bottleneck.status !== "Resolved",
            ).length,
          0,
        ),

        overdueActions: active.reduce(
          (total, requisition) =>
            total +
            requisition.actionItems.filter((action) => action.daysOverdue > 0)
              .length,
          0,
        ),
      };
    })
    .sort(
      (first, second) =>
        second.riskCount - first.riskCount ||
        first.name.localeCompare(second.name),
    );
}

function groupAverageTimeToFill(
  requisitions: Requisition[],
  selector: (requisition: Requisition) => string,
): BreakdownMetric[] {
  return groupBy(requisitions, selector)
    .map(([name, items]) => ({
      name,
      averageTimeToFill: averageTimeToFill(items),
    }))
    .sort(
      (first, second) =>
        second.averageTimeToFill - first.averageTimeToFill ||
        first.name.localeCompare(second.name),
    );
}

function groupBy<T>(
  items: T[],
  selector: (item: T) => string,
): [string, T[]][] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = selector(item) || "Unassigned";

    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()];
}

function isClosed(requisition: Requisition) {
  return (
    Boolean(requisition.closedDate) || requisition.currentStatus === "Closed"
  );
}

function isAtRisk(requisition: Requisition) {
  return (
    requisition.slaState === "Breached" ||
    requisition.slaState === "Warning" ||
    requisition.isStalled ||
    requisition.bottlenecks.some(
      (bottleneck) => bottleneck.status !== "Resolved",
    )
  );
}

function averageTimeToFill(requisitions: Requisition[]) {
  const values = requisitions
    .map((requisition) =>
      daysBetween(requisition.dateOpened, requisition.closedDate),
    )
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return 0;
  }

  return (
    Math.round(
      (values.reduce((total, value) => total + value, 0) / values.length) * 10,
    ) / 10
  );
}

function daysBetween(start: string, end: string | null | undefined) {
  if (!end) {
    return null;
  }

  const milliseconds = new Date(end).getTime() - new Date(start).getTime();

  return Math.max(0, Math.round(milliseconds / 86_400_000));
}

function percentage(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((value / total) * 1000) / 10;
}

function getChartHeight(value: number, total: number) {
  if (value === 0) {
    return 4;
  }

  return Math.max(12, percentage(value, total));
}

function getDefaultToDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultFromDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return date.toISOString().slice(0, 10);
}

function formatMonthLabel(month: string) {
  const [year, monthValue] = month.split("-");

  const date = new Date(Number(year), Number(monthValue) - 1, 1);

  return date.toLocaleString("en", {
    month: "short",
  });
}
