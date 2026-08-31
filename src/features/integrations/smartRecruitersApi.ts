import { apiRequest } from '../../lib/apiClient'

export type SmartRecruitersSyncResult = {
  totalJobs: number
  createdCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  items: SmartRecruitersSyncItem[]
  errors: SmartRecruitersSyncError[]
}

export type SmartRecruitersSyncItem = {
  requisitionId: string
  requisitionCode: string
  externalJobId: string
  roleName: string
  team: string
  action: string
}

export type SmartRecruitersSyncError = {
  externalJobId: string
  roleName: string
  message: string
}

export function syncSmartRecruitersJobs() {
  return apiRequest<SmartRecruitersSyncResult>('/api/integrations/smartrecruiters/jobs/sync', {
    method: 'POST',
  })
}
