import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StateMessage'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { getHiringTrends, getLeadershipSummary, getReportRequisitions, getSourceAnalytics } from '../features/analytics/analyticsApi'
import type {
  HiringTrendResponse,
  LeadershipRiskSummary,
  LeadershipSummary,
  SourceMetric,
  SourceAnalytics,
} from '../features/analytics/analyticsTypes'
import { canViewLeadershipAnalytics } from '../features/auth/roleAccess'
import { useAuth } from '../features/auth/authContext'
import { formatValue, pipelineStages } from '../features/requisitions/requisitionDisplay'
import type { Requisition } from '../features/requisitions/requisitionTypes'

const defaultDateRange = getDefaultDateRange()

export function AnalyticsPage() {
  const { user } = useAuth()
  const [leadership, setLeadership] = useState<LeadershipSummary | null>(null)
  const [sources, setSources] = useState<SourceAnalytics | null>(null)
  const [trends, setTrends] = useState<HiringTrendResponse | null>(null)
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [fromDate, setFromDate] = useState(defaultDateRange.fromDate)
  const [toDate, setToDate] = useState(defaultDateRange.toDate)
  const [draftFromDate, setDraftFromDate] = useState(defaultDateRange.fromDate)
  const [draftToDate, setDraftToDate] = useState(defaultDateRange.toDate)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const showLeadershipAnalytics = canViewLeadershipAnalytics(user)

  useEffect(() => {
    let isMounted = true

    async function loadAnalytics() {
      setIsLoading(true)
      setError('')

      try {
        const [leadershipData, sourceData, trendData, requisitionData] = await Promise.all([
          showLeadershipAnalytics ? getLeadershipSummary() : Promise.resolve<LeadershipSummary | null>(null),
          getSourceAnalytics(),
          getHiringTrends(),
          getReportRequisitions(),
        ])

        if (!isMounted) {
          return
        }

        setLeadership(leadershipData)
        setSources(sourceData)
        setTrends(trendData)
        setRequisitions(requisitionData)
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Analytics could not be loaded.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadAnalytics()

    return () => {
      isMounted = false
    }
  }, [showLeadershipAnalytics])

  const filteredRequisitions = requisitions.filter((requisition) => requisitionMatchesDateRange(requisition, fromDate, toDate))
  const filteredSourceMetrics = sources ? getFilteredSourceMetrics(sources, fromDate, toDate) : []
  const filteredHiringTrends = trends?.monthlyTrends.filter((trend) => monthMatchesDateRange(trend.month, fromDate, toDate)) ?? []
  const summaryMetrics = getSummaryMetrics(filteredRequisitions, leadership, Boolean(fromDate || toDate))
  const riskSummary = getRiskSummary(filteredRequisitions, leadership)
  const timeToFillBreakdowns = getTimeToFillBreakdowns(filteredRequisitions)
  const recruiterPerformance = getRecruiterPerformance(filteredRequisitions)
  const stageDistribution = getStageDistribution(filteredRequisitions)

  return (
    <AppLayout title="Analytics">
      <PageContainer>
        {isLoading && <LoadingState message="Loading analytics" />}
        {!isLoading && error && <ErrorState title="Analytics unavailable" message={error} />}
        {!isLoading && sources && trends && (
          <>
            <form className="analytics-filter-panel" aria-label="Analytics reporting period" onSubmit={handleApplyDateFilter}>
              <div className="analytics-date-controls">
                <label>
                  From
                  <input type="date" value={draftFromDate} onChange={(event) => setDraftFromDate(event.target.value)} />
                </label>
                <label>
                  To
                  <input type="date" value={draftToDate} onChange={(event) => setDraftToDate(event.target.value)} />
                </label>
              </div>

              <div className="analytics-filter-actions">
                <button type="submit">Filter</button>
                <button className="secondary-filter-action" type="button" onClick={handleClearDateFilter}>
                  Clear
                </button>
              </div>
            </form>

            <section className="metric-grid" aria-label="Executive KPIs">
              {summaryMetrics.map((metric) => (
                <Metric label={metric.label} tone={metric.tone} value={metric.value} key={metric.label} />
              ))}
            </section>

            <section className="dashboard-grid">
              <article className="panel">
                <div className="panel-heading analytics-panel-heading">
                  <h2>Source performance</h2>
                </div>
                <SourcePerformanceChart sources={filteredSourceMetrics} />
              </article>

              <article className="panel">
                <div className="panel-heading analytics-panel-heading">
                  <h2>Hiring risk</h2>
                </div>
                <dl className="summary-list status-summary-list">
                  <Link className="summary-warning" to="/requisitions?openOnly=true&nearSlaBreach=true">
                    <dt>At risk</dt>
                    <dd>{riskSummary.totalAtRiskRequisitions}</dd>
                  </Link>
                  <Link className="summary-danger" to="/alerts?severity=Critical">
                    <dt>Critical</dt>
                    <dd>{riskSummary.criticalRiskRoles}</dd>
                  </Link>
                  <Link className="summary-danger" to="/requisitions?openOnly=true&overdueOnly=true">
                    <dt>Breaching SLA</dt>
                    <dd>{riskSummary.rolesBreachingSla}</dd>
                  </Link>
                  <Link className="summary-warning" to="/alerts?type=OpenBottleneck">
                    <dt>Open bottlenecks</dt>
                    <dd>{riskSummary.openBottlenecks}</dd>
                  </Link>
                </dl>
              </article>
            </section>

            <section className="dashboard-grid">
              <article className="panel">
                <div className="panel-heading analytics-panel-heading">
                  <h2>Hiring movement</h2>
                </div>
                <HiringMovementChart trends={filteredHiringTrends} />
              </article>

              <article className="panel">
                <div className="panel-heading analytics-panel-heading">
                  <h2>Pipeline stage distribution</h2>
                </div>
                <PipelineStageChart stages={stageDistribution} />
              </article>
            </section>

            <section className="dashboard-grid">
              <article className="panel">
                <div className="panel-heading analytics-panel-heading">
                  <h2>Time to fill breakdowns</h2>
                </div>
                <div className="breakdown-grid">
                  <BreakdownList title="Recruiter" items={timeToFillBreakdowns.byRecruiter} />
                  <BreakdownList title="Team" items={timeToFillBreakdowns.byDepartment} />
                  <BreakdownList title="Priority" items={timeToFillBreakdowns.byPriority} />
                </div>
              </article>

              <article className="panel">
                <div className="panel-heading analytics-panel-heading">
                  <h2>Recruiter performance</h2>
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
                    <article className="recruiter-performance-row" key={recruiter.name}>
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
                <article className="panel">
                  <div className="panel-heading analytics-panel-heading">
                    <h2>Executive notes</h2>
                  </div>
                  <div className="stack-list">
                    {leadership.insights.slice(0, 5).map((insight) => (
                      <article className="detail-card" key={insight.code}>
                        <strong>{formatValue(insight.severity)}</strong>
                        <p>{insight.message}</p>
                      </article>
                    ))}
                  </div>
                </article>
              </section>
            )}
          </>
        )}
      </PageContainer>
    </AppLayout>
  )

  function handleApplyDateFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFromDate(draftFromDate)
    setToDate(draftToDate)
  }

  function handleClearDateFilter() {
    setDraftFromDate(defaultDateRange.fromDate)
    setDraftToDate(defaultDateRange.toDate)
    setFromDate(defaultDateRange.fromDate)
    setToDate(defaultDateRange.toDate)
  }
}

