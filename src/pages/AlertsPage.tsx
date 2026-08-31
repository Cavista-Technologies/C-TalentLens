import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StateMessage'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { getAlerts, getMyAlerts } from '../features/alerts/alertApi'
import type { Alert } from '../features/alerts/alertTypes'
import { useAuth } from '../features/auth/authContext'
import { appRoles, canViewAllAlerts, hasAnyRole } from '../features/auth/roleAccess'

type AlertScope = 'mine' | 'all'

const alertSeverities = ['Info', 'Warning', 'High', 'Critical']
const alertTypes = [
  'SlaWarning',
  'SlaBreached',
  'StalledRequisition',
  'OpenBottleneck',
  'OverdueAction',
  'CriticalRisk',
  'RequisitionAssigned',
  'BottleneckAssigned',
  'ActionAssigned',
]

export function AlertsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const isLeadership = hasAnyRole(user, [appRoles.leadership])
  const canUseAllAlerts = canViewAllAlerts(user)
  const showScopeToggle = canUseAllAlerts && !isLeadership
  const activeScope: AlertScope = isLeadership || searchParams.get('scope') === 'all' && canUseAllAlerts ? 'all' : 'mine'
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadAlerts() {
      setIsLoading(true)
      setError('')

      try {
        const query = {
          severity: searchParams.get('severity'),
          type: searchParams.get('type'),
        }
        const response = activeScope === 'all' ? await getAlerts(query) : await getMyAlerts(query)

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
  }, [activeScope, searchParams])

  const alertGroups = getAlertGroups(alerts)

  return (
    <AppLayout title="Alerts">
      <PageContainer>
        {showScopeToggle && (
          <div className="segmented-control" aria-label="Alert scope">
            <button className={activeScope === 'mine' ? 'active' : ''} type="button" onClick={() => setAlertScope('mine')}>
              My alerts
            </button>
            <button className={activeScope === 'all' ? 'active' : ''} type="button" onClick={() => setAlertScope('all')}>
              All alerts
            </button>
          </div>
        )}

        <section className="alert-filter-bar" aria-label="Alert filters">
          <label>
            Severity
            <select value={searchParams.get('severity') ?? ''} onChange={(event) => setAlertFilter('severity', event.target.value)}>
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
            <select value={searchParams.get('type') ?? ''} onChange={(event) => setAlertFilter('type', event.target.value)}>
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

        {!isLoading && error && <ErrorState title="Alerts unavailable" message={error} />}

        {!isLoading && !error && alerts.length === 0 && (
          <section className="empty-panel centered-empty-panel">
            <strong>There are no alerts left</strong>
          </section>
        )}

        {alertGroups.length > 0 && (
          <section className="alerts-list" aria-label={activeScope === 'all' ? 'All alerts' : 'My alerts'}>
            {alertGroups.map((group) => (
              <article className="alert-group" key={group.key}>
                <button
                  className="alert-group-header"
                  type="button"
                  aria-expanded={openGroups.has(group.key)}
                  onClick={() => toggleAlertGroup(group.key)}
                >
                  <span className={`alert-group-chevron ${openGroups.has(group.key) ? 'open' : ''}`}>
                    <ChevronDown size={18} aria-hidden="true" />
                  </span>
                  <span className={`severity-pill ${group.severity.toLowerCase()}`}>{formatValue(group.severity)}</span>
                  <strong>{group.requisitionCode}</strong>
                  <span>{group.roleName}</span>
                  <small>{group.alerts.length} {group.alerts.length === 1 ? 'alert' : 'alerts'}</small>
                </button>

                {openGroups.has(group.key) && (
                  <div className="alert-group-items">
                    {group.alerts.map((alert) => (
                      <div className="alert-card alert-card-nested" key={alert.id}>
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
                          <Link className="table-link" to={getAlertTarget(alert)}>
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
  )

  function setAlertScope(nextScope: AlertScope) {
    const nextParams = new URLSearchParams(searchParams)

    if (nextScope === 'all') {
      nextParams.set('scope', 'all')
    } else {
      nextParams.delete('scope')
    }

    setSearchParams(nextParams)
  }

  function setAlertFilter(key: 'severity' | 'type', value: string) {
    const nextParams = new URLSearchParams(searchParams)

    if (value) {
      nextParams.set(key, value)
    } else {
      nextParams.delete(key)
    }

    setSearchParams(nextParams)
  }

  function clearAlertFilters() {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('severity')
    nextParams.delete('type')
    setSearchParams(nextParams)
  }

  function toggleAlertGroup(groupKey: string) {
    setOpenGroups((current) => {
      const next = new Set(current)

      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }

      return next
    })
  }
}

type AlertGroup = {
  key: string
  requisitionCode: string
  roleName: string
  severity: string
  alerts: Alert[]
}

function getAlertGroups(alerts: Alert[]): AlertGroup[] {
  const groups = new Map<string, AlertGroup>()

  for (const alert of alerts) {
    const key = `${alert.requisitionId}:${alert.severity}`
    const existingGroup = groups.get(key)

    if (existingGroup) {
      existingGroup.alerts.push(alert)
      continue
    }

    groups.set(key, {
      key,
      requisitionCode: alert.requisitionCode,
      roleName: alert.roleName,
      severity: alert.severity,
      alerts: [alert],
    })
  }

  return [...groups.values()].sort(
    (first, second) =>
      getSeverityRank(first.severity) - getSeverityRank(second.severity) || first.requisitionCode.localeCompare(second.requisitionCode),
  )
}

function getSeverityRank(severity: string) {
  if (severity === 'Critical') {
    return 0
  }

  if (severity === 'Warning') {
    return 1
  }

  return 2
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
