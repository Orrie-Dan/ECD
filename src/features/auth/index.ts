/**
 * Auth domain feature module.
 *
 * Structure (standard for future domains):
 *   queries.ts     — React Query reads
 *   mutations.ts   — React Query writes / session actions
 *   mappers/       — re-exports API ↔ view-model mappers
 *   models/        — re-exports UI view models
 *   components/    — domain UI (optional; auth forms remain under components/auth)
 */
export { useCurrentUser } from './queries'
export { useLogin, useLogout, type LoginResult, type LoginError } from './mutations'
export * from './mappers'
export type * from './models'
