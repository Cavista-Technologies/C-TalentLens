import { apiRequest } from '../../lib/apiClient'
import type { HiringTrendResponse, LeadershipSummary, SourceAnalytics } from './analyticsTypes'

export function getLeadershipSummary() {
  return apiRequest<LeadershipSummary>('/api/leadership-summary')
}

export function getSourceAnalytics() {
  return apiRequest<SourceAnalytics>('/api/source-analytics')
}

export function getHiringTrends() {
  return apiRequest<HiringTrendResponse>('/api/analytics/hiring-trends')
}
