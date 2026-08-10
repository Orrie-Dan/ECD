/**
 * Monitoring read-model domain.
 *
 * Consumes backend `/monitoring/*` + `/analytics/dashboard` aggregates.
 * Does not recompute district KPIs from operational domain lists in LIVE mode.
 *
 * Gaps:
 * - no `/monitoring/growth` (nutrition monitoring is canonical for MUAC/screening)
 * - feeding monitoring lacks liters/flour and per-center milk/porridge/balanced days
 * - dashboard lacks newRegistrations/dropouts as distinct fields
 * - child-level tables remain operational-domain reads (not monitoring aggregates)
 */
export {
  useMonitoringDashboard,
  useMonitoringAttendance,
  useMonitoringNutrition,
  useMonitoringFeeding,
  useMonitoringSted,
  useMonitoringReferrals,
} from './queries'
export {
  useMonitoringRepository,
  useDashboardMonitoring,
  useNutritionMonitoringView,
  useAttendanceMonitoringView,
  useFeedingMonitoringView,
  useStedMonitoringView,
  useReferralsMonitoringView,
} from './repository'
export * from './mappers'
export type * from './models'
export {
  dayToMonitoringRange,
  yearMonthToMonitoringRange,
  rangeToMonitoringFilters,
  effectiveRangeToMonitoringDates,
  roundPct,
} from './utils/filters'
