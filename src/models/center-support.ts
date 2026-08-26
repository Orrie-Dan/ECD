/**
 * Centre support received (Section XII) — UI view models.
 * Backend: GET/POST /api/v1/center-support, GET/PATCH /api/v1/center-support/:id
 */

export const CENTER_SUPPORT_CATEGORIES = ['food', 'equipment', 'other'] as const

export type CenterSupportCategory = (typeof CENTER_SUPPORT_CATEGORIES)[number]

export interface CenterSupportViewModel {
  id: string
  centerId: string
  centerName: string
  districtId: string
  /** ISO date YYYY-MM-DD */
  receivedDate: string
  supportCategory: CenterSupportCategory
  description: string
  quantity: number | null
  unit: string | null
  providerName: string
  providerOrganization: string | null
  receivedById: string | null
  receivedByName: string | null
  notes: string | null
  recordedById: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface CenterSupportListResult {
  items: CenterSupportViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CenterSupportListFilters {
  centerId?: string
  districtId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
  /** Client-side list filter — API list has no supportCategory query. */
  supportCategory?: CenterSupportCategory | 'all'
}

export interface CreateCenterSupportInput {
  centerId: string
  receivedDate: string
  supportCategory: CenterSupportCategory
  description: string
  quantity?: number
  unit?: string
  providerName: string
  providerOrganization?: string
  receivedById?: string
  receivedByName?: string
  notes?: string
}

export interface UpdateCenterSupportInput {
  version: number
  supportCategory?: CenterSupportCategory
  description?: string
  quantity?: number | null
  unit?: string | null
  providerName?: string
  providerOrganization?: string | null
  notes?: string | null
}
