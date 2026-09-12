import { apiRequest } from '../../lib/apiClient'
import type { HiringTrendResponse, LeadershipSummary, SourceAnalytics } from './analyticsTypes'
import type { Requisition } from '../requisitions/requisitionTypes'

export type AnalyticsDateRange = {
  from?: string
  to?: string
}

function buildDateRangeQuery(range?: AnalyticsDateRange) {
  const params = new URLSearchParams()

  if (range?.from) {
    params.set('from', range.from)
  }

  if (range?.to) {
    params.set('to', range.to)
  }

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

export function getLeadershipSummary(range?: AnalyticsDateRange) {
  return apiRequest<LeadershipSummary>(`/api/leadership-summary${buildDateRangeQuery(range)}`)
}

export function getSourceAnalytics(range?: AnalyticsDateRange) {
  return apiRequest<SourceAnalytics>(`/api/source-analytics${buildDateRangeQuery(range)}`)
}

export function getHiringTrends(range?: AnalyticsDateRange) {
  return apiRequest<HiringTrendResponse>(`/api/analytics/hiring-trends${buildDateRangeQuery(range)}`)
}

export function getReportRequisitions(range?: AnalyticsDateRange) {
  return apiRequest<Requisition[]>(`/api/analytics/requisitions${buildDateRangeQuery(range)}`)
}
