import { env } from '@/config/env'
import { ECD_CENTERS } from '@/lib/mock-data'
import { getDashboardStatsForRange } from '@/lib/dashboard-period-data'
import {
  buildCenterDailyAttendanceRows,
  summarizeSubmissionStatuses,
} from '@/lib/district-attendance'
import { getTodayDate } from '@/lib/attendance-utils'
import {
  computeCenterFeedingComparison,
  computeFeedingDistrictSummary,
} from '@/lib/feeding-utils'
import {
  computeCenterGrowthComparison,
  computeGrowthSummary,
  computeNutritionStatusCounts,
} from '@/lib/nutrition-utils'
import {
  computeCenterReferralComparison,
  computeReferralDistrictSummary,
} from '@/lib/referral-utils'
import {
  computeCenterStedComparison,
  computeStedDistrictSummary,
} from '@/lib/sted-utils'
import type {
  MonitoringAttendanceViewModel,
  MonitoringDashboardViewModel,
  MonitoringFeedingViewModel,
  MonitoringNutritionViewModel,
  MonitoringReferralsViewModel,
  MonitoringStedViewModel,
} from '@/models/monitoring'
import type {
  Child,
  CenterFeedingDay,
  CenterFeedingMonthSummary,
  GrowthMeasurement,
  NutritionAssessment,
  Referral,
  StedAssessment,
} from '@/types'
import { roundPct } from './filters'

/**
 * MOCK bridges — preserve existing district monitoring UX using local lib aggregations.
 * LIVE pages must not call these; they use monitoring API view models instead.
 */

export function buildMockDashboard(
  range: import('@/lib/chart-period').EffectiveDateRange,
  children: Child[],
  growthMeasurements: GrowthMeasurement[],
  nutritionAssessments: NutritionAssessment[],
): {
  dashboard: MonitoringDashboardViewModel
  growthCoverage: number
  growthOverdue: number
  growthAtRisk: number
  newRegistrations: number
  dropouts: number
} {
  const stats = getDashboardStatsForRange(range)
  const growth = computeGrowthSummary(children, growthMeasurements, nutritionAssessments)
  const status = computeNutritionStatusCounts(children, nutritionAssessments)

  return {
    dashboard: {
      from: range.timeLabel,
      to: range.timeLabel,
      districtId: null,
      centerId: null,
      centersInScope: stats.ecdCenters,
      children: {
        total: stats.totalChildren,
        active: stats.totalChildren,
        archived: stats.dropouts,
        transferred: 0,
      },
      attendance: {
        present: stats.presentToday,
        absent: Math.max(0, stats.totalChildren - stats.presentToday),
        totalRecords: stats.presentToday,
        rate: stats.attendanceRate,
        centersReporting: stats.ecdCenters,
      },
      nutrition: {
        screenings: status.normal + status.at_risk + status.moderate + status.severe,
        severe: status.severe,
        moderate: status.moderate,
        atRisk: status.at_risk,
        normal: status.normal,
        requiresReferral: status.requiresReferral,
      },
      referrals: {
        created: 0,
        pending: 0,
        completed: 0,
        cancelled: 0,
      },
      feeding: {
        daysRecorded: 0,
        daysWithMilk: 0,
        daysWithPorridge: 0,
        daysWithBalancedMeal: 0,
        centersReporting: 0,
      },
    },
    growthCoverage: growth.coverageRate,
    growthOverdue: growth.overdue,
    growthAtRisk: growth.atRisk,
    newRegistrations: stats.newRegistrations,
    dropouts: stats.dropouts,
  }
}

