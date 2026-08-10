/**
 * STED assessment domain feature module.
 *
 * Distinct from Nutrition (MUAC) and Feeding (Form VI Imirire).
 *
 * LIVE: LocalStore + outbox (append-only sted_assessment).
 * When outcome.referred, referral CREATE is atomic with dependsOn STED op.
 * MOCK: MOCK_STED_ASSESSMENTS + AppContext referral side-effect.
 * Never falls back to MOCK when LIVE.
 */
export {
  useStedDetail,
  useChildStedHistory,
  useChildStedHistoryWindow,
  useChildStedLatest,
  useStedRoster,
} from './queries'
export { useCreateStedAssessment, invalidateStedQueries } from './mutations'
export { useStedRepository } from './repository'
export {
  createStedLocalFirst,
  appendStedCorrectionLocalFirst,
  localStedToViewModel,
  listStedFromLocal,
} from './local-sted'
export { mapStedRosterToLocalSeed } from './seed-from-rest'
export * from './mappers'
export type * from './models'
export * from './utils/calculations'
