export const requisitionPriorities = ['High', 'Medium', 'Low']
export const requisitionStatuses = ['Open', 'Sourcing', 'Screening', 'Interviewing', 'OfferStage', 'OfferExtended', 'Closed', 'Cancelled']
export const openingReasons = ['Expansion', 'Backfill', 'Replacement', 'NewRole', 'Other']
export const postingTypes = ['Internal', 'External', 'InternalAndExternal']
export const bottleneckCategories = [
  'HiringManagerDelay',
  'CandidateDelay',
  'CompensationMisalignment',
  'StakeholderMisalignment',
  'SchedulingDelay',
  'ApprovalDelay',
  'TalentShortage',
  'BudgetConstraint',
  'Other',
]
export const bottleneckPriorities = ['Low', 'Medium', 'High', 'Critical']
export const actionCategories = [
  'CandidateFollowUp',
  'HiringManagerFeedback',
  'InterviewScheduling',
  'OfferApproval',
  'CompensationReview',
  'LeadershipEscalation',
  'BottleneckResolution',
  'DocumentationReview',
  'Other',
]
export const actionPriorities = ['Low', 'Medium', 'High', 'Critical']

export function formatValue(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2')
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
