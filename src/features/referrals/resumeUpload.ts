import { env } from '../../config/env'

type CloudinaryUploadResponse = {
  secure_url?: string
  error?: {
    message?: string
  }
}

export async function uploadReferralResume(file: File) {
  if (!env.cloudinaryCloudName || !env.cloudinaryUploadPreset) {
    throw new Error('Resume upload is not configured.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', env.cloudinaryUploadPreset)
  formData.append('folder', 'talentlens/referrals')

  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
  })
  const body = (await response.json()) as CloudinaryUploadResponse

  if (!response.ok || !body.secure_url) {
    throw new Error(body.error?.message ?? 'Resume upload failed.')
  }

  return body.secure_url
}
