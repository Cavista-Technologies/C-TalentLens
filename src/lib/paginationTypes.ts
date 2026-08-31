export type PageMetadata = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type PagedResponse<T> = {
  success: boolean
  message: string
  items: T[]
  pagination: PageMetadata
}
