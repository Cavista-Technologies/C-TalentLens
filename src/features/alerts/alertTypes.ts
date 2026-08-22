export type Alert = {
  id: string
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
  metadata: Record<string, string>
}
