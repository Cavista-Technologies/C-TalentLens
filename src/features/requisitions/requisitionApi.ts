import { apiRequest } from '../../lib/apiClient'
import type { PagedResponse } from '../../lib/paginationTypes'
import type {
  ActionItem,
  Bottleneck,
  CompleteActionItemRequest,
  CreateActionItemRequest,
  CreateBottleneckRequest,
  CreateRequisitionRequest,
  Requisition,
  RequisitionQuery,
  ResolveBottleneckRequest,
  UpdateRequisitionRequest,
  UpdateRequisitionStatusRequest,
} from './requisitionTypes'

export function getRequisitions(query: RequisitionQuery = {}) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 10),
  })

  if (query.search) {
    params.set('search', query.search)
  }

  if (query.openOnly) {
    params.set('openOnly', 'true')
  }

  if (query.overdueOnly) {
    params.set('overdueOnly', 'true')
  }

  if (query.nearSlaBreach) {
    params.set('nearSlaBreach', 'true')
  }

  return apiRequest<PagedResponse<Requisition>>(`/api/requisitions?${params.toString()}`)
}

export function getRequisition(id: string) {
  return apiRequest<Requisition>(`/api/requisitions/${id}`)
}

export function createRequisition(request: CreateRequisitionRequest) {
  return apiRequest<Requisition>('/api/requisitions', {
    method: 'POST',
    body: request,
  })
}

export function updateRequisition(id: string, request: UpdateRequisitionRequest) {
  return apiRequest<Requisition>(`/api/requisitions/${id}`, {
    method: 'PUT',
    body: request,
  })
}

export function updateRequisitionStatus(id: string, request: UpdateRequisitionStatusRequest) {
  return apiRequest<Requisition>(`/api/requisitions/${id}/status`, {
    method: 'PATCH',
    body: request,
  })
}

export function addBottleneck(requisitionId: string, request: CreateBottleneckRequest) {
  return apiRequest<Bottleneck>(`/api/requisitions/${requisitionId}/bottlenecks`, {
    method: 'POST',
    body: request,
  })
}

export function resolveBottleneck(requisitionId: string, bottleneckId: string, request: ResolveBottleneckRequest) {
  return apiRequest<Bottleneck>(`/api/requisitions/${requisitionId}/bottlenecks/${bottleneckId}/resolve`, {
    method: 'PATCH',
    body: request,
  })
}

export function addActionItem(requisitionId: string, request: CreateActionItemRequest) {
  return apiRequest<ActionItem>(`/api/requisitions/${requisitionId}/actions`, {
    method: 'POST',
    body: request,
  })
}

export function completeActionItem(requisitionId: string, actionItemId: string, request: CompleteActionItemRequest = {}) {
  return apiRequest<ActionItem>(`/api/requisitions/${requisitionId}/actions/${actionItemId}/complete`, {
    method: 'PATCH',
    body: request,
  })
}
