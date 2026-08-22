import { useEffect, useState } from 'react'
import { ErrorState, LoadingState } from '../components/feedback/StateMessage'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { getReferralAnalytics } from '../features/referrals/referralApi'
import { formatValue } from '../features/referrals/referralDisplay'
import type { ReferralAnalytics } from '../features/referrals/referralTypes'

export function ReferralAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadAnalytics() {
      setIsLoading(true)
      setError('')

      try {
        const data = await getReferralAnalytics()

        if (!isMounted) {
          return
        }

        setAnalytics(data)
      } catch (err) {
        if (!isMounted) {
          return
        }

        setError(err instanceof Error ? err.message : 'Referral analytics could not be loaded.')
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
    <AppLayout title="Referral Analytics">
      <PageContainer>
        {isLoading && <LoadingState message="Loading referral analytics..." />}

        {!isLoading && error && <ErrorState title="Referral analytics unavailable" message={error} />}

        {!isLoading && analytics && <AnalyticsContent analytics={analytics} />}
      </PageContainer>
    </AppLayout>
  )
}

function AnalyticsContent({ analytics }: { analytics: ReferralAnalytics }) {
  const metrics = [
    ['Submitted', analytics.totalReferralsSubmitted],
    ['Active', analytics.activeReferrals],
    ['Hires', analytics.referralHires],
    ['Conversion', `${analytics.overallConversionRate}%`],
  ] as const

  return (
    <>
      <section className="metric-grid" aria-label="Referral metrics">
        {metrics.map(([label, value]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <p>{label === 'Conversion' ? 'Referral hire conversion' : 'Referral pipeline'}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <p className="eyebrow">Funnel</p>
            <h2>Referral status</h2>
          </div>
          <div className="pipeline-list">
            {analytics.funnel.map((item) => (
              <div className="pipeline-row" key={item.status}>
                <span>{formatValue(item.status)}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <p className="eyebrow">Top Referrers</p>
            <h2>{analytics.topReferringDepartment ?? 'Departments'}</h2>
          </div>
          <dl className="summary-list">
            {analytics.topReferrers.slice(0, 5).map((item) => (
              <div key={`${item.referrerName}-${item.department}`}>
                <dt>
                  {item.referrerName} - {item.department}
                </dt>
                <dd>{item.referralsSubmitted}</dd>
              </div>
            ))}
          </dl>
        </article>
      </section>

      <section className="table-panel" aria-label="Monthly referral trends">
        <div className="analytics-table">
          <div className="analytics-row table-head">
            <span>Month</span>
            <span>Submitted</span>
            <span>Hires</span>
            <span>Conversion</span>
            <span>Growth</span>
          </div>
          {analytics.monthlyTrends.map((item) => (
            <article className="analytics-row" key={item.month}>
              <strong>{item.month}</strong>
              <span>{item.referralsSubmitted}</span>
              <span>{item.referralHires}</span>
              <span>{item.conversionRate}%</span>
              <span>{item.submissionGrowthPercentage}%</span>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
