/**
 * Children domain feature module.
 *
 * Structure (standard for future domains):
 *   queries.ts      — list / detail React Query hooks
 *   mutations.ts    — create / update / archive / transfer hooks
 *   repository.ts   — MOCK/LIVE bridge consumed by DataProvider
 *   mappers/        — re-exports API ↔ view-model mappers
 *   models/         — re-exports UI view models
 *   components/     — optional; shared child UI remains under components/children
 */
export { useChildrenList, useChildDetail } from './queries'
export {
  useCreateChild,
  useUpdateChild,
  useArchiveChild,
  useReactivateChild,
  useTransferChild,
  invalidateChildrenQueries,
} from './mutations'
export { useChildrenRepository } from './repository'
export * from './mappers'
export type * from './models'
