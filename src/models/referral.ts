import type { Referral, ReferralSourceType, ReferralStatus } from '@/types'

/**
 * UI-facing referral view model.
 * Components consume `Referral` fields; feature hooks expose this shape with API metadata.
 *
 * Field mapping (UI ↔ API):
 * - assessmentId ↔ sourceId (DERIVED alias)
 * - date ↔ referralDate
 *
 * Persistence classification:
 * - SERVER_PERSISTED: status, notes, implementedAt, reason, destination, source*, dates, version
 * - DERIVED: assessmentId (UI alias for sourceId)
 */
export interface ReferralViewModel extends Referral {
  centerId: string
  version: number
  recordedBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface ReferralListFilters {
  page?: number
  pageSize?: number
  status?: ReferralStatus
  sourceType?: ReferralSourceType
  centerId?: string
  childId?: string
  /** Inclusive referralDate start (YYYY-MM-DD). */
  from?: string
  /** Inclusive referralDate end (YYYY-MM-DD). */
  to?: string
}

export interface ReferralListResult {
  items: ReferralViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ReferralHistoryResult {
  childId: string
  items: ReferralViewModel[]
  total: number
}

/**
 * Create input — UI uses assessmentId/date; mapper sends sourceId/referralDate.
 * centerId is required by the API; repository may resolve it from the child.
 */
export interface ReferralCreateInput {
  childId: string
  /** Resolved from child when omitted. */
  centerId?: string
  assessmentId: string
  sourceType: ReferralSourceType
  date: string
  reason: string
  destination: string
  notes?: string
  /** Ignored on create — backend always starts as pending. */
  status?: ReferralStatus
}

/** Terminal status transition (only statuses the API accepts on PATCH). */
export type ReferralTerminalStatus = Extract<ReferralStatus, 'completed' | 'cancelled'>

export interface ReferralStatusUpdateInput {
  id: string
  version: number
  status: ReferralTerminalStatus
  implementedAt?: string
  notes?: string
}

/** Patch used by existing DataProvider façade (notes / implementedAt / status). */
export interface ReferralPatchInput {
  implementedAt?: string
  notes?: string
  status?: ReferralStatus
}
