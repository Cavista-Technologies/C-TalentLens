export type DashboardResponse = {
  recruitmentOverview: RecruitmentOverview
  pipeline: PipelineDashboard
  timeToFill: TimeToFillDashboard
  slaCompliance: SlaComplianceDashboard
  risk: RiskDashboard
  bottlenecks: BottleneckDashboard
  actions: ActionDashboard
}

export type RecruitmentOverview = {
  totalOpenRoles: number
  closedRoles: number
  totalHiringGoals: number
  goalsFilled: number
  outstandingGoals: number
}

export type PipelineDashboard = {
  rolesInJobPosting: number
  rolesInPipeliningSourcing: number
  rolesInSparkHire: number
  rolesInInterviewStage: number
  rolesInRequestToHire: number
  rolesOfferedOrHired: number
  rolesFilled: number
}

export type TimeToFillDashboard = {
  averageTimeToFill: number
}

export type SlaComplianceDashboard = {
  complianceRate: number
  rolesWithinSla: number
  rolesApproachingSla: number
  rolesBreachingSla: number
  highPriorityRolesAtRisk: number
}

export type RiskDashboard = {
  overdueRoles: number
  rolesNearSlaBreach: number
  stalledRequisitions: number
  openBottlenecks: number
  items: RiskItem[]
}

export type RiskItem = {
  requisitionId: string
  requisitionCode: string
  roleName: string
  owner: string
  currentStatus: string
  daysOpen: number
  slaState: string
  isStalled: boolean
  openBottlenecks: number
}

export type BottleneckDashboard = {
  totalOpenBottlenecks: number
  escalatedBottlenecks: number
  highRiskBottlenecks: number
}

export type ActionDashboard = {
  totalOpenActions: number
  overdueActions: number
  highPriorityActions: number
  completionRate: number
}