export function buildMockAttendanceMonitoring(
  selectedDate: string,
): MonitoringAttendanceViewModel {
  const today = getTodayDate()
  const rows = buildCenterDailyAttendanceRows(ECD_CENTERS, selectedDate, today)
  const status = summarizeSubmissionStatuses(rows)
  void status
  const enrolled = rows.reduce((s, r) => s + r.childrenCount, 0)
  const present = rows.reduce((s, r) => s + r.present, 0)
  const absent = rows.reduce((s, r) => s + r.absent, 0)
  const rate = enrolled > 0 ? roundPct((present / enrolled) * 100) : null

  return {
    from: selectedDate,
    to: selectedDate,
    districtId: null,
    centerId: null,
    sectorId: null,
    summary: {
      enrolledChildren: enrolled,
      present,
      absent,
      totalRecords: present + absent,
      attendanceRate: rate,
    },
    trend: [],
    items: rows.map((row) => ({
      centerId: row.center.id,
      centerName: row.center.name,
      enrolledChildren: row.childrenCount,
      present: row.present,
      absent: row.absent,
      rate: row.childrenCount > 0 ? roundPct((row.present / row.childrenCount) * 100) : null,
    })),
    total: rows.length,
    page: 1,
    pageSize: rows.length,
    totalPages: 1,
  }
}

/** Keep MOCK attendance rows with submission status for the existing UI. */
export function getMockAttendanceCenterRows(selectedDate: string) {
  return buildCenterDailyAttendanceRows(ECD_CENTERS, selectedDate, getTodayDate())
}

export function buildMockNutritionMonitoring(
  children: Child[],
  growthMeasurements: GrowthMeasurement[],
  nutritionAssessments: NutritionAssessment[],
): MonitoringNutritionViewModel {
  const growth = computeGrowthSummary(children, growthMeasurements, nutritionAssessments)
  const status = computeNutritionStatusCounts(children, nutritionAssessments)
  const centers = ECD_CENTERS.map((c) => ({ id: c.id, name: c.name, sector: c.sector }))
  const centerRows = computeCenterGrowthComparison(
    children,
    growthMeasurements,
    nutritionAssessments,
    centers,
  ).filter((r) => r.totalChildren > 0)

  return {
    from: '',
    to: '',
    districtId: null,
    centerId: null,
    summary: {
      activeChildren: growth.totalChildren,
      screenings: status.normal + status.at_risk + status.moderate + status.severe,
      severe: status.severe,
      moderate: status.moderate,
      atRisk: status.at_risk,
      normal: status.normal,
      requiresReferral: status.requiresReferral,
      overdueScreenings: growth.overdue,
      neverScreened: Math.max(0, growth.totalChildren - growth.assessed),
      screeningCoverage: growth.coverageRate,
    },
    items: centerRows.map((row) => ({
      centerId: row.centerId,
      centerName: row.centerName,
      screenings: row.assessed,
      severe: 0,
      moderate: 0,
      atRisk: row.atRisk,
      normal: Math.max(0, row.assessed - row.atRisk),
    })),
    total: centerRows.length,
    page: 1,
    pageSize: centerRows.length,
    totalPages: 1,
  }
}

export function buildMockFeedingMonitoring(
  feedingDays: CenterFeedingDay[],
  feedingSummaries: CenterFeedingMonthSummary[],
  yearMonth: string,
): {
  view: MonitoringFeedingViewModel
  comparisons: ReturnType<typeof computeCenterFeedingComparison>
  summary: ReturnType<typeof computeFeedingDistrictSummary>
} {
  const centers = ECD_CENTERS.slice(0, 20).map((c) => ({
    id: c.id,
    name: c.name,
    sector: c.sector,
  }))
  const comparisons = computeCenterFeedingComparison(
    centers,
    feedingDays,
    feedingSummaries,
    yearMonth,
  ).sort((a, b) => b.balancedDays - a.balancedDays || a.centerName.localeCompare(b.centerName))
  const summary = computeFeedingDistrictSummary(comparisons)

  return {
    comparisons,
    summary,
    view: {
      from: yearMonth,
      to: yearMonth,
      districtId: null,
      centerId: null,
      summary: {
        daysRecorded: comparisons.reduce((s, r) => s + r.milkDays + r.porridgeDays + r.balancedDays, 0),
        daysWithMilk: comparisons.reduce((s, r) => s + r.milkDays, 0),
        daysWithPorridge: comparisons.reduce((s, r) => s + r.porridgeDays, 0),
        daysWithBalancedMeal: comparisons.reduce((s, r) => s + r.balancedDays, 0),
        reportingCenters: summary.centersReporting,
        centersInScope: summary.totalCenters,
        expectedDayRecords: summary.totalCenters,
        feedingCoverage: summary.completenessRate,
        centersMissingReports: summary.totalCenters - summary.centersReporting,
      },
      items: comparisons.map((row) => ({
        centerId: row.centerId,
        centerName: row.centerName,
        daysRecorded: row.milkDays + row.porridgeDays + row.balancedDays,
        expectedDays: 0,
        missingDays: 0,
        coverage: null,
      })),
      total: comparisons.length,
      page: 1,
      pageSize: comparisons.length,
      totalPages: 1,
    },
  }
}

