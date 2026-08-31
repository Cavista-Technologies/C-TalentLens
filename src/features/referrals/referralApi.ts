import { apiRequest } from '../../lib/apiClient'
import type { PagedResponse } from '../../lib/paginationTypes'
import type {
  CreateReferralRequest,
  CreatePublicReferralRequest,
  ImportResult,
  PublicRequisition,
  Referral,
  ReferralAnalytics,
  ReferralQuery,
  UpdateReferralStatusRequest,
} from './referralTypes'

export function getReferrals(query: ReferralQuery = {}) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 10),
  })

  if (query.search) {
    params.set('search', query.search)
  }

  if (query.status) {
    params.set('status', query.status)
  }

  if (query.activeOnly) {
    params.set('activeOnly', 'true')
  }

  if (query.submittedFrom) {
    params.set('submittedFrom', query.submittedFrom)
  }

  if (query.submittedTo) {
    params.set('submittedTo', query.submittedTo)
  }

  const queryString = params.toString()

  return apiRequest<PagedResponse<Referral>>(`/api/referrals?${queryString}`)
}

export function getReferral(id: string) {
  return apiRequest<Referral>(`/api/referrals/${id}`)
}

export function createReferral(request: CreateReferralRequest) {
  return apiRequest<Referral>('/api/referrals', {
    method: 'POST',
    body: request,
  })
}

export function searchPublicRequisitions(search: string) {
  const params = new URLSearchParams()

  if (search.trim()) {
    params.set('search', search.trim())
  }

  const queryString = params.toString()
  return apiRequest<PublicRequisition[]>(queryString ? `/api/public/requisitions?${queryString}` : '/api/public/requisitions')
}

export function createPublicReferral(request: CreatePublicReferralRequest) {
  return apiRequest<Referral>('/api/public/referrals', {
    method: 'POST',
    body: request,
  })
}

export function updateReferralStatus(id: string, request: UpdateReferralStatusRequest) {
  return apiRequest<Referral>(`/api/referrals/${id}/status`, {
    method: 'PATCH',
    body: request,
  })
}

export function importReferrals(rows: unknown[]) {
  return apiRequest<ImportResult>('/api/imports/referrals', {
    method: 'POST',
    body: rows,
  })
}

export function getReferralAnalytics() {
  return apiRequest<ReferralAnalytics>('/api/referral-analytics')
}
