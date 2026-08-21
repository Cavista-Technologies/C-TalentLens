const tokenStorageKey = 'talentlens.accessToken'

export function getAccessToken() {
  return window.localStorage.getItem(tokenStorageKey)
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(tokenStorageKey, token)
}

export function clearAccessToken() {
  window.localStorage.removeItem(tokenStorageKey)
}