export function buildMockStedMonitoring(
  children: Child[],
  stedAssessments: StedAssessment[],
  referrals: Referral[],
): {
  view: MonitoringStedViewModel
  comparisons: ReturnType<typeof computeCenterStedComparison>
  totals: ReturnType<typeof computeStedDistrictSummary>
} {
  const centers = ECD_CENTERS.slice(0, 20).map((c) => ({
    id: c.id,
    name: c.name,
    sector: c.sector,
  }))
  const comparisons = computeCenterStedComparison(children, stedAssessments, referrals, centers)
    .filter((r) => r.eligible > 0)
    .sort((a, b) => a.coverageRate - b.coverageRate)
  const totals = computeStedDistrictSummary(children, stedAssessments, referrals)

  return {
    comparisons,
    totals,
    view: {
      from: '',
      to: '',
      districtId: null,
      centerId: null,
      summary: {
        assessmentsCompleted: totals.screened,
        activeChildren: totals.eligible,
        coverage: totals.coverageRate,
        averageScore: null,
        pendingFollowUps: 0,
        ageBandDistribution: {},
        outcomeDistribution: {},
      },
      items: comparisons.map((row) => ({
        centerId: row.centerId,
        centerName: row.centerName,
        assessmentsCompleted: row.assessed,
        averageScore: null,
      })),
      total: comparisons.length,
      page: 1,
      pageSize: comparisons.length,
      totalPages: 1,
    },
  }
}

export function buildMockReferralsMonitoring(
  children: Child[],
  referrals: Referral[],
  stedAssessments: StedAssessment[],
): {
  view: MonitoringReferralsViewModel
  summary: ReturnType<typeof computeReferralDistrictSummary>
  comparisons: ReturnType<typeof computeCenterReferralComparison>
} {
  const centers = ECD_CENTERS.map((c) => ({
    id: c.id,
    name: c.name,
    sector: c.sector,
  }))
  const summary = computeReferralDistrictSummary(referrals, children, stedAssessments)
  const comparisons = computeCenterReferralComparison(
    centers,
    children,
    referrals,
    stedAssessments,
  )

  return {
    summary,
    comparisons,
    view: {
      from: '',
      to: '',
      districtId: null,
      centerId: null,
      summary: {
        created: summary.open + summary.completed + summary.cancelled,
        pending: summary.open,
        completed: summary.completed,
        cancelled: summary.cancelled,
        overdue: summary.overdueFollowUps,
        averageCompletionDays: null,
      },
      items: comparisons.map((row) => ({
        centerId: row.centerId,
        centerName: row.centerName,
        pending: row.open,
        completed: row.completed,
        overdue: row.overdueFollowUps,
      })),
      total: comparisons.length,
      page: 1,
      pageSize: comparisons.length,
      totalPages: 1,
    },
  }
}

export function isMonitoringLive() {
  return env.isLive
}
