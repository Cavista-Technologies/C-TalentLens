import { apiRequest } from '../../lib/apiClient'
import type { DashboardResponse } from './dashboardTypes'

export function getDashboard() {
  return apiRequest<DashboardResponse>('/api/dashboard')
}
