export type UserSummary = {
  id: string
  email: string
  fullName: string
  department?: string | null
  reportingLine?: string | null
  roles: string[]
}

export type UserQuery = {
  role?: string
  search?: string
  page?: number
  pageSize?: number
}
