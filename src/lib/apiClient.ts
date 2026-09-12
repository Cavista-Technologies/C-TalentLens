import { env } from '../config/env'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setExpiresAt,
  setRefreshToken,
} from './authToken'

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

type SessionEndedListener = () => void

let sessionEndedListener: SessionEndedListener | null = null

export function onSessionEnded(listener: SessionEndedListener | null) {
  sessionEndedListener = listener
}

const authExemptPaths = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout']

type RefreshResult = {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

let refreshPromise: Promise<RefreshResult | null> | null = null

// Shared by apiClient's own reactive 401-retry and AuthProvider's proactive pre-expiry timer,
// so the two never issue overlapping /api/auth/refresh calls against the same refresh token.
export async function refreshAccessToken(): Promise<RefreshResult | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return null
  }

  refreshPromise ??= (async () => {
    try {
      const response = await fetch(`${env.apiBaseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        return null
      }

      const data = (await response.json()) as RefreshResult

      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      setExpiresAt(data.expiresAt)
      return data
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const normalizedPath = normalizePath(path)
  const isAuthExempt = authExemptPaths.some((exempt) => normalizedPath.startsWith(exempt))

  const send = async () => {
    const headers = new Headers(options.headers)
    const token = getAccessToken()

    if (options.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    return fetch(`${env.apiBaseUrl}${normalizedPath}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  }

  let response = await send()

  if (response.status === 401 && !isAuthExempt) {
    const refreshed = await refreshAccessToken()
    response = refreshed ? await send() : response
  }

  if (response.status === 401 && !isAuthExempt) {
    clearTokens()
    sessionEndedListener?.()
  }

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
