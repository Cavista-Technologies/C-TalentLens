import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StateMessage'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { getMyAlerts } from '../features/alerts/alertApi'
import type { Alert } from '../features/alerts/alertTypes'

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadAlerts() {
      setIsLoading(true)
      setError('')

      try {
        const response = await getMyAlerts()

        if (!isMounted) {
          return
        }

        setAlerts(response.items)
      } catch (err) {
        if (!isMounted) {
          return
        }

        setError(err instanceof Error ? err.message : 'Alerts could not be loaded.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadAlerts()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <AppLayout title="Alerts">
      <PageContainer>
        {isLoading && <LoadingState message="Loading alerts..." />}

        {!isLoading && error && <ErrorState title="Alerts unavailable" message={error} />}

        {!isLoading && !error && alerts.length === 0 && (
          <section className="empty-panel">
            <strong>No alerts</strong>
            <p>There are no active alerts assigned to you.</p>
          </section>
        )}

        {alerts.length > 0 && (
          <section className="alerts-list" aria-label="My alerts">
            {alerts.map((alert) => (
              <article className="alert-card" key={alert.id}>
                <div>
                  <span className={`severity-pill ${alert.severity.toLowerCase()}`}>
                    {formatValue(alert.severity)}
                  </span>
                  <h2>{alert.roleName}</h2>
                  <p>{alert.message}</p>
                </div>

                <dl>
                  <div>
                    <dt>Requisition</dt>
                    <dd>{alert.requisitionCode}</dd>
                  </div>
                  <div>
                    <dt>Reason</dt>
                    <dd>{alert.reason}</dd>
                  </div>
                </dl>

                <div className="alert-action">
                  <span>Action</span>
                  <Link className="table-link" to={getAlertTarget(alert)}>
                    {getAlertLinkLabel(alert)}
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </PageContainer>
    </AppLayout>
  )
}

function formatValue(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2')
}

function getAlertTarget(alert: Alert) {
  const section = getAlertSection(alert)
  return section ? `/requisitions/${alert.requisitionId}?section=${section}` : `/requisitions/${alert.requisitionId}`
}

function getAlertSection(alert: Alert) {
  if (alert.metadata.bottleneckId || alert.type === 'OpenBottleneck') {
    return 'bottlenecks'
  }

  if (alert.metadata.actionItemId || alert.type === 'OverdueAction') {
    return 'actions'
  }

  return 'overview'
}

function getAlertLinkLabel(alert: Alert) {
  const section = getAlertSection(alert)

  if (section === 'bottlenecks') {
    return 'View bottleneck'
  }

  if (section === 'actions') {
    return 'View action'
  }

  return 'View requisition'
}
