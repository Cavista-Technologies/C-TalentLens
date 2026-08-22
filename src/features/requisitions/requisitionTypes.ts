export type Requisition = {
  id: string
  requisitionCode: string
  roleName: string
  department: string
  hiringManagerUserId: string
  hiringManager: string
  recruiterUserId: string
  recruiter: string
  priority: string
  dateOpened: string
  advertisementDate: string
  hiringGoal: number
  openingReason: string
  customOpeningReason?: string | null
  postingType: string
  statusComment?: string | null
  hiringManagerNotes?: string | null
  filledGoal: number
  remainingGoal: number
  currentStatus: string
  offerExtendedDate?: string | null
  closedDate?: string | null
  daysOpen: number
  slaState: string
  isStalled: boolean
  stageHistory: StageTransition[]
  bottlenecks: Bottleneck[]
  actionItems: ActionItem[]
}

export type StageTransition = {
  id: string
  status: string
  enteredAt: string
  exitedAt?: string | null
  daysInStage: number
}

export type Bottleneck = {
  id: string
  title: string
  reason: string
  category: string
  customCategory?: string | null
  description: string
  priority: string
  businessImpact: string
  ownerUserId: string
  owner: string
  status: string
  createdAt: string
  resolvedAt?: string | null
  daysOpen: number
  resolutionSummary?: string | null
  lessonsLearned?: string | null
  resolutionOwnerUserId?: string | null
  resolutionOwner?: string | null
}

export type ActionItem = {
  id: string
  title: string
  description: string
  category: string
  customCategory?: string | null
  priority: string
  ownerUserId: string
  owner: string
  dueDate?: string | null
  status: string
  createdAt: string
  completedAt?: string | null
  completedByUserId?: string | null
  completedBy?: string | null
  completionNotes?: string | null
  daysOverdue: number
}

export type RequisitionQuery = {
  page?: number
  pageSize?: number
  search?: string
  openOnly?: boolean
  overdueOnly?: boolean
  nearSlaBreach?: boolean
}

export type CreateRequisitionRequest = {
  requisitionCode: string
  roleName: string
  department: string
  hiringManagerUserId: string
  recruiterUserId: string
  priority: string
  dateOpened: string
  advertisementDate: string
  hiringGoal: number
  openingReason: string
  customOpeningReason?: string | null
  postingType: string
  statusComment?: string | null
  hiringManagerNotes?: string | null
}

export type UpdateRequisitionRequest = Omit<CreateRequisitionRequest, 'requisitionCode'> & {
  filledGoal: number
}

export type UpdateRequisitionStatusRequest = {
  status: string
  effectiveDate?: string | null
}

export type CreateBottleneckRequest = {
  reason: string
  ownerUserId: string
  category: string
  customCategory?: string | null
  description?: string | null
  priority: string
  businessImpact?: string | null
  dateIdentified?: string | null
}

export type CreateActionItemRequest = {
  description: string
  ownerUserId: string
  dueDate?: string | null
  title?: string | null
  category: string
  customCategory?: string | null
  priority: string
}

export type CompleteActionItemRequest = {
  completionNotes?: string | null
}

export type ResolveBottleneckRequest = {
  resolutionSummary: string
  lessonsLearned?: string | null
}
