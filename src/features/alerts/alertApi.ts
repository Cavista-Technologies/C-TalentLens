import { apiRequest } from '../../lib/apiClient'
import type { PagedResponse } from '../../lib/paginationTypes'
import type { Alert, AlertQuery } from './alertTypes'

export function getAlerts(query: AlertQuery = {}) {
  return apiRequest<PagedResponse<Alert>>(buildAlertUrl('/api/alerts', query))
}

export function getMyAlerts(query: AlertQuery = {}) {
  return apiRequest<PagedResponse<Alert>>(buildAlertUrl('/api/alerts/me', query))
}

function buildAlertUrl(path: string, query: AlertQuery) {
  const params = new URLSearchParams()

  if (query.severity) {
    params.set('severity', query.severity)
  }

  if (query.type) {
    params.set('type', query.type)
  }

  const queryString = params.toString()
  return queryString ? `${path}?${queryString}` : path
}
