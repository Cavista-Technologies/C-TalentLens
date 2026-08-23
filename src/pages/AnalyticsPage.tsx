import { useEffect, useState } from 'react'
import { ErrorState, LoadingState } from '../components/feedback/StateMessage'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { getHiringTrends, getLeadershipSummary, getSourceAnalytics } from '../features/analytics/analyticsApi'
import type { HiringTrendResponse, LeadershipSummary, SourceMetric, SourceAnalytics } from '../features/analytics/analyticsTypes'
import { formatValue } from '../features/referrals/referralDisplay'
import { getRequisitions } from '../features/requisitions/requisitionApi'
import type { Requisition } from '../features/requisitions/requisitionTypes'

export function AnalyticsPage() {
  const [leadership, setLeadership] = useState<LeadershipSummary | null>(null)
  const [sources, setSources] = useState<SourceAnalytics | null>(null)
  const [trends, setTrends] = useState<HiringTrendResponse | null>(null)
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadAnalytics() {
      setIsLoading(true)
      setError('')

      try {
        const [leadershipData, sourceData, trendData, requisitionData] = await Promise.all([
          getLeadershipSummary(),
          getSourceAnalytics(),
          getHiringTrends(),
          getRequisitions({ page: 1, pageSize: 500 }),
        ])

        if (!isMounted) {
          return
        }

        setLeadership(leadershipData)
        setSources(sourceData)
        setTrends(trendData)
        setRequisitions(requisitionData.items)
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
  }, [])

  const filteredRequisitions = requisitions.filter((requisition) => requisitionMatchesDateRange(requisition, fromDate, toDate))
  const filteredSourceMetrics = sources ? getFilteredSourceMetrics(sources, fromDate, toDate) : []
  const filteredHiringTrends = trends?.monthlyTrends.filter((trend) => monthMatchesDateRange(trend.month, fromDate, toDate)) ?? []
  const summaryMetrics = getSummaryMetrics(filteredRequisitions, leadership, Boolean(fromDate || toDate))
  const timeToFillBreakdowns = getTimeToFillBreakdowns(filteredRequisitions)
  const recruiterPerformance = getRecruiterPerformance(filteredRequisitions)

  return (
    <AppLayout title="Analytics">
      <PageContainer>
        {isLoading && (
          <div className="page-loader">
            <LoadingState branded message="Loading analytics" />
          </div>
        )}
        {!isLoading && error && <ErrorState title="Analytics unavailable" message={error} />}
        {!isLoading && leadership && sources && trends && (
          <>
            <form className="report-filter" aria-label="Analytics reporting period">
              <label>
                From
                <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
              </label>
              <label>
                To
                <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
              </label>
              <button type="button" onClick={() => {
                setFromDate('')
                setToDate('')
              }}>
                Reset
              </button>
            </form>

            <section className="metric-grid" aria-label="Executive KPIs">
              {summaryMetrics.map((metric) => (
                <Metric label={metric.label} value={metric.value} key={metric.label} />
              ))}
            </section>

            <section className="dashboard-grid">
              <article className="panel">
                <div className="panel-heading">
                  <h2>Source performance</h2>
                </div>
                <div className="analytics-card-list">
                  {filteredSourceMetrics.map((source) => (
                    <div className="analytics-stat-card" key={source.source}>
                      <span>{formatValue(source.source)}</span>
                      <strong>{source.hires}/{source.activities}</strong>
                      <small>{source.sourceToHireConversionRate}% conversion</small>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-heading">
                  <h2>Leadership risk</h2>
                </div>
                <dl className="summary-list">
                  <div>
                    <dt>At risk</dt>
                    <dd>{leadership.riskSummary.totalAtRiskRequisitions}</dd>
                  </div>
                  <div>
                    <dt>Critical</dt>
                    <dd>{leadership.riskSummary.criticalRiskRoles}</dd>
                  </div>
                  <div>
                    <dt>Breaching SLA</dt>
                    <dd>{leadership.riskSummary.rolesBreachingSla}</dd>
                  </div>
                  <div>
                    <dt>Open bottlenecks</dt>
                    <dd>{leadership.riskSummary.openBottlenecks}</dd>
                  </div>
                </dl>
              </article>
            </section>

            <section className="dashboard-grid">
              <article className="panel">
                <div className="panel-heading">
                  <h2>Time to fill breakdowns</h2>
                </div>
                <div className="breakdown-grid">
                  <BreakdownList title="Recruiter" items={timeToFillBreakdowns.byRecruiter} />
                  <BreakdownList title="Department" items={timeToFillBreakdowns.byDepartment} />
                  <BreakdownList title="Priority" items={timeToFillBreakdowns.byPriority} />
                </div>
              </article>

              <article className="panel">
                <div className="panel-heading">
                  <h2>Recruiter performance</h2>
                </div>
                <div className="recruiter-performance-table">
                  <div className="recruiter-performance-row table-head">
                    <span>Recruiter</span>
                    <span>Active</span>
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

            <section className="dashboard-grid">
              <article className="panel">
                <div className="panel-heading">
                  <h2>Hiring movement</h2>
                </div>
                <div className="analytics-card-list">
                  {filteredHiringTrends.map((trend) => (
                    <div className="analytics-stat-card" key={trend.month}>
                      <span>{trend.month}</span>
                      <strong>{trend.rolesFilled}/{trend.rolesOpened}</strong>
                      <small>{trend.averageTimeToFill}d avg. TTF</small>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-heading">
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
          </>
        )}
      </PageContainer>
    </AppLayout>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>Current reporting period</p>
    </article>
  )
}

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

function getSummaryMetrics(requisitions: Requisition[], leadership: LeadershipSummary | null, hasDateFilter: boolean) {
  if (requisitions.length === 0 && leadership && !hasDateFilter) {
    return [
      { label: 'Open requisitions', value: leadership.executiveKpis.totalOpenRoles },
      { label: 'Filled', value: leadership.executiveKpis.totalFilledPositions },
      { label: 'Avg. time to fill', value: `${leadership.executiveKpis.averageTimeToFill}d` },
      { label: 'SLA', value: `${leadership.executiveKpis.slaComplianceRate}%` },
    ]
  }

  const active = requisitions.filter((requisition) => !isClosed(requisition))
  const closed = requisitions.filter((requisition) => isClosed(requisition))
  const withinSla = active.filter((requisition) => requisition.slaState === 'OnTrack' || requisition.slaState === 'Closed').length

  return [
    { label: 'Open requisitions', value: active.length },
    { label: 'Filled', value: requisitions.reduce((total, requisition) => total + requisition.filledGoal, 0) },
    { label: 'Avg. time to fill', value: `${averageTimeToFill(closed)}d` },
    { label: 'SLA', value: `${percentage(withinSla, active.length)}%` },
  ]
}

function getTimeToFillBreakdowns(requisitions: Requisition[]) {
  const closed = requisitions.filter((requisition) => isClosed(requisition))

  return {
    byRecruiter: groupAverageTimeToFill(closed, (requisition) => requisition.recruiter),
    byDepartment: groupAverageTimeToFill(closed, (requisition) => requisition.department),
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
