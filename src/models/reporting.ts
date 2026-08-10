/**
 * UI-facing reporting ViewModels.
 * Prefer dedicated /reports/* shapes; reuse monitoring for attendance/nutrition aggregates.
 */

export interface ReportingScopeFilters {
  districtId?: string
  centerId?: string
  sectorId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface ReportingPagination {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface EnrollmentReportSummaryViewModel {
  totalEnrolled: number
  active: number
  archived: number
  transferred: number
  newRegistrations: number
}

export interface EnrollmentTrendPointViewModel {
  date: string
  newRegistrations: number
}

export interface EnrollmentReportViewModel {
  from: string
  to: string
  districtId: string | null
  centerId: string | null
  summary: EnrollmentReportSummaryViewModel
  trend: EnrollmentTrendPointViewModel[]
}

export interface DropoutInterpretationViewModel {
  dropoutDefinition: string
  excluded: string
  note: string
}

export interface DropoutSummaryViewModel {
  dropouts: number
  transfersOut: number
}

export interface DropoutItemViewModel {
  childId: string
  childName: string
  centerId: string
  centerName: string
  archivedAt?: string
  archiveReason?: string
}

export interface DropoutsReportViewModel extends ReportingPagination {
  from: string
  to: string
  districtId: string | null
  interpretation: DropoutInterpretationViewModel
  summary: DropoutSummaryViewModel
  items: DropoutItemViewModel[]
}

export interface CenterReportAttendanceViewModel {
  present: number
  absent: number
  rate: number | null
}

export interface CenterReportItemViewModel {
  centerId: string
  centerCode: string
  centerName: string
  status: 'active' | 'inactive'
  enrolledChildren: number
  attendance: CenterReportAttendanceViewModel
  nutritionSevereScreenings: number
  feedingDaysRecorded: number
  referralsPending: number
  stedAssessmentsCompleted: number
}

export interface CentersReportViewModel extends ReportingPagination {
  from: string
  to: string
  districtId: string | null
  items: CenterReportItemViewModel[]
}

export interface DistrictReportKpisViewModel {
  centersInScope: number
  activeChildren: number
  newRegistrations: number
  dropouts: number
  attendanceRate: number | null
  nutritionScreenings: number
  severeNutrition: number
  pendingReferrals: number
  feedingDaysRecorded: number
  stedAssessments: number
}

export interface DistrictReportViewModel {
  from: string
  to: string
  districtId: string | null
  kpis: DistrictReportKpisViewModel
}

/** UI-facing attendance comparison row (preserves ReportsPage table shape). */
export interface AttendanceReportCenterRowViewModel {
  centerId: string
  centerName: string
  sector: string
  enrolledChildren: number
  rate: number
  present: number
  absent: number
  totalRecords: number
  submittedToday: boolean
}

export interface AttendanceReportSummaryViewModel {
  total: number
  present: number
  absent: number
  unrecorded: number
  rate: number
  lateArrivals: number | null
}

export type ReportPreviewKind =
  | 'attendance'
  | 'enrollment'
  | 'dropouts'
  | 'centers'
  | 'sectors'
  | 'nutritionCoverage'
  | 'nutritionStatus'
  | 'nutritionCenters'
  | 'nutritionTrends'