function HiringMovementChart({ trends }: { trends: HiringTrendResponse['monthlyTrends'] }) {
  const maxValue = Math.max(1, ...trends.flatMap((trend) => [trend.rolesOpened, trend.rolesFilled]))

  if (trends.length === 0) {
    return <p className="chart-empty">No hiring movement for this period</p>
  }

  return (
    <div className="movement-chart" role="img" aria-label="Monthly opened and filled requisitions">
      <div className="movement-chart-bars">
        {trends.map((trend) => (
          <div className="movement-chart-group" key={trend.month}>
            <div className="movement-bars">
              <span
                className="movement-bar movement-bar-opened"
                style={{ height: `${getChartHeight(trend.rolesOpened, maxValue)}%` }}
                title={`${trend.rolesOpened} opened`}
              >
                <span className="movement-bar-value">{trend.rolesOpened}</span>
              </span>
              <span
                className="movement-bar movement-bar-filled"
                style={{ height: `${getChartHeight(trend.rolesFilled, maxValue)}%` }}
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
  )
}

function PipelineStageChart({ stages }: { stages: StageDistributionMetric[] }) {
  const total = stages.reduce((sum, stage) => sum + stage.count, 0)
  const maxValue = Math.max(1, ...stages.map((stage) => stage.count))

  if (total === 0) {
    return <p className="chart-empty">No requisitions in this period</p>
  }

  return (
    <div className="horizontal-chart" role="img" aria-label="Requisitions by pipeline stage">
      {stages.map((stage) => (
        <div className="horizontal-chart-row" key={stage.stage}>
          <div>
            <span>{formatValue(stage.stage)}</span>
            <strong>{stage.count}</strong>
          </div>
          <div className="horizontal-chart-track">
            <span style={{ width: `${percentage(stage.count, maxValue)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SourcePerformanceChart({ sources }: { sources: SourceMetric[] }) {
  const maxValue = Math.max(1, ...sources.map((source) => source.activities))

  if (sources.length === 0) {
    return <p className="chart-empty">No source activity for this period</p>
  }

  return (
    <div className="source-chart" role="img" aria-label="Candidates and hires by source">
      {sources.map((source) => (
        <div className="source-chart-row" key={source.source}>
          <div className="source-chart-label">
            <strong>{formatValue(source.source)}</strong>
            <span>{source.sourceToHireConversionRate}% conversion</span>
          </div>
          <div className="source-chart-bars">
            <div>
              <span style={{ width: `${percentage(source.activities, maxValue)}%` }} />
            </div>
            <div>
              <span style={{ width: `${percentage(source.hires, maxValue)}%` }} />
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
  )
}

function Metric({ label, tone, value }: { label: string; tone: MetricTone; value: number | string }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

type MetricTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

function BreakdownList({ items, title }: { items: BreakdownMetric[]; title: string }) {
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
  )
}

type BreakdownMetric = {
  name: string
  averageTimeToFill: number
}

type RecruiterPerformanceMetric = {
  name: string
  activeRequisitions: number
  averageTimeToFill: number
  slaBreaches: number
  riskCount: number
  openBottlenecks: number
  overdueActions: number
}

type StageDistributionMetric = {
  stage: string
  count: number
}

function getStageDistribution(requisitions: Requisition[]): StageDistributionMetric[] {
  const counts = new Map(pipelineStages.map((stage) => [stage, 0]))

  for (const requisition of requisitions.filter((item) => !isClosed(item))) {
    counts.set(requisition.currentStage, (counts.get(requisition.currentStage) ?? 0) + 1)
  }

  return pipelineStages.map((stage) => ({
    stage,
    count: counts.get(stage) ?? 0,
  }))
}

function getRiskSummary(requisitions: Requisition[], leadership: LeadershipSummary | null): LeadershipRiskSummary {
  if (leadership) {
    return leadership.riskSummary
  }

  const active = requisitions.filter((requisition) => !isClosed(requisition))

  return {
    totalAtRiskRequisitions: active.filter(isAtRisk).length,
    highRiskRoles: active.filter((requisition) => requisition.priority === 'High').length,
    criticalRiskRoles: active.filter(
      (requisition) =>
        requisition.slaState === 'Breached' ||
        requisition.bottlenecks.some((bottleneck) => bottleneck.status !== 'Resolved' && bottleneck.daysOpen >= 14) ||
        requisition.actionItems.some((action) => action.daysOverdue >= 7),
    ).length,
    averageRiskScore: 0,
    rolesBreachingSla: active.filter((requisition) => requisition.slaState === 'Breached').length,
    stalledRequisitions: active.filter((requisition) => requisition.isStalled).length,
    openBottlenecks: active.reduce(
      (total, requisition) => total + requisition.bottlenecks.filter((bottleneck) => bottleneck.status !== 'Resolved').length,
      0,
    ),
    escalationsRequired: active.reduce((total, requisition) => total + requisition.actionItems.filter((action) => action.daysOverdue > 0).length, 0),
  }
}

function getSummaryMetrics(requisitions: Requisition[], leadership: LeadershipSummary | null, hasDateFilter: boolean) {
  if (requisitions.length === 0 && leadership && !hasDateFilter) {
    return [
      { label: 'Open requisitions', value: leadership.executiveKpis.totalOpenRoles, tone: 'brand' as const },
      { label: 'Filled', value: leadership.executiveKpis.totalFilledPositions, tone: 'success' as const },
      { label: 'Avg. time to fill', value: `${leadership.executiveKpis.averageTimeToFill}d`, tone: getTimeToFillTone(leadership.executiveKpis.averageTimeToFill) },
      { label: 'SLA', value: `${leadership.executiveKpis.slaComplianceRate}%`, tone: getSlaTone(leadership.executiveKpis.slaComplianceRate) },
    ]
  }

  const active = requisitions.filter((requisition) => !isClosed(requisition))
  const closed = requisitions.filter((requisition) => isClosed(requisition))
  const withinSla = active.filter((requisition) => requisition.slaState === 'OnTrack' || requisition.slaState === 'Closed').length

  return [
    { label: 'Open requisitions', value: active.length, tone: 'brand' as const },
    { label: 'Filled', value: requisitions.reduce((total, requisition) => total + requisition.filledGoal, 0), tone: 'success' as const },
    { label: 'Avg. time to fill', value: `${averageTimeToFill(closed)}d`, tone: getTimeToFillTone(averageTimeToFill(closed)) },
    { label: 'SLA', value: `${percentage(withinSla, active.length)}%`, tone: getSlaTone(percentage(withinSla, active.length)) },
  ]
}

function getSlaTone(value: number): MetricTone {
  if (value >= 80) {
    return 'success'
  }

  if (value >= 60) {
    return 'warning'
  }

  return 'danger'
}

function getTimeToFillTone(value: number): MetricTone {
  if (value <= 30) {
    return 'success'
  }

  if (value <= 45) {
    return 'warning'
  }

  return 'danger'
}

function getTimeToFillBreakdowns(requisitions: Requisition[]) {
  const closed = requisitions.filter((requisition) => isClosed(requisition))

  return {
    byRecruiter: groupAverageTimeToFill(closed, (requisition) => requisition.recruiter),
    byDepartment: groupAverageTimeToFill(closed, (requisition) => formatValue(requisition.department)),
    byPriority: groupAverageTimeToFill(closed, (requisition) => formatValue(requisition.priority)),
  }
}

function getRecruiterPerformance(requisitions: Requisition[]): RecruiterPerformanceMetric[] {
  return groupBy(requisitions, (requisition) => requisition.recruiter)
    .map(([name, items]) => {
      const active = items.filter((requisition) => !isClosed(requisition))

      return {
        name,
        activeRequisitions: active.length,
        averageTimeToFill: averageTimeToFill(items.filter((requisition) => isClosed(requisition))),
        slaBreaches: active.filter((requisition) => requisition.slaState === 'Breached').length,
        riskCount: active.filter(isAtRisk).length,
        openBottlenecks: active.reduce(
          (total, requisition) => total + requisition.bottlenecks.filter((bottleneck) => bottleneck.status !== 'Resolved').length,
          0,
        ),
        overdueActions: active.reduce((total, requisition) => total + requisition.actionItems.filter((action) => action.daysOverdue > 0).length, 0),
      }
    })
    .sort((first, second) => second.riskCount - first.riskCount || first.name.localeCompare(second.name))
}

function getFilteredSourceMetrics(sources: SourceAnalytics, fromDate: string, toDate: string): SourceMetric[] {
  if (!fromDate && !toDate) {
    return sources.sources
  }

  const filteredTrends = sources.monthlyTrends.filter((trend) => monthMatchesDateRange(trend.month, fromDate, toDate))
  const totalHires = filteredTrends.reduce((total, trend) => total + trend.hires, 0)

  return groupBy(filteredTrends, (trend) => trend.source)
    .map(([source, items]) => {
      const activities = items.reduce((total, item) => total + item.activities, 0)
      const hires = items.reduce((total, item) => total + item.hires, 0)

      return {
        source,
        activities,
        hires,
        sourceContributionPercentage: percentage(hires, totalHires),
        sourceToHireConversionRate: percentage(hires, activities),
      }
    })
    .sort((first, second) => second.hires - first.hires || first.source.localeCompare(second.source))
}

function groupAverageTimeToFill(requisitions: Requisition[], selector: (requisition: Requisition) => string): BreakdownMetric[] {
  return groupBy(requisitions, selector)
    .map(([name, items]) => ({
      name,
      averageTimeToFill: averageTimeToFill(items),
    }))
    .sort((first, second) => second.averageTimeToFill - first.averageTimeToFill || first.name.localeCompare(second.name))
}

function groupBy<T>(items: T[], selector: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>()

  for (const item of items) {
    const key = selector(item) || 'Unassigned'
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  return [...groups.entries()]
}

function requisitionMatchesDateRange(requisition: Requisition, fromDate: string, toDate: string) {
  if (!fromDate && !toDate) {
    return true
  }

  return [requisition.dateOpened, requisition.closedDate].some((date) => dateMatchesDateRange(date, fromDate, toDate))
}

function monthMatchesDateRange(month: string, fromDate: string, toDate: string) {
  if (!fromDate && !toDate) {
    return true
  }

  const monthDate = `${month}-01`
  return dateMatchesDateRange(monthDate, fromDate, toDate)
}

function dateMatchesDateRange(value: string | null | undefined, fromDate: string, toDate: string) {
  if (!value) {
    return false
  }

  return (!fromDate || value >= fromDate) && (!toDate || value <= toDate)
}

function isClosed(requisition: Requisition) {
  return Boolean(requisition.closedDate) || requisition.currentStatus === 'Closed'
}

function isAtRisk(requisition: Requisition) {
  return (
    requisition.slaState === 'Breached' ||
    requisition.slaState === 'Warning' ||
    requisition.isStalled ||
    requisition.bottlenecks.some((bottleneck) => bottleneck.status !== 'Resolved')
  )
}

function averageTimeToFill(requisitions: Requisition[]) {
  const values = requisitions
    .map((requisition) => daysBetween(requisition.dateOpened, requisition.closedDate))
    .filter((value): value is number => value !== null)

  if (values.length === 0) {
    return 0
  }

  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10
}

function daysBetween(start: string, end: string | null | undefined) {
  if (!end) {
    return null
  }

  const milliseconds = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(0, Math.round(milliseconds / 86_400_000))
}

function percentage(value: number, total: number) {
  if (total === 0) {
    return 0
  }

  return Math.round((value / total) * 1000) / 10
}

function getChartHeight(value: number, total: number) {
  if (value === 0) {
    return 4
  }

  return Math.max(12, percentage(value, total))
}

function formatMonthLabel(month: string) {
  const [year, monthValue] = month.split('-')
  const date = new Date(Number(year), Number(monthValue) - 1, 1)

  return date.toLocaleString('en', { month: 'short' })
}

function getDefaultDateRange() {
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  return {
    fromDate: toDateInputValue(firstDayOfMonth),
    toDate: toDateInputValue(today),
  }
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
