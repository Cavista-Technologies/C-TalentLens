import { env } from '../config/env'
import { getAccessToken } from './authToken'

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

export class ApiError extends Error {
  public readonly status: number
  public readonly details?: unknown

  constructor(
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const headers = new Headers(options.headers)
  const token = getAccessToken()

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${env.apiBaseUrl}${normalizePath(path)}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    const details = await readResponseBody(response)
    throw new ApiError(getErrorMessage(details, response.statusText), response.status, details)
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}

function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`
}

async function readResponseBody(response: Response) {
  const contentType = response.headers.get('content-type')

  if (contentType?.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

function getErrorMessage(details: unknown, fallback: string) {
  if (isProblemDetails(details)) {
    return details.detail ?? details.title ?? fallback
  }

  return typeof details === 'string' && details.length > 0 ? details : fallback
}

function isProblemDetails(value: unknown): value is { title?: string; detail?: string } {
  return typeof value === 'object' && value !== null
}
