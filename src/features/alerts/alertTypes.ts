export type Alert = {
  id: string
  notificationId?: string
  type: string
  severity: string
  recipientUserId: string
  recipientName: string
  recipientRole: string
  requisitionId: string
  requisitionCode: string
  roleName: string
  message: string
  reason: string
  actionLabel: string
  createdAt: string
  lastDetectedAt: string
  isRead: boolean
  readAt: string | null
  metadata: Record<string, string>
}

export type AlertQuery = {
  severity?: string | null
  type?: string | null
  unreadOnly?: boolean
  page?: number
  pageSize?: number
}
