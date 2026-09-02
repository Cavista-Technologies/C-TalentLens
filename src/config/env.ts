const fallbackApiBaseUrl = 'https://c-talentlens-be-latest.onrender.com'

export const env = {
  apiBaseUrl: trimTrailingSlash(readEnvValue(import.meta.env.VITE_API_BASE_URL) || fallbackApiBaseUrl),
  cloudinaryCloudName: readEnvValue(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME),
  cloudinaryUploadPreset: readEnvValue(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET),
}

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function readEnvValue(value: string | undefined) {
  return value?.trim() ?? ''
}
