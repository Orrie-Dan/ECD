import { ECD_CENTERS } from '@/lib/mock-data'
import {
  buildCenterAttendanceComparison,
  computeDistrictAttendanceSummary,
} from '@/lib/attendance-utils'
import type {
  AttendanceReportCenterRowViewModel,
  AttendanceReportSummaryViewModel,
  CentersReportViewModel,
  DistrictReportViewModel,
  DropoutsReportViewModel,
  EnrollmentReportViewModel,
} from '@/models/reporting'
import type { MonitoringAttendanceViewModel } from '@/models/monitoring'
import type { MonitoringNutritionViewModel } from '@/models/monitoring'
import { roundPct } from './filters'

/** MOCK attendance comparison preserving existing ReportsPage UX. */
export function buildMockAttendanceReportRows(
  dateFrom: string,
  dateTo: string,
  sector: string,
  search: string,
): {
  rows: AttendanceReportCenterRowViewModel[]
  summary: AttendanceReportSummaryViewModel
} {
  const q = search.trim().toLowerCase()
  let centers = ECD_CENTERS
  if (sector !== 'all') {
    centers = centers.filter((c) => c.sector === sector)
  }
  if (q) {
    centers = centers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q) ||
        c.cell.toLowerCase().includes(q),
    )
  }
  const comparison = buildCenterAttendanceComparison(centers, dateFrom, dateTo)
  const summary = computeDistrictAttendanceSummary(comparison)
  return {
    rows: comparison.map((row) => ({
      centerId: row.center.id,
      centerName: row.center.name,
      sector: row.center.sector,
      enrolledChildren: row.center.children,
      rate: row.rate,
      present: row.presentEstimate,
      absent: row.absentEstimate,
      totalRecords: row.totalRecords,
      submittedToday: row.center.submittedToday,
    })),
    summary: {
      total: summary.total,
      present: summary.present,
      absent: summary.absent,
      unrecorded: summary.unrecorded,
      rate: summary.rate,
      lateArrivals: summary.lateArrivals,
    },
  }
}

/** Map monitoring attendance → report comparison rows (canonical LIVE attendance KPIs). */
export function mapMonitoringAttendanceToReportRows(
  data: MonitoringAttendanceViewModel,
): {
  rows: AttendanceReportCenterRowViewModel[]
  summary: AttendanceReportSummaryViewModel
} {
  const rows = data.items.map((item) => ({
    centerId: item.centerId,
    centerName: item.centerName,
    sector: '—',
    enrolledChildren: item.enrolledChildren,
    rate: roundPct(item.rate),
    present: item.present,
    absent: item.absent,
    totalRecords: item.present + item.absent,
    submittedToday: item.present + item.absent > 0,
  }))
  return {
    rows,
    summary: {
      total: data.summary.totalRecords,
      present: data.summary.present,
      absent: data.summary.absent,
      unrecorded: 0,
      rate: roundPct(data.summary.attendanceRate),
      lateArrivals: null,
    },
  }
}

export function buildMockEnrollmentReport(
  dateFrom: string,
  dateTo: string,
): EnrollmentReportViewModel {
  return {
    from: dateFrom,
    to: dateTo,
    districtId: null,
    centerId: null,
    summary: {
      totalEnrolled: ECD_CENTERS.reduce((s, c) => s + c.children, 0),
      active: ECD_CENTERS.reduce((s, c) => s + c.children, 0),
      archived: 12,
      transferred: 4,
      newRegistrations: 28,
    },
    trend: [],
  }
}

export function buildMockDropoutsReport(
  dateFrom: string,
  dateTo: string,
): DropoutsReportViewModel {
  return {
    from: dateFrom,
    to: dateTo,
    districtId: null,
    interpretation: {
      dropoutDefinition: 'Archived children in period',
      excluded: 'Transfers out',
      note: 'Mock dropout report',
    },
    summary: { dropouts: 12, transfersOut: 4 },
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  }
}

export function buildMockCentersReport(
  dateFrom: string,
  dateTo: string,
): CentersReportViewModel {
  const items = ECD_CENTERS.slice(0, 20).map((c) => ({
    centerId: c.id,
    centerCode: c.id,
    centerName: c.name,
    status: 'active' as const,
    enrolledChildren: c.children,
    attendance: {
      present: Math.round((c.children * c.attendance) / 100),
      absent: Math.round((c.children * (100 - c.attendance)) / 100),
      rate: c.attendance,
    },
    nutritionSevereScreenings: 0,
    feedingDaysRecorded: 0,
    referralsPending: 0,
    stedAssessmentsCompleted: 0,
  }))
  return {
    from: dateFrom,
    to: dateTo,
    districtId: null,
    items,
    total: items.length,
    page: 1,
    pageSize: items.length,
    totalPages: 1,
  }
}

export function buildMockDistrictReport(
  dateFrom: string,
  dateTo: string,
): DistrictReportViewModel {
  return {
    from: dateFrom,
    to: dateTo,
    districtId: null,
    kpis: {
      centersInScope: ECD_CENTERS.length,
      activeChildren: ECD_CENTERS.reduce((s, c) => s + c.children, 0),
      newRegistrations: 28,
      dropouts: 12,
      attendanceRate: 79,
      nutritionScreenings: 120,
      severeNutrition: 8,
      pendingReferrals: 15,
      feedingDaysRecorded: 40,
      stedAssessments: 22,
    },
  }
}

export function nutritionPreviewCards(data: MonitoringNutritionViewModel | undefined) {
  if (!data) return []
  const s = data.summary
  return [
    { label: 'Coverage', value: `${roundPct(s.screeningCoverage)}%` },
    { label: 'Screenings', value: String(s.screenings) },
    { label: 'Severe', value: String(s.severe) },
    { label: 'Overdue', value: String(s.overdueScreenings) },
  ]
}
