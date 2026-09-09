import { useMemo } from 'react'
import { env } from '@/config/env'
import type { EffectiveDateRange } from '@/lib/chart-period'
import {
  useMonitoringAttendance,
  useMonitoringCompliance,
  useMonitoringFeeding,
  useMonitoringNutrition,
  useMonitoringReferrals,
  useMonitoringSted,
  effectiveRangeToMonitoringDates,
} from '@/features/monitoring'

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
  const complianceQ = useMonitoringCompliance(dateFilters, env.isLive)

  return {
    attendance: attendanceQ.data,
    nutrition: nutritionQ.data,
    feeding: feedingQ.data,
    sted: stedQ.data,
    referrals: referralsQ.data,
    compliance: complianceQ.data,
    isLive: env.isLive,
    isLoading:
      env.isLive &&
      (attendanceQ.isLoading ||
        nutritionQ.isLoading ||
        feedingQ.isLoading ||
        stedQ.isLoading ||
        referralsQ.isLoading ||
        complianceQ.isLoading),
    isError:
      env.isLive &&
      (attendanceQ.isError ||
        nutritionQ.isError ||
        feedingQ.isError ||
        stedQ.isError ||
        referralsQ.isError ||
        complianceQ.isError),
    refetch: () => {
      void attendanceQ.refetch()
      void nutritionQ.refetch()
      void feedingQ.refetch()
      void stedQ.refetch()
      void referralsQ.refetch()
      void complianceQ.refetch()
    },
  }
}
