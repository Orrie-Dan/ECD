import { useMemo } from 'react'
import { env } from '@/config/env'
import type { EffectiveDateRange } from '@/lib/chart-period'
import {
  useMonitoringAttendance,
  useMonitoringDashboard,
  useMonitoringFeeding,
  useMonitoringNutrition,
  useMonitoringReferrals,
  useMonitoringSted,
} from '@/features/monitoring/queries'
import { useDropoutsReport, useEnrollmentReport } from '@/features/reporting/queries'
import {
  dayToMonitoringRange,
  effectiveRangeToMonitoringDates,
  yearMonthToMonitoringRange,
  roundPct,
} from '@/features/monitoring/utils/filters'
import {
  buildMockDashboard,
  buildMockFeedingMonitoring,
  buildMockNutritionMonitoring,
  buildMockReferralsMonitoring,
  buildMockStedMonitoring,
  getMockAttendanceCenterRows,
} from '@/features/monitoring/utils/mock-bridge'
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

/**
 * Mode-aware monitoring read access for district pages.
 * MOCK → existing lib aggregations; LIVE → monitoring/analytics APIs (no local KPI recompute).
 */

export function useDashboardMonitoring(input: {
  range: EffectiveDateRange
  children: Child[]
  growthMeasurements: GrowthMeasurement[]
  nutritionAssessments: NutritionAssessment[]
}) {
  const dateFilters = useMemo(
    () => effectiveRangeToMonitoringDates(input.range),
    [input.range],
  )
  const liveDash = useMonitoringDashboard(dateFilters)
  const liveNutrition = useMonitoringNutrition(
    { ...dateFilters, page: 1, pageSize: 100 },
    env.isLive,
  )
  /** Registrations/dropouts are on /reports/*, not analytics dashboard DTO. */
  const liveEnrollment = useEnrollmentReport(dateFilters, env.isLive)
  const liveDropouts = useDropoutsReport(dateFilters, env.isLive)

  if (env.isLive) {
    const dashboard = liveDash.data as MonitoringDashboardViewModel | undefined
    const nutrition = liveNutrition.data
    return {
      dashboard,
      newRegistrations: liveEnrollment.data?.summary.newRegistrations ?? null,
      dropouts: liveDropouts.data?.summary.dropouts ?? null,
      growthCoverage: nutrition ? roundPct(nutrition.summary.screeningCoverage) : null,
      growthOverdue: nutrition?.summary.overdueScreenings ?? null,
      growthAtRisk: nutrition?.summary.atRisk ?? dashboard?.nutrition.atRisk ?? null,
      isLoading:
        liveDash.isLoading ||
        liveNutrition.isLoading ||
        liveEnrollment.isLoading ||
        liveDropouts.isLoading,
      isError:
        liveDash.isError ||
        liveNutrition.isError ||
        liveEnrollment.isError ||
        liveDropouts.isError,
      refetch: () =>
        Promise.all([
          liveDash.refetch(),
          liveNutrition.refetch(),
          liveEnrollment.refetch(),
          liveDropouts.refetch(),
        ]).then(() => undefined),
      source: 'api' as const,
    }
  }

  const mock = buildMockDashboard(
    input.range,
    input.children,
    input.growthMeasurements,
    input.nutritionAssessments,
  )

  return {
    dashboard: mock.dashboard,
    newRegistrations: mock.newRegistrations,
    dropouts: mock.dropouts,
    growthCoverage: mock.growthCoverage,
    growthOverdue: mock.growthOverdue,
    growthAtRisk: mock.growthAtRisk,
    isLoading: false,
    isError: false,
    refetch: undefined,
    source: 'mock' as const,
  }
}

/** Nutrition monitoring also feeds the growth/MUAC district page (no /monitoring/growth). */
export function useNutritionMonitoringView(input: {
  children: Child[]
  growthMeasurements: GrowthMeasurement[]
  nutritionAssessments: NutritionAssessment[]
  centerId?: string
  from?: string
  to?: string
}) {
  const filters = useMemo(
    () => ({
      centerId: input.centerId,
      from: input.from,
      to: input.to,
      page: 1,
      pageSize: 100,
    }),
    [input.centerId, input.from, input.to],
  )
  const live = useMonitoringNutrition(filters)

  if (env.isLive) {
    return {
      data: live.data as MonitoringNutritionViewModel | undefined,
      isLoading: live.isLoading,
      isError: live.isError,
      refetch: live.refetch,
      source: 'api' as const,
    }
  }

  const mock = buildMockNutritionMonitoring(
    input.children,
    input.growthMeasurements,
    input.nutritionAssessments,
  )

  return {
    data: mock as MonitoringNutritionViewModel | undefined,
    isLoading: false,
    isError: false,
    refetch: undefined,
    source: 'mock' as const,
  }
}

