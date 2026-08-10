import type { StedAssessment } from '@/types'

/**
 * UI-facing STED assessment model.
 * Extends existing `StedAssessment` with API-only fields (optimistic lock).
 * Components continue to consume `StedAssessment` via DataProvider.
 *
 * Session-only / UI-only (not in STED sync payload):
 * - `referralReason` / `referralDestination` — seed referral CREATE only
 * - `assessedBy` display name — sync persists `assessedById` (UUID)
 * - `noProblem` — client-derived from physical; not a server field
 *
 * Persisted by sync: notes, physicalAssessment, milestoneResults, outcome,
 * followUpIn6Months, followUpDueDate, consentObtained, ageBand, etc.
 */
export interface StedAssessmentViewModel extends StedAssessment {
  /** Optimistic-lock version from the API (append-only create; still returned). */
  version: number
  createdAt?: string
  updatedAt?: string
  /** Assessor user UUID from API when display name is unavailable. */
  assessedById?: string
}

export interface StedHistoryResult {
  childId: string
  items: StedAssessmentViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface StedHistoryFilters {
  page?: number
  pageSize?: number
}

export type StedAssessmentCreateInput = Omit<StedAssessment, 'id'> & {
  deviceId?: string
}
