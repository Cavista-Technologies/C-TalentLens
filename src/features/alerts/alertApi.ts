import { apiRequest } from '../../lib/apiClient'
import type { PagedResponse } from '../../lib/paginationTypes'
import type { Alert } from './alertTypes'

export function getMyAlerts() {
  return apiRequest<PagedResponse<Alert>>('/api/alerts/me')
}