export function useAttendanceMonitoringView(input: {
  selectedDate: string
  centerId?: string
}) {
  const filters = useMemo(() => {
    const range = dayToMonitoringRange(input.selectedDate)
    return {
      ...range,
      centerId: input.centerId && input.centerId !== 'all' ? input.centerId : undefined,
      page: 1,
      pageSize: 100,
    }
  }, [input.selectedDate, input.centerId])

  const live = useMonitoringAttendance(filters)

  if (env.isLive) {
    return {
      data: live.data as MonitoringAttendanceViewModel | undefined,
      mockRows: undefined,
      isLoading: live.isLoading,
      isError: live.isError,
      refetch: live.refetch,
      source: 'api' as const,
    }
  }

  const mockRows = getMockAttendanceCenterRows(input.selectedDate)

  return {
    data: undefined,
    mockRows,
    isLoading: false,
    isError: false,
    refetch: undefined,
    source: 'mock' as const,
  }
}

export function useFeedingMonitoringView(input: {
  yearMonth: string
  feedingDays: CenterFeedingDay[]
  feedingSummaries: CenterFeedingMonthSummary[]
}) {
  const filters = useMemo(() => {
    const range = yearMonthToMonitoringRange(input.yearMonth)
    return { ...range, page: 1, pageSize: 100 }
  }, [input.yearMonth])

  const live = useMonitoringFeeding(filters)

  if (env.isLive) {
    return {
      data: live.data as MonitoringFeedingViewModel | undefined,
      mockComparisons: undefined,
      mockSummary: undefined,
      isLoading: live.isLoading,
      isError: live.isError,
      refetch: live.refetch,
      source: 'api' as const,
    }
  }

  const mock = buildMockFeedingMonitoring(
    input.feedingDays,
    input.feedingSummaries,
    input.yearMonth,
  )

  return {
    data: mock.view as MonitoringFeedingViewModel | undefined,
    mockComparisons: mock.comparisons,
    mockSummary: mock.summary,
    isLoading: false,
    isError: false,
    refetch: undefined,
    source: 'mock' as const,
  }
}

export function useStedMonitoringView(input: {
  children: Child[]
  stedAssessments: StedAssessment[]
  referrals: Referral[]
}) {
  const filters = useMemo(() => ({ page: 1, pageSize: 100 }), [])
  const live = useMonitoringSted(filters)

  if (env.isLive) {
    return {
      data: live.data as MonitoringStedViewModel | undefined,
      mockComparisons: undefined,
      mockTotals: undefined,
      isLoading: live.isLoading,
      isError: live.isError,
      refetch: live.refetch,
      source: 'api' as const,
    }
  }

  const mock = buildMockStedMonitoring(input.children, input.stedAssessments, input.referrals)

  return {
    data: mock.view as MonitoringStedViewModel | undefined,
    mockComparisons: mock.comparisons,
    mockTotals: mock.totals,
    isLoading: false,
    isError: false,
    refetch: undefined,
    source: 'mock' as const,
  }
}

export function useReferralsMonitoringView(input: {
  children: Child[]
  referrals: Referral[]
  stedAssessments: StedAssessment[]
  centerId?: string
}) {
  const filters = useMemo(
    () => ({
      centerId: input.centerId,
      page: 1,
      pageSize: 100,
    }),
    [input.centerId],
  )
  const live = useMonitoringReferrals(filters)

  if (env.isLive) {
    return {
      data: live.data as MonitoringReferralsViewModel | undefined,
      mockSummary: undefined,
      mockComparisons: undefined,
      isLoading: live.isLoading,
      isError: live.isError,
      refetch: live.refetch,
      source: 'api' as const,
    }
  }

  const mock = buildMockReferralsMonitoring(input.children, input.referrals, input.stedAssessments)

  return {
    data: mock.view as MonitoringReferralsViewModel | undefined,
    mockSummary: mock.summary,
    mockComparisons: mock.comparisons,
    isLoading: false,
    isError: false,
    refetch: undefined,
    source: 'mock' as const,
  }
}

export function useMonitoringRepository() {
  return {
    useDashboardMonitoring,
    useNutritionMonitoringView,
    useAttendanceMonitoringView,
    useFeedingMonitoringView,
    useStedMonitoringView,
    useReferralsMonitoringView,
  }
}
