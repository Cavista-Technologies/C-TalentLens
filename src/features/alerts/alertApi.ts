import { apiRequest } from '../../lib/apiClient'
import type { PagedResponse } from '../../lib/paginationTypes'
import type { Alert, AlertQuery } from './alertTypes'

export function getAlerts(query: AlertQuery = {}) {
  return apiRequest<PagedResponse<Alert>>(buildAlertUrl('/api/alerts', query))
}

export function getMyAlerts(query: AlertQuery = {}) {
  return apiRequest<PagedResponse<Alert>>(buildAlertUrl('/api/alerts/me', query))
}

export function markAlertRead(notificationId: string) {
  return apiRequest<Alert>(`/api/alerts/${notificationId}/read`, { method: 'PATCH' })
}

export function markAlertUnread(notificationId: string) {
  return apiRequest<Alert>(`/api/alerts/${notificationId}/unread`, { method: 'PATCH' })
}

export function dismissAlert(notificationId: string) {
  return apiRequest<Alert>(`/api/alerts/${notificationId}/dismiss`, { method: 'PATCH' })
}

function buildAlertUrl(path: string, query: AlertQuery) {
  const params = new URLSearchParams()

  if (query.severity) {
    params.set('severity', query.severity)
  }

  if (query.type) {
    params.set('type', query.type)
  }

  if (query.unreadOnly) {
    params.set('unreadOnly', 'true')
  }

  if (query.page) {
    params.set('page', String(query.page))
  }

  if (query.pageSize) {
    params.set('pageSize', String(query.pageSize))
  }

  const queryString = params.toString()
  return queryString ? `${path}?${queryString}` : path
}
