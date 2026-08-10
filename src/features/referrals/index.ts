/**
 * Referral workflow domain feature module.
 *
 * LIVE: LocalStore + outbox for create, notes/implementedAt, and terminal status.
 * Nutrition/STED create referrals atomically with dependsOn in their modules.
 * Standalone create dedupes by sourceId — never double-create.
 *
 * MOCK: MOCK_REFERRALS + AppContext side-effects after source assessments.
 * Never falls back to MOCK when LIVE.
 *
 * Backend: create, list, child history, terminal status update (CAS).
 * Gaps: no get-by-id REST, no assign, no delete, no Idempotency-Key.
 */
export {
  useReferralList,
  useReferralWindow,
  useChildReferralHistory,
} from './queries'
export {
  useCreateReferral,
  useUpdateReferralStatus,
  invalidateReferralQueries,
} from './mutations'
export { useReferralRepository } from './repository'
export {
  createReferralLocalFirst,
  updateReferralStatusLocalFirst,
  patchReferralLocalFirst,
  localReferralToViewModel,
  listReferralsFromLocal,
  canTransitionReferralStatus,
} from './local-referrals'
export { mapReferralListToLocalSeed } from './seed-from-rest'
export * from './mappers'
export type * from './models'
export {
  shouldCreateNutritionReferral,
  buildNutritionReferralInput,
  shouldCreateStedReferral,
  buildStedReferralInput,
} from './utils/triggers'
