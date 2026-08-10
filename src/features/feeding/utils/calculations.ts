/**
 * Frontend-derived feeding aggregations (MOCK / caretaker UX).
 *
 * District monitoring LIVE prefers `/monitoring/feeding` via `features/monitoring`.
 * Remaining gaps on that endpoint: liters/flour/foodSource and per-center
 * milk/porridge/balanced day totals — do not N×center fan-out to invent them.
 */
export {
  FOOD_GROUP_KEYS,
  emptyComposition,
  isBalancedComposition,
  getFeedingDay,
  getFeedingDaysForMonth,
  computeFeedingDayCounts,
  getMonthSummary,
  getCurrentYearMonth,
  daysInYearMonth,
  computeCenterFeedingComparison,
  computeFeedingDistrictSummary,
} from '@/lib/feeding-utils'

export type { FeedingDayCounts, CenterFeedingComparison } from '@/lib/feeding-utils'
