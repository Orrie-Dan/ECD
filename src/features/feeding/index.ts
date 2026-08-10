/**
 * Feeding / Imirire domain feature module (Form VI center feeding).
 *
 * Distinct from Nutrition:
 * - Nutrition = MUAC / growth screening assessments (append-only)
 * - Feeding = center-level daily + monthly Form VI records (natural-key upsert)
 *
 * LIVE: LocalStore + outbox (center_feeding_day / center_feeding_month_summary).
 * MOCK: in-memory MOCK_FEEDING_* — never used as LIVE fallback.
 *
 * Backend limitations:
 * - No REST soft-delete for feeding (sync DELETE exists but is not product-exposed)
 * - List endpoints have no date / yearMonth filters (client filters after fetch)
 * - No multi-center list for district monitoring parity (monitoring stays online-only)
 * - `warnings` are REST response-only — not persisted offline
 */
export {
  useFeedingDayList,
  useFeedingDaysWindow,
  useFeedingMonthSummaryList,
  useFeedingSummariesWindow,
} from './queries'
export {
  useUpsertFeedingDay,
  useUpsertFeedingMonthSummary,
  invalidateFeedingQueries,
} from './mutations'
export { useFeedingRepository } from './repository'
export {
  upsertFeedingDayLocalFirst,
  upsertFeedingMonthSummaryLocalFirst,
  listFeedingDaysFromLocal,
  listFeedingMonthSummariesFromLocal,
} from './local-feeding'
export * from './mappers'
export type * from './models'
export * from './utils/calculations'
