export type SourceAnalytics = {
  totalSourceActivities: number
  totalHires: number
  overallConversionRate: number
  sources: SourceMetric[]
  monthlyTrends: MonthlySourceTrend[]
}

export type SourceMetric = {
  source: string
  activities: number
  hires: number
  sourceContributionPercentage: number
  sourceToHireConversionRate: number
}

export type MonthlySourceTrend = {
  month: string
  source: string
  activities: number
  hires: number
}

export type HiringTrendResponse = {
  monthlyTrends: MonthlyHiringTrend[]
}

export type MonthlyHiringTrend = {
  month: string
  rolesOpened: number
  rolesFilled: number
  hiringGoalOpened: number
  averageTimeToFill: number
  sourceHires: number
  referralHires: number
}

export type LeadershipSummary = {
  executiveKpis: ExecutiveKpis
  riskSummary: LeadershipRiskSummary
  insights: ExecutiveInsight[]
}

export type ExecutiveKpis = {
  totalOpenRoles: number
  totalClosedRoles: number
  totalHiringGoals: number
  totalFilledPositions: number
  outstandingPositions: number
  averageTimeToFill: number
  activeRecruiters: number
  slaComplianceRate: number
}

export type LeadershipRiskSummary = {
  totalAtRiskRequisitions: number
  highRiskRoles: number
  criticalRiskRoles: number
  averageRiskScore: number
  rolesBreachingSla: number
  stalledRequisitions: number
  openBottlenecks: number
  escalationsRequired: number
}

export type ExecutiveInsight = {
  code: string
  message: string
  severity: string
}
