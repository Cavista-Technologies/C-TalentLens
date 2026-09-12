const accessTokenKey = 'talentlens.accessToken'
const refreshTokenKey = 'talentlens.refreshToken'
const expiresAtKey = 'talentlens.expiresAt'

export function getAccessToken() {
  return window.localStorage.getItem(accessTokenKey)
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(accessTokenKey, token)
}

export function getRefreshToken() {
  return window.localStorage.getItem(refreshTokenKey)
}

export function setRefreshToken(token: string) {
  window.localStorage.setItem(refreshTokenKey, token)
}

export function getExpiresAt() {
  return window.localStorage.getItem(expiresAtKey)
}

export function setExpiresAt(expiresAt: string) {
  window.localStorage.setItem(expiresAtKey, expiresAt)
}

export function clearAccessToken() {
  window.localStorage.removeItem(accessTokenKey)
}

export function clearTokens() {
  window.localStorage.removeItem(accessTokenKey)
  window.localStorage.removeItem(refreshTokenKey)
  window.localStorage.removeItem(expiresAtKey)
}
