import type { Child } from '@/types'

/**
 * UI-facing child model.
 * Extends the existing `Child` shape with API-only fields (optimistic lock + geo id).
 * Components continue to consume `Child`; feature hooks expose `ChildViewModel`.
 */
export interface ChildViewModel extends Child {
  /** Optimistic-lock version from the API (required for LIVE mutations). */
  version: number
  /** Home village admin-unit UUID. */
  homeVillageId: string
  notes?: string
  firstName?: string
  middleName?: string
  lastName?: string
}

export interface ChildrenListResult {
  items: ChildViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ChildrenListFilters {
  centerId?: string
  status?: Child['status']
  search?: string
  page?: number
  pageSize?: number
}
