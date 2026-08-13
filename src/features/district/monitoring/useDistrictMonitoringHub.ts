import { useMemo } from 'react'
import { env } from '@/config/env'
import type { EffectiveDateRange } from '@/lib/chart-period'
import {
  useMonitoringAttendance,
  useMonitoringFeeding,
  useMonitoringNutrition,
  useMonitoringReferrals,
  useMonitoringSted,
  effectiveRangeToMonitoringDates,
  roundPct,
} from '@/features/monitoring'
import {
  buildMockFeedingMonitoring,
  buildMockNutritionMonitoring,
  buildMockReferralsMonitoring,
  buildMockStedMonitoring,
  getMockAttendanceCenterRows,
} from '@/features/monitoring/utils/mock-bridge'
import { useData } from '@/contexts/AppContext'
import { getTodayDate } from '@/lib/attendance-utils'

export function useDistrictMonitoringHub(range: EffectiveDateRange) {
  const dateFilters = useMemo(() => effectiveRangeToMonitoringDates(range), [range])
  const paged = useMemo(
    () => ({ ...dateFilters, page: 1, pageSize: 100 }),
    [dateFilters],
  )

  const attendanceQ = useMonitoringAttendance(paged, env.isLive)
  const nutritionQ = useMonitoringNutrition(paged, env.isLive)
  const feedingQ = useMonitoringFeeding(paged, env.isLive)
  const stedQ = useMonitoringSted(paged, env.isLive)
  const referralsQ = useMonitoringReferrals(paged, env.isLive)
  const mock = useData()

  if (env.isLive) {
    return {
      attendance: attendanceQ.data,
      nutrition: nutritionQ.data,
      feeding: feedingQ.data,
      sted: stedQ.data,
      referrals: referralsQ.data,
      isLoading:
        attendanceQ.isLoading ||
        nutritionQ.isLoading ||
        feedingQ.isLoading ||
        stedQ.isLoading ||
        referralsQ.isLoading,
      isError:
        attendanceQ.isError ||
        nutritionQ.isError ||
        feedingQ.isError ||
        stedQ.isError ||
        referralsQ.isError,
      refetch: () => {
        void attendanceQ.refetch()
        void nutritionQ.refetch()
        void feedingQ.refetch()
        void stedQ.refetch()
        void referralsQ.refetch()
      },
    }
  }

  const today = getTodayDate()
  const mockRows = getMockAttendanceCenterRows(today)
  const mockNutrition = buildMockNutritionMonitoring(
    mock.children,
    mock.growthMeasurements,
    mock.nutritionAssessments,
  )
  const mockFeeding = buildMockFeedingMonitoring(
    mock.feedingDays,
    mock.feedingSummaries,
    today.slice(0, 7),
  )
  const mockSted = buildMockStedMonitoring(mock.children, mock.stedAssessments, mock.referrals)
  const mockReferrals = buildMockReferralsMonitoring(
    mock.children,
    mock.referrals,
    mock.stedAssessments,
  )
  const present = mockRows.reduce((sum, row) => sum + row.present, 0)
  const enrolled = mockRows.reduce((sum, row) => sum + row.childrenCount, 0)

  return {
    attendance: {
      summary: {
        enrolledChildren: enrolled,
        present,
        absent: Math.max(0, enrolled - present),
        totalRecords: enrolled,
        attendanceRate: enrolled > 0 ? roundPct((present / enrolled) * 100) : null,
      },
      trend: [],
      items: mockRows.map((row) => ({
        centerId: row.center.id,
        centerName: row.center.name,
        enrolledChildren: row.childrenCount,
        present: row.present,
        absent: row.absent,
        rate: row.rate,
      })),
    },
    nutrition: mockNutrition,
    feeding: mockFeeding.view,
    sted: mockSted.view,
    referrals: mockReferrals.view,
    isLoading: false,
    isError: false,
    refetch: () => undefined,
  }
}
