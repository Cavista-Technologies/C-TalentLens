export type Referral = {
  id: string
  requisitionId: string
  requisitionCode: string
  roleAppliedFor: string
  department: string
  recruiter: string
  referrerName: string
  referrerEmployeeId?: string | null
  referrerDepartment: string
  candidateName: string
  candidateEmail: string
  candidatePhoneNumber?: string | null
  resumeUrl?: string | null
  submitterEmail?: string | null
  submitterName?: string | null
  formStartedAt?: string | null
  formCompletedAt?: string | null
  candidateRelationship?: string | null
  candidateKnownDuration?: string | null
  candidateAlignmentComment?: string | null
  submissionDate: string
  status: string
  hiringOutcome: string
  hiredAt?: string | null
  createdAt: string
  history: ReferralHistory[]
}

export type ReferralHistory = {
  id: string
  eventType: string
  changedByUserId: string
  changedBy: string
  fromValue?: string | null
  toValue?: string | null
  notes?: string | null
  changedAt: string
}

export type ReferralQuery = {
  search?: string
  status?: string
  activeOnly?: boolean
}

export type CreateReferralRequest = {
  requisitionId: string
  referrerName: string
  referrerDepartment: string
  candidateName: string
  submissionDate: string
  status?: string
  hiringOutcome?: string
  hiredAt?: string | null
  referrerEmployeeId?: string | null
  candidateEmail?: string | null
  candidatePhoneNumber?: string | null
  resumeUrl?: string | null
  submitterEmail?: string | null
  submitterName?: string | null
  candidateRelationship?: string | null
  candidateKnownDuration?: string | null
  candidateAlignmentComment?: string | null
}

export type PublicRequisition = {
  id: string
  requisitionCode: string
  roleName: string
  department: string
}

export type CreatePublicReferralRequest = {
  requisitionId: string
  referrerName: string
  referrerEmail: string
  referrerDepartment: string
  candidateName: string
  candidateEmail: string
  candidatePhoneNumber?: string | null
  resumeUrl?: string | null
  candidateRelationship?: string | null
  candidateKnownDuration?: string | null
  candidateAlignmentComment?: string | null
}

export type UpdateReferralStatusRequest = {
  status: string
  hiringOutcome?: string | null
  hiredAt?: string | null
  notes?: string | null
}

export type ReferralAnalytics = {
  totalReferralsSubmitted: number
  activeReferrals: number
  referralHires: number
  overallConversionRate: number
  referralShareOfTotalHires: number
  topReferringDepartment?: string | null
  byReferrerDepartment: ReferralDepartmentMetric[]
  topReferrers: ReferralReferrerMetric[]
  funnel: ReferralFunnelMetric[]
  monthlyTrends: MonthlyReferralTrend[]
}

export type ReferralDepartmentMetric = {
  department: string
  referralsSubmitted: number
  referralHires: number
  conversionRate: number
}

export type ReferralReferrerMetric = {
  referrerName: string
  department: string
  referralsSubmitted: number
  referralHires: number
  conversionRate: number
}

export type ReferralFunnelMetric = {
  status: string
  count: number
}

export type MonthlyReferralTrend = {
  month: string
  referralsSubmitted: number
  referralHires: number
  conversionRate: number
  referralContributionPercentage: number
  submissionGrowthPercentage: number
  topReferringDepartments: NamedCount[]
  topReferrers: NamedCount[]
}

export type NamedCount = {
  name: string
  count: number
}

export type ImportResult = {
  totalRows: number
  importedCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  errors: ImportRowError[]
  importedIds: string[]
}

export type ImportRowError = {
  rowNumber: number
  errorCode: string
  message: string
}
