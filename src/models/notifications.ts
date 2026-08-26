export type NotificationType =
  | 'transfer_request'
  | 'transfer_accepted'
  | 'transfer_cancelled'
  | 'child_enrolled'
  | 'child_archived'
  | 'assessment_due'
  | 'referral_created'
  | 'referral_updated'
  | 'nutrition_alert'
  | 'sted_followup'
  | 'compliance_update'
  | 'capacity_warning'
  | 'attendance_absence'
  | 'attendance_low_rate'
  | 'general'

export type NotificationEntityType =
  | 'child_transfer'
  | 'child'
  | 'child_nutrition_screening'
  | 'referral'
  | 'sted_assessment'
  | 'compliance_assessment'
  | 'ecd_center'
  | 'user_account'

export interface NotificationViewModel {
  id: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  readAt: string | null
  entityType: NotificationEntityType | null
  entityId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface NotificationListViewModel {
  items: NotificationViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  unreadCount: number
}

export interface NotificationListFilters {
  page?: number
  pageSize?: number
  type?: NotificationType
  isRead?: boolean
}
