import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { clearAccessToken, getAccessToken, setAccessToken } from '../../lib/authToken'
import { getCurrentUser, login as loginRequest } from './authApi'
import type { LoginRequest, UserProfile } from './authTypes'
import { AuthContext, type AuthStatus } from './authContext'

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

        clearAccessToken()
        setUser(null)
        setStatus('unauthenticated')
      }
    }

    void loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  async function login(request: LoginRequest) {
    const response = await loginRequest(request)
    setAccessToken(response.accessToken)
    setUser(response.user)
    setStatus('authenticated')
  }

  function logout() {
    clearAccessToken()
    setUser(null)
    setStatus('unauthenticated')
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
