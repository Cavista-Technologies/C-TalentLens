export const requisitionPriorities = ['High', 'Medium', 'Low']
export const requisitionStatuses = ['Active', 'Hold', 'Closed']
export const pipelineStages = ['JobPosting', 'PipeliningSourcing', 'SparkHire', 'Interview', 'RequestToHire', 'OfferedHired']
export const recruitmentTeams = [
  'Talent',
  'Engineering',
  'Product',
  'ClientExperience',
  'People',
  'ITInfrastructure',
  'Operations',
  'Creative',
  'MarketingAndCommunications',
  'Sales',
]
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
  const displayNames: Record<string, string> = {
    ClientExperience: 'Client Experience',
    ITInfrastructure: 'IT/Infrastructure',
    MarketingAndCommunications: 'Marketing and Communications',
    JobPosting: 'JD / Job Posting',
    PipeliningSourcing: 'Pipelining / Sourcing',
    SparkHire: 'Spark Hire',
    RequestToHire: 'Request-to-Hire',
    OfferedHired: 'Offered / Hired',
    InternalAndExternal: 'Internal and External',
    NewRole: 'New Role',
  }

  if (displayNames[value]) {
    return displayNames[value]
  }

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
