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
import type { CenterDailyAttendanceRow } from '@/lib/district-attendance'

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

  const mock = useMemo(
    () =>
      buildMockDashboard(
        input.range,
        input.children,
        input.growthMeasurements,
        input.nutritionAssessments,
      ),
    [input.range, input.children, input.growthMeasurements, input.nutritionAssessments],
  )

  if (env.isLive) {
    const dashboard = liveDash.data as MonitoringDashboardViewModel | undefined
    const nutrition = liveNutrition.data
    return {
      dashboard,
      /** LIVE: registrations/dropouts not on analytics dashboard — surface as null (gap). */
      newRegistrations: null as number | null,
      dropouts: null as number | null,
      growthCoverage: nutrition ? roundPct(nutrition.summary.screeningCoverage) : null,
      growthOverdue: nutrition?.summary.overdueScreenings ?? null,
      growthAtRisk: nutrition?.summary.atRisk ?? dashboard?.nutrition.atRisk ?? null,
      isLoading: liveDash.isLoading || liveNutrition.isLoading,
      isError: liveDash.isError || liveNutrition.isError,
      source: 'api' as const,
    }
  }

  return {
    dashboard: mock.dashboard,
    newRegistrations: mock.newRegistrations,
    dropouts: mock.dropouts,
    growthCoverage: mock.growthCoverage,
    growthOverdue: mock.growthOverdue,
    growthAtRisk: mock.growthAtRisk,
    isLoading: false,
    isError: false,
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

  const mock = useMemo(
    () =>
      buildMockNutritionMonitoring(
        input.children,
        input.growthMeasurements,
        input.nutritionAssessments,
      ),
    [input.children, input.growthMeasurements, input.nutritionAssessments],
  )

  return {
    data: (env.isLive ? live.data : mock) as MonitoringNutritionViewModel | undefined,
    isLoading: env.isLive && live.isLoading,
    isError: env.isLive && live.isError,
    source: env.isLive ? ('api' as const) : ('mock' as const),
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

  const mockRows = useMemo(
    () => getMockAttendanceCenterRows(input.selectedDate),
    [input.selectedDate],
  )

  return {
    data: live.data as MonitoringAttendanceViewModel | undefined,
    mockRows: env.isMock ? mockRows : (undefined as CenterDailyAttendanceRow[] | undefined),
    isLoading: env.isLive && live.isLoading,
    isError: env.isLive && live.isError,
    source: env.isLive ? ('api' as const) : ('mock' as const),
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
  const mock = useMemo(
    () =>
      buildMockFeedingMonitoring(input.feedingDays, input.feedingSummaries, input.yearMonth),
    [input.feedingDays, input.feedingSummaries, input.yearMonth],
  )

  return {
    data: (env.isLive ? live.data : mock.view) as MonitoringFeedingViewModel | undefined,
    mockComparisons: env.isMock ? mock.comparisons : undefined,
    mockSummary: env.isMock ? mock.summary : undefined,
    isLoading: env.isLive && live.isLoading,
    isError: env.isLive && live.isError,
    source: env.isLive ? ('api' as const) : ('mock' as const),
  }
}

export function useStedMonitoringView(input: {
  children: Child[]
  stedAssessments: StedAssessment[]
  referrals: Referral[]
}) {
  const filters = useMemo(() => ({ page: 1, pageSize: 100 }), [])
  const live = useMonitoringSted(filters)
  const mock = useMemo(
    () => buildMockStedMonitoring(input.children, input.stedAssessments, input.referrals),
    [input.children, input.stedAssessments, input.referrals],
  )

  return {
    data: (env.isLive ? live.data : mock.view) as MonitoringStedViewModel | undefined,
    mockComparisons: env.isMock ? mock.comparisons : undefined,
    mockTotals: env.isMock ? mock.totals : undefined,
    isLoading: env.isLive && live.isLoading,
    isError: env.isLive && live.isError,
    source: env.isLive ? ('api' as const) : ('mock' as const),
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
  const mock = useMemo(
    () =>
      buildMockReferralsMonitoring(input.children, input.referrals, input.stedAssessments),
    [input.children, input.referrals, input.stedAssessments],
  )

  return {
    data: (env.isLive ? live.data : mock.view) as MonitoringReferralsViewModel | undefined,
    mockSummary: env.isMock ? mock.summary : undefined,
    mockComparisons: env.isMock ? mock.comparisons : undefined,
    isLoading: env.isLive && live.isLoading,
    isError: env.isLive && live.isError,
    source: env.isLive ? ('api' as const) : ('mock' as const),
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
