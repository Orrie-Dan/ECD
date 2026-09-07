export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical'

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

export interface NotificationContext {
  child?: {
    id: string
    name: string
  }
  center?: {
    id: string
    name: string
  }
  district?: {
    id?: string
    name?: string
  }
}

export interface NotificationAction {
  type: 'route'
  path: string
}

export interface NotificationViewModel {
  id: string
  type: string
  title: string
  message: string
  priority: NotificationPriority
  isRead: boolean
  readAt: string | null
  entityType: NotificationEntityType | string | null
  entityId: string | null
  entity: {
    type: string
    id: string
  } | null
  context: NotificationContext | null
  action: NotificationAction | null
  metadata: unknown
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
  type?: string
  isRead?: boolean
}
