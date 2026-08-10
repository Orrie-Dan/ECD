/**
 * Nutrition domain feature module (MUAC assessments + alerts).
 *
 * Overlap with Growth:
 * - Same backend / LocalStore entity: child_nutrition_screening
 * - Growth owns Form VII measurement UX + anthropometrics + local-first writes
 * - Nutrition owns assessment list, history/latest hooks, and alerts API
 * - Shared roster cache: nutrition.keys.roster
 *
 * Referral boundary (LIVE): createScreeningLocalFirst enqueues referral with
 * dependsOn screening operation in the same LocalStore transaction.
 * AppContext MOCK path still calls the referral repository after screening success.
 *
 * Backend limitation: no screening update/delete endpoints (append-only).
 */
export {
  useNutritionHistory,
  useNutritionLatest,
  useNutritionAssessments,
  useNutritionAlerts,
} from './queries'
export {
  useCreateNutritionScreening,
  invalidateNutritionQueries,
} from './mutations'
export { useNutritionRepository } from './repository'
export {
  createScreeningLocalFirst,
  appendScreeningCorrectionLocalFirst,
  listScreeningsFromLocal,
  localScreeningToMeasurement,
  localScreeningToAssessment,
} from './local-screenings'
export * from './mappers'
export type * from './models'
export * from './utils/calculations'
