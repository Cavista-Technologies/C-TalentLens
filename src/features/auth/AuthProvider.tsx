import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { onSessionEnded, refreshAccessToken } from '../../lib/apiClient'
import {
  clearTokens,
  getAccessToken,
  getExpiresAt,
  getRefreshToken,
  setAccessToken,
  setExpiresAt,
  setRefreshToken,
} from '../../lib/authToken'
import { getCurrentUser, login as loginRequest, logout as logoutRequest } from './authApi'
import type { LoginRequest, UserProfile } from './authTypes'
import { AuthContext, type AuthStatus } from './authContext'

const refreshSafetyMarginMs = 60_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadCurrentUser() {
      const token = getAccessToken()

      if (!token) {
        setStatus('unauthenticated')
        return
      }

      try {
        const profile = await getCurrentUser()

        if (!isMounted) {
          return
        }

        setUser(profile)
        setStatus('authenticated')
      } catch {
        if (!isMounted) {
          return
        }

        clearTokens()
        setUser(null)
        setStatus('unauthenticated')
      }
    }

    void loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    onSessionEnded(() => {
      setUser(null)
      setStatus('unauthenticated')
    })

    return () => {
      onSessionEnded(null)
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const scheduleRefresh = () => {
      const expiresAt = getExpiresAt()
      const refreshToken = getRefreshToken()

      if (!expiresAt || !refreshToken) {
        return
      }

      const msUntilExpiry = new Date(expiresAt).getTime() - Date.now()
      const delay = Math.max(msUntilExpiry - refreshSafetyMarginMs, 0)

      timeoutId = setTimeout(() => {
        void (async () => {
          const result = await refreshAccessToken()
          if (cancelled) {
            return
          }

          if (!result) {
            clearTokens()
            setUser(null)
            setStatus('unauthenticated')
            return
          }

          scheduleRefresh()
        })()
      }, delay)
    }

    scheduleRefresh()

    return () => {
      cancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [status])

  async function login(request: LoginRequest) {
    const response = await loginRequest(request)
    setAccessToken(response.accessToken)
    setRefreshToken(response.refreshToken)
    setExpiresAt(response.expiresAt)
    setUser(response.user)
    setStatus('authenticated')
  }

  function logout() {
    const refreshToken = getRefreshToken()
    clearTokens()
    setUser(null)
    setStatus('unauthenticated')

    if (refreshToken) {
      void logoutRequest(refreshToken).catch(() => undefined)
    }
  }

  const value = useMemo(
    () => ({
      status,
      user,
      login,
      logout,
    }),
    [status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
