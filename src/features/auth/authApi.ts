import { apiRequest } from '../../lib/apiClient'
import type { LoginRequest, LoginResponse, UserProfile } from './authTypes'

export function login(request: LoginRequest) {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: request,
  })
}

export function getCurrentUser() {
  return apiRequest<UserProfile>('/api/auth/me')
}

export function logout(refreshToken: string) {
  return apiRequest<void>('/api/auth/logout', {
    method: 'POST',
    body: { refreshToken },
  })
}
