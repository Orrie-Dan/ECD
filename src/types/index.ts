export type UserRole = 'caretaker' | 'districtOfficer'

export interface User {
  id: string
  name: string
  role: UserRole
  centerName?: string
  districtName?: string
}

export type Gender = 'Umuhungu' | 'Umukobwa'

export type GuardianRelation =
  | 'umubyeyi_mama'
  | 'umubyeyi_papa'
  | 'sekuru_nyirakuru'
  | 'nyirasenge_marume'
  | 'umuvandimwe'
  | 'umubyeyi_urera'
  | 'umurinzi_wemewe'
  | 'ikindi'

export type BroughtBy = GuardianRelation

export interface Child {
  id: string
  fullName: string
  dateOfBirth: string
  gender: Gender
  specialNeeds?: string
  guardianName: string
  guardianPhone: string
  guardianRelation: GuardianRelation
  guardian2Name?: string
  guardian2Phone?: string
  guardian2Relation?: GuardianRelation
  province: string
  district: string
  sector: string
  cell: string
  village: string
  registeredAt: string
}

export interface AttendanceRecord {
  id: string
  childId: string
  date: string
  present: boolean
  broughtBy?: BroughtBy
  broughtByOther?: string
  arrivedAt?: string
}

export interface PageParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const DEFAULT_PAGE_SIZE = 10

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

export interface EcdCenter {
  id: string
  name: string
  sector: string
  cell: string
  children: number
  caretaker: string
  attendance: number
  submittedToday: boolean
  enrollmentChange: number
}

export type CenterAlertType =
  | 'low_attendance'
  | 'no_submission'
  | 'attendance_drop'
  | 'enrollment_decrease'

/** @deprecated Use ActionAlert for the Gukurikirana action center */
export interface CenterAlert {
  id: string
  centerId: string
  centerName: string
  sector: string
  type: CenterAlertType
  value?: number
}

export type ActionAlertCategory = 'attendance' | 'enrollment' | 'data_quality' | 'operational'

export type ActionAlertPriority = 'high' | 'medium' | 'low'

export type ActionAlertType =
  | 'low_attendance'
  | 'attendance_decreasing'
  | 'no_submission'
  | 'high_dropout'
  | 'declining_enrollment'
  | 'no_new_registrations'
  | 'missing_info'
  | 'incomplete_registration'
  | 'records_verification'
  | 'stale_records'
  | 'unusual_activity'

export interface ActionAlertMetric {
  label: string
  value: string
}

export interface ActionAlert {
  id: string
  centerId: string
  centerName: string
  sector: string
  category: ActionAlertCategory
  type: ActionAlertType
  priority: ActionAlertPriority
  description: string
  suggestedAction: string
  metrics?: ActionAlertMetric[]
}

export type TrendDirection = 'up' | 'down' | 'stable'

export type EnrollmentPeriod = 'today' | 'week' | 'month' | 'year'

export interface EnrollmentMetricTrend {
  direction: TrendDirection
  change: number
}

export interface EnrollmentPeriodSummary {
  totalEnrolled: number
  newRegistrations: number
  dropouts: number
  netGrowth: number
  trends: {
    totalEnrolled: EnrollmentMetricTrend
    newRegistrations: EnrollmentMetricTrend
    dropouts: EnrollmentMetricTrend
    netGrowth: EnrollmentMetricTrend
  }
}

export interface EnrollmentTrendPoint {
  label: string
  newRegistrations: number
  dropouts: number
  netEnrollment: number
}

export interface EnrollmentCenterRanking {
  id: string
  name: string
  sector: string
  count: number
}

export interface EnrollmentFollowupItem {
  id: string
  centerId: string
  centerName: string
  sector: string
  insights: string[]
}

export interface EnrollmentGeoArea {
  area: string
  value: number
  label: string
}

export interface ChildRegistrationForm {
  fullName: string
  dateOfBirth: string
  gender: Gender | ''
  specialNeeds: string
  guardianName: string
  guardianPhone: string
  guardianRelation: GuardianRelation | ''
  guardian2Name: string
  guardian2Phone: string
  guardian2Relation: GuardianRelation | ''
  province: string
  district: string
  sector: string
  cell: string
  village: string
}
