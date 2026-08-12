export type FollowUpAlertCategory =
  | 'nutrition'
  | 'attendance'
  | 'referral'
  | 'data_quality'

export type FollowUpAlertPriority = 'high' | 'medium' | 'low'

export interface FollowUpAlertMetricViewModel {
  label: string
  value: string
}

export interface FollowUpAlertViewModel {
  id: string
  category: FollowUpAlertCategory
  priority: FollowUpAlertPriority
  code: string
  title: string
  description: string
  centerId: string | null
  centerName: string | null
  childId: string | null
  childName: string | null
  entityType: string | null
  entityId: string | null
  detectedAt: string
  metrics: FollowUpAlertMetricViewModel[]
}

export interface FollowUpAlertsViewModel {
  items: FollowUpAlertViewModel[]
  total: number
  counts: {
    nutrition: number
    attendance: number
    referral: number
    data_quality: number
    high: number
  }
  districtId: string | null
  centerId: string | null
}
