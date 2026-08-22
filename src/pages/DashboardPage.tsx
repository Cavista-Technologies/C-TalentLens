import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StateMessage'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { useAuth } from '../features/auth/authContext'
import { appRoles, hasAnyRole } from '../features/auth/roleAccess'
import { getDashboard } from '../features/dashboard/dashboardApi'
import type { DashboardResponse } from '../features/dashboard/dashboardTypes'
import type { UserProfile } from '../features/auth/authTypes'

export function DashboardPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setIsLoading(true)
      setError('')

      try {
        const response = await getDashboard()

        if (!isMounted) {
          return
        }

        setDashboard(response)
      } catch (err) {
        if (!isMounted) {
          return
        }

        setError(err instanceof Error ? err.message : 'Dashboard could not be loaded.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <AppLayout eyebrow={formatToday()} title={`${getGreeting()}, ${getFirstName(user?.fullName)}`}>
      <PageContainer>
        {isLoading && <LoadingState message="Loading dashboard..." />}

        {!isLoading && error && <ErrorState title="Dashboard unavailable" message={error} />}

        {!isLoading && dashboard && <DashboardContent dashboard={dashboard} user={user} />}
      </PageContainer>
    </AppLayout>
  )
}

function DashboardContent({ dashboard, user }: { dashboard: DashboardResponse; user: UserProfile | null }) {
  const metrics = getRoleMetrics(dashboard, user)
  const attentionItems = getAttentionItems(dashboard, user)
  const pipeline = [
    ['Sourcing', dashboard.pipeline.rolesInSourcing],
    ['Screening', dashboard.pipeline.rolesInScreening],
    ['Interview', dashboard.pipeline.rolesInInterviewStage],
    ['Offer', dashboard.pipeline.rolesInOfferStage],
    ['Filled', dashboard.pipeline.rolesFilled],
  ] as const
  const totalPipelineRequisitions = pipeline.reduce((total, [, count]) => total + count, 0)

  return (
    <>
      <section className="metric-grid" aria-label="Recruitment metrics">
        {metrics.map((metric) => (
          <Link className="metric-card dashboard-link-card" key={metric.label} to={metric.href}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </Link>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel dashboard-panel pipeline-panel">
          <div className="panel-heading">
            <p className="eyebrow">Pipeline</p>
            <h2>Requisitions by stage</h2>
          </div>

          <div className="pipeline-list">
            {pipeline.map(([label, count]) => (
              <Link className="pipeline-row dashboard-link-card" key={label} to={getPipelineHref(label)}>
                <div>
                  <span>{label}</span>
                  <div className="pipeline-track" aria-hidden="true">
                    <span style={{ width: `${getPercent(count, totalPipelineRequisitions)}%` }} />
                  </div>
                </div>
                <strong>{count}</strong>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel dashboard-panel risk-panel">
          <div className="panel-heading">
            <p className="eyebrow">Risk</p>
            <h2>{getAttentionTitle(user)}</h2>
          </div>

          <div className="summary-list status-summary-list">
            {attentionItems.map((item) => (
              <Link className={`summary-${item.tone} dashboard-link-card`} key={item.label} to={item.href}>
                <span className="summary-label">{item.label}</span>
                <strong className="summary-value">{item.value}</strong>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid-single">
        <article className="panel dashboard-panel sla-panel">
          <div className="panel-heading">
            <p className="eyebrow">SLA</p>
            <h2>Compliance snapshot</h2>
          </div>

          <div className="summary-list status-summary-list">
            <Link className="summary-success dashboard-link-card" to="/requisitions">
              <span className="summary-label">Within SLA</span>
              <strong className="summary-value">{dashboard.slaCompliance.rolesWithinSla}</strong>
            </Link>
            <Link className="summary-warning dashboard-link-card" to="/requisitions?nearSlaBreach=true">
              <span className="summary-label">Approaching</span>
              <strong className="summary-value">{dashboard.slaCompliance.rolesApproachingSla}</strong>
            </Link>
            <Link className="summary-danger dashboard-link-card" to="/requisitions?overdueOnly=true">
              <span className="summary-label">Breaching</span>
              <strong className="summary-value">{dashboard.slaCompliance.rolesBreachingSla}</strong>
            </Link>
            <Link className="summary-danger dashboard-link-card" to="/alerts">
              <span className="summary-label">High priority at risk</span>
              <strong className="summary-value">{dashboard.slaCompliance.highPriorityRolesAtRisk}</strong>
            </Link>
          </div>
        </article>
      </section>
    </>
  )
}

function getRoleMetrics(dashboard: DashboardResponse, user: UserProfile | null) {
  if (hasAnyRole(user, [appRoles.hiringManager])) {
    return [
      metric('My open requisitions', dashboard.recruitmentOverview.totalOpenRoles, `${dashboard.recruitmentOverview.outstandingGoals} positions remaining`),
      metric('Feedback actions', dashboard.actions.totalOpenActions, `${dashboard.actions.overdueActions} overdue`, 'neutral', '/alerts'),
      metric('Open bottlenecks', dashboard.bottlenecks.totalOpenBottlenecks, `${dashboard.bottlenecks.escalatedBottlenecks} escalated`, 'neutral', '/alerts'),
      metric('Near SLA breach', dashboard.risk.rolesNearSlaBreach, `${dashboard.risk.overdueRoles} overdue`, 'neutral', '/requisitions?nearSlaBreach=true'),
    ]
  }

  if (hasAnyRole(user, [appRoles.leadership])) {
    return [
      metric('Open requisitions', dashboard.recruitmentOverview.totalOpenRoles, `${dashboard.recruitmentOverview.outstandingGoals} outstanding positions`),
      metric('Filled requisitions', dashboard.pipeline.rolesFilled, `${dashboard.recruitmentOverview.goalsFilled} hiring goals met`),
      metric('Avg. time to fill', `${dashboard.timeToFill.averageTimeToFill}d`, `${dashboard.slaCompliance.complianceRate}% SLA compliance`, 'neutral', '/analytics'),
      metric('At risk', dashboard.risk.items.length, `${dashboard.risk.stalledRequisitions} stalled`, 'neutral', '/alerts'),
    ]
  }

  if (hasAnyRole(user, [appRoles.talentAcquisitionManager])) {
    return [
      metric('Open requisitions', dashboard.recruitmentOverview.totalOpenRoles, `${dashboard.recruitmentOverview.outstandingGoals} outstanding positions`),
      metric('SLA compliance', `${dashboard.slaCompliance.complianceRate}%`, `${dashboard.slaCompliance.rolesBreachingSla} breaching`, 'neutral', '/requisitions?overdueOnly=true'),
      metric('Escalated bottlenecks', dashboard.bottlenecks.escalatedBottlenecks, `${dashboard.bottlenecks.highRiskBottlenecks} high risk`, 'neutral', '/alerts'),
      metric('Overdue actions', dashboard.actions.overdueActions, `${dashboard.actions.highPriorityActions} high priority`, 'neutral', '/alerts'),
    ]
  }

  return [
    metric('My open requisitions', dashboard.recruitmentOverview.totalOpenRoles, `${dashboard.recruitmentOverview.outstandingGoals} positions remaining`),
    metric('Filled requisitions', dashboard.pipeline.rolesFilled, `${dashboard.recruitmentOverview.goalsFilled} hiring goals met`, 'neutral', '/requisitions?openOnly=false'),
    metric('Overdue actions', dashboard.actions.overdueActions, `${dashboard.actions.totalOpenActions} open actions`, 'neutral', '/alerts'),
    metric('Open bottlenecks', dashboard.bottlenecks.totalOpenBottlenecks, `${dashboard.bottlenecks.escalatedBottlenecks} escalated`, 'neutral', '/alerts'),
  ]
}

function getAttentionItems(dashboard: DashboardResponse, user: UserProfile | null) {
  if (hasAnyRole(user, [appRoles.hiringManager])) {
    return [
      metric('Open actions', dashboard.actions.totalOpenActions, '', 'neutral', '/alerts'),
      metric('Overdue actions', dashboard.actions.overdueActions, '', 'danger', '/alerts'),
      metric('Open bottlenecks', dashboard.bottlenecks.totalOpenBottlenecks, '', 'warning', '/alerts'),
      metric('Stalled requisitions', dashboard.risk.stalledRequisitions, '', 'danger', '/requisitions?overdueOnly=true'),
    ]
  }

  if (hasAnyRole(user, [appRoles.talentAcquisitionManager])) {
    return [
      metric('Overdue requisitions', dashboard.risk.overdueRoles, '', 'danger', '/requisitions?overdueOnly=true'),
      metric('Near SLA breach', dashboard.risk.rolesNearSlaBreach, '', 'warning', '/requisitions?nearSlaBreach=true'),
      metric('Escalated bottlenecks', dashboard.bottlenecks.escalatedBottlenecks, '', 'danger', '/alerts'),
      metric('High priority actions', dashboard.actions.highPriorityActions, '', 'warning', '/alerts'),
    ]
  }

  return [
    metric('Overdue requisitions', dashboard.risk.overdueRoles, '', 'danger', '/requisitions?overdueOnly=true'),
    metric('Near SLA breach', dashboard.risk.rolesNearSlaBreach, '', 'warning', '/requisitions?nearSlaBreach=true'),
    metric('Stalled requisitions', dashboard.risk.stalledRequisitions, '', 'danger', '/requisitions?overdueOnly=true'),
    metric('Open bottlenecks', dashboard.bottlenecks.totalOpenBottlenecks, '', 'warning', '/alerts'),
  ]
}

function getAttentionTitle(user: UserProfile | null) {
  if (hasAnyRole(user, [appRoles.hiringManager])) {
    return 'Needs your input'
  }

  if (hasAnyRole(user, [appRoles.talentAcquisitionManager])) {
    return 'Escalations'
  }

  return 'Needs attention'
}

function metric(label: string, value: number | string, detail = '', tone: SummaryTone = 'neutral', href = '/requisitions') {
  return { label, value, detail, tone, href }
}

type SummaryTone = 'neutral' | 'success' | 'warning' | 'danger'

function getPercent(value: number, total: number) {
  if (total <= 0 || value <= 0) {
    return 0
  }

  return Math.max(8, Math.round((value / total) * 100))
}

function getPipelineHref(stage: string) {
  return stage === 'Filled' ? '/requisitions?openOnly=false' : '/requisitions'
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Good morning'
  }

  if (hour < 17) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

function getFirstName(fullName?: string) {
  return fullName?.trim().split(/\s+/)[0] || 'there'
}

function formatToday() {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}
