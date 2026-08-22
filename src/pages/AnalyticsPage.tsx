import { useEffect, useState } from 'react'
import { ErrorState, LoadingState } from '../components/feedback/StateMessage'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { getHiringTrends, getLeadershipSummary, getSourceAnalytics } from '../features/analytics/analyticsApi'
import type { HiringTrendResponse, LeadershipSummary, SourceAnalytics } from '../features/analytics/analyticsTypes'
import { formatValue } from '../features/referrals/referralDisplay'

export function AnalyticsPage() {
  const [leadership, setLeadership] = useState<LeadershipSummary | null>(null)
  const [sources, setSources] = useState<SourceAnalytics | null>(null)
  const [trends, setTrends] = useState<HiringTrendResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadAnalytics() {
      setIsLoading(true)
      setError('')

      try {
        const [leadershipData, sourceData, trendData] = await Promise.all([
          getLeadershipSummary(),
          getSourceAnalytics(),
          getHiringTrends(),
        ])

        if (!isMounted) {
          return
        }

        setLeadership(leadershipData)
        setSources(sourceData)
        setTrends(trendData)
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

  return (
    <AppLayout title="Analytics">
      <PageContainer>
        {isLoading && <LoadingState message="Loading analytics..." />}
        {!isLoading && error && <ErrorState title="Analytics unavailable" message={error} />}
        {!isLoading && leadership && sources && trends && (
          <>
            <section className="metric-grid" aria-label="Executive KPIs">
              <Metric label="Open roles" value={leadership.executiveKpis.totalOpenRoles} />
              <Metric label="Filled" value={leadership.executiveKpis.totalFilledPositions} />
              <Metric label="Avg. time to fill" value={`${leadership.executiveKpis.averageTimeToFill}d`} />
              <Metric label="SLA" value={`${leadership.executiveKpis.slaComplianceRate}%`} />
            </section>

            <section className="dashboard-grid">
              <article className="panel">
                <div className="panel-heading">
                  <p className="eyebrow">Source</p>
                  <h2>Source performance</h2>
                </div>
                <div className="pipeline-list">
                  {sources.sources.map((source) => (
                    <div className="pipeline-row" key={source.source}>
                      <span>{formatValue(source.source)}</span>
                      <strong>{source.hires}/{source.activities}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-heading">
                  <p className="eyebrow">Risk</p>
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
                  <p className="eyebrow">Trends</p>
                  <h2>Hiring movement</h2>
                </div>
                <div className="pipeline-list">
                  {trends.monthlyTrends.map((trend) => (
                    <div className="pipeline-row" key={trend.month}>
                      <span>{trend.month}</span>
                      <strong>{trend.rolesFilled}/{trend.rolesOpened}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-heading">
                  <p className="eyebrow">Insights</p>
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
