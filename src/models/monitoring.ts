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
  childrenAssessed: number
  centersWithAssessments: number
  activeChildren: number
  coverage: number | null
  averageScore: number | null
  pendingFollowUps: number
  centersInScope: number
  ageBandDistribution: Record<string, number>
  outcomeDistribution: Record<string, number>
}

export interface MonitoringStedItemViewModel {
  centerId?: string
  centerName?: string
  districtId?: string
  districtName?: string
  assessmentsCompleted: number
  childrenAssessed?: number
  averageScore: number | null
}

export interface MonitoringStedViewModel extends MonitoringPagination {
  from: string
  to: string
  districtId: string | null
  centerId: string | null
  granularity: 'district' | 'center'
  summary: MonitoringStedSummaryViewModel
  items: MonitoringStedItemViewModel[]
}

// ─── Compliance aggregates ───────────────────────────────────────────────────

export interface MonitoringComplianceSummaryViewModel {
  totalAssessments: number
  centersAssessed: number
  centersInScope: number
  byStatus: Record<string, number>
  byType: Record<string, number>
  classificationPopulated: number
  byClassification: Record<string, number>
  /** ECD Standards ranks: green | blue | yellow | red */
  byRank: Record<string, number>
  classificationNullRate: number | null
}

export interface MonitoringComplianceCenterItemViewModel {
  assessmentId: string
  centerId: string
  centerName: string
  percent: number | null
  rank: string | null
  assessmentDate: string
}

export interface MonitoringComplianceViewModel {
  from: string
  to: string
  districtId: string | null
  centerId: string | null
  summary: MonitoringComplianceSummaryViewModel
  items: MonitoringComplianceCenterItemViewModel[]
}

// ─── WASH aggregates ─────────────────────────────────────────────────────────

export interface MonitoringWashSummaryViewModel {
  centersInScope: number
  reporting: {
    recordsInRange: number
    centersReporting: number
  }
  latestSnapshot: {
    centersWithData: number
    waterSourceAvailable: number
    sanitationFacilityAvailable: number
    handwashingFacilityAvailable: number
    wasteManagementAvailable: number
  }
}

export interface MonitoringWashViewModel {
  from: string
  to: string
  districtId: string | null
  centerId: string | null
  summary: MonitoringWashSummaryViewModel
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
