/**
 * UI-facing monitoring / analytics read models.
 * Components consume these; never import monitoring*Dto types in UI.
 */

export interface MonitoringScopeFilters {
  districtId?: string
  centerId?: string
  sectorId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

/** Shared date-scope filter used by monitoring queries (UI → resource). */
export type MonitoringDateFilters = Pick<
  MonitoringScopeFilters,
  'districtId' | 'centerId' | 'sectorId' | 'from' | 'to'
>

export interface MonitoringPagination {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Dashboard (analytics) ───────────────────────────────────────────────────

export interface MonitoringDashboardViewModel {
  from: string
  to: string
  districtId: string | null
  centerId: string | null
  centersInScope: number
  children: {
    total: number
    active: number
    archived: number
    transferred: number
  }
  attendance: {
    present: number
    absent: number
    totalRecords: number
    rate: number | null
    centersReporting: number
  }
  nutrition: {
    screenings: number
    severe: number
    moderate: number
    atRisk: number
    normal: number
    requiresReferral: number
  }
  referrals: {
    created: number
    pending: number
    completed: number
    cancelled: number
  }
  feeding: {
    daysRecorded: number
    daysWithMilk: number
    daysWithPorridge: number
    daysWithBalancedMeal: number
    centersReporting: number
  }
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export interface MonitoringAttendanceSummaryViewModel {
  enrolledChildren: number
  present: number
  absent: number
  totalRecords: number
  attendanceRate: number | null
}

export interface MonitoringAttendanceTrendPointViewModel {
  date: string
  present: number
  absent: number
  rate: number | null
}

export interface MonitoringAttendanceCenterItemViewModel {
  centerId: string
  centerName: string
  enrolledChildren: number
  present: number
  absent: number
  rate: number | null
}

export interface MonitoringAttendanceViewModel extends MonitoringPagination {
  from: string
  to: string
  districtId: string | null
  centerId: string | null
  sectorId: string | null
  summary: MonitoringAttendanceSummaryViewModel
  trend: MonitoringAttendanceTrendPointViewModel[]
  items: MonitoringAttendanceCenterItemViewModel[]
}

// ─── Nutrition (covers growth/MUAC monitoring — no /monitoring/growth) ───────

export interface MonitoringNutritionSummaryViewModel {
  activeChildren: number
  screenings: number
  severe: number
  moderate: number
  atRisk: number
  normal: number
  requiresReferral: number
  overdueScreenings: number
  neverScreened: number
  screeningCoverage: number | null
}

export interface MonitoringNutritionCenterItemViewModel {
  centerId: string
  centerName: string
  screenings: number
  severe: number
  moderate: number
  atRisk: number
  normal: number
}

export interface MonitoringNutritionViewModel extends MonitoringPagination {
  from: string
  to: string
  districtId: string | null
  centerId: string | null
  summary: MonitoringNutritionSummaryViewModel
  items: MonitoringNutritionCenterItemViewModel[]
}

// ─── Feeding ─────────────────────────────────────────────────────────────────

export interface MonitoringFeedingSummaryViewModel {
  daysRecorded: number
  daysWithMilk: number
  daysWithPorridge: number
  daysWithBalancedMeal: number
  reportingCenters: number
  centersInScope: number
  expectedDayRecords: number
  feedingCoverage: number | null
  centersMissingReports: number
}

export interface MonitoringFeedingCenterItemViewModel {
  centerId: string
  centerName: string
  daysRecorded: number
  expectedDays: number
  missingDays: number
  coverage: number | null
}

export interface MonitoringFeedingViewModel extends MonitoringPagination {
  from: string
  to: string
  districtId: string | null
  centerId: string | null
  summary: MonitoringFeedingSummaryViewModel
  items: MonitoringFeedingCenterItemViewModel[]
}

// ─── STED ────────────────────────────────────────────────────────────────────

export interface MonitoringStedSummaryViewModel {
  assessmentsCompleted: number
  activeChildren: number
  coverage: number | null
  averageScore: number | null
  pendingFollowUps: number
  ageBandDistribution: Record<string, number>
  outcomeDistribution: Record<string, number>
}

export interface MonitoringStedCenterItemViewModel {
  centerId: string
  centerName: string
  assessmentsCompleted: number
  averageScore: number | null
}

export interface MonitoringStedViewModel extends MonitoringPagination {
  from: string
  to: string
  districtId: string | null
  centerId: string | null
  summary: MonitoringStedSummaryViewModel
  items: MonitoringStedCenterItemViewModel[]
}

// ─── Referrals ───────────────────────────────────────────────────────────────

export interface MonitoringReferralsSummaryViewModel {
  created: number
  pending: number
  completed: number
  cancelled: number
  overdue: number
  averageCompletionDays: number | null
}

export interface MonitoringReferralsCenterItemViewModel {
  centerId: string
  centerName: string
  pending: number
  completed: number
  overdue: number
}

export interface MonitoringReferralsViewModel extends MonitoringPagination {
  from: string
  to: string
  districtId: string | null
  centerId: string | null
  summary: MonitoringReferralsSummaryViewModel
  items: MonitoringReferralsCenterItemViewModel[]
}
