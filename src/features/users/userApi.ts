import { apiRequest } from '../../lib/apiClient'
import type { PagedResponse } from '../../lib/paginationTypes'
import type { UserQuery, UserSummary } from './userTypes'

export function getUsers(query: UserQuery = {}) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 50),
  })

  if (query.role) {
    params.set('role', query.role)
  }

  if (query.search) {
    params.set('search', query.search)
  }

  return apiRequest<PagedResponse<UserSummary>>(`/api/users?${params.toString()}`)
}
