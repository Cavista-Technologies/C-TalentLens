export type LoginRequest = {
  email: string
  password: string
}

export type UserProfile = {
  id: string
  email: string
  fullName: string
  department?: string | null
  reportingLine?: string | null
  roles: string[]
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresAt: string
  user: UserProfile
}
