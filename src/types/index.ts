/** Application (UI) roles — normalized from backend JWT roles via `normalizeRole`. */
export type UserRole = 'caretaker' | 'districtOfficer' | 'ncda'

export interface User {
  id: string
  name: string
  role: UserRole
  centerId?: string
  centerName?: string
  districtId?: string
  districtName?: string
}

export type Gender = 'Umuhungu' | 'Umukobwa'

export type ChildStatus = 'active' | 'transferred' | 'archived'

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

export type AbsentReason = 'sick' | 'family' | 'transport' | 'weather' | 'other'

export type AttendanceDayStatus = 'present' | 'absent' | 'unrecorded'

export type ArchiveReason =
  | 'age_out'
  | 'moved_away'
  | 'guardian_request'
  | 'duplicate'
  | 'other'

export type TransferReason =
  | 'relocation'
  | 'guardian_request'
  | 'centre_capacity'
  | 'other'

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
  /** Lifecycle status for child management */
  status: ChildStatus
  /** Placeholder registration number until backend issues real IDs */
  registrationNumber: string
  centerId: string
  centerName: string
  transferredAt?: string
  transferredToCenterId?: string
  transferredToCenterName?: string
  transferReason?: string
  transferNotes?: string
  /** Set when destination centre accepts an incoming transfer */
  transferAcceptedAt?: string
  archivedAt?: string
  archiveReason?: string
  archiveNotes?: string
  /** LIVE API optimistic-lock version */
  version?: number
  /** LIVE API home village admin-unit UUID */
  homeVillageId?: string
}

export interface TransferChildInput {
  destinationCenterId: string
  destinationCenterName: string
  transferDate: string
  reason: TransferReason
  notes?: string
}

export interface ArchiveChildInput {
  reason: ArchiveReason
  notes?: string
}

export interface AttendanceRecord {
  id: string
  childId: string
  date: string
  present: boolean
  broughtBy?: BroughtBy
  broughtByOther?: string
  arrivedAt?: string
  /** Required when present is false */
  absentReason?: AbsentReason
  /** Notes for absent "other" or optional context */
  notes?: string
  /** Display name of caretaker who recorded the entry (LIVE may briefly show user id). */
  recordedBy?: string
  /** LIVE API optimistic-lock version */
  version?: number
  /** LIVE API center scope */
  centerId?: string
}

/** Simple MUAC-based nutrition classification (no WHO z-scores). */
export type NutritionStatus = 'normal' | 'at_risk' | 'moderate' | 'severe'

export type AssessmentDueStatus = 'up_to_date' | 'due' | 'overdue' | 'never'

/** Form VII routine fields: weightKg + muacCm. heightCm / headCircumferenceCm retained for future use. */
export interface GrowthMeasurement {
  id: string
  childId: string
  date: string
  weightKg: number
  /** Not collected in Form VII UI; retained for future enhancements. */
  heightCm: number
  muacCm: number
  /** Not collected in Form VII UI; retained for future enhancements. */
  headCircumferenceCm?: number
  notes?: string
  recordedBy?: string
  /** LIVE API optimistic-lock version (nutrition screening). */
  version?: number
}

export interface NutritionAssessment {
  id: string
  childId: string
  measurementId: string
  date: string
  status: NutritionStatus
  requiresReferral: boolean
  notes?: string
}

export type ReferralStatus = 'pending' | 'completed' | 'cancelled'

export type ReferralSourceType = 'nutrition' | 'sted'

export interface Referral {
  id: string
  childId: string
  assessmentId: string
  sourceType: ReferralSourceType
  date: string
  reason: string
  status: ReferralStatus
  destination: string
  implementedAt?: string
  notes?: string
}

/** Center-level daily feeding log (Form VI — Imirire). */
export interface CenterFeedingDay {
  id: string
  centerId: string
  date: string
  milkServed: boolean
  porridgeServed: boolean
  balancedMealServed: boolean
  composition?: BalancedMealComposition
  recordedBy?: string
}

/** Six food groups required for Indyo yuzuye (Icyitonderwa). */
export interface BalancedMealComposition {
  cerealsOrTubers: boolean
  legumes: boolean
  dairy: boolean
  animalProducts: boolean
  fruitsVegetables: boolean
  addedFat: boolean
}

export interface CenterFeedingMonthSummary {
  id: string
  centerId: string
  yearMonth: string
  milkLiters: number
  flourKg: number
  foodSource: string
  updatedAt?: string
  updatedBy?: string
}

export type StedAgeBand = '1_3' | '4_6'

export type StedAnswer = 'yego' | 'oya'

export type StedBodyPartStatus = 'normal' | 'problem'

export type StedPhysicalPart =
  | 'headFace'
  | 'neck'
  | 'arms'
  | 'chest'
  | 'abdomenBack'
  | 'hips'
  | 'legsFeet'
  | 'genitals'
  | 'skinHair'

export type StedPhysicalCheck = Record<StedPhysicalPart, StedBodyPartStatus>

export interface StedOutcome {
  normal: boolean
  referred: boolean
  counseling: boolean
  other: boolean
  otherText?: string
  followUpIn6Months: boolean
  followUpDueDate?: string
}

export interface StedAssessment {
  id: string
  childId: string
  centerId: string
  assessmentDate: string
  ageBand: StedAgeBand
  consentObtained: boolean
  physical: StedPhysicalCheck
  noProblem: boolean
  milestones: Record<string, StedAnswer>
  outcome: StedOutcome
  assessedBy?: string
  notes?: string
  referralReason?: string
  referralDestination?: string
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

export type ActionAlertCategory =
  | 'attendance'
  | 'enrollment'
  | 'data_quality'
  | 'operational'
  | 'nutrition'

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
  | 'missed_assessment'
  | 'high_risk_nutrition'
  | 'referral_required'

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
