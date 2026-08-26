/**
 * Centre visitor log (Section XIII) — UI view models.
 * Backend: GET/POST /api/v1/center-visits, GET/PATCH /api/v1/center-visits/:id
 *
 * No signature field: the API uses authenticated provenance (recordedById / audit)
 * instead of a paper-register signature column.
 */

export interface CenterVisitViewModel {
  id: string
  centerId: string
  centerName: string
  districtId: string
  /** ISO date YYYY-MM-DD */
  visitDate: string
  visitorName: string
  organization: string | null
  occupationOrRole: string | null
  purposeOrMessage: string
  hostedById: string | null
  notes: string | null
  recordedById: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface CenterVisitListResult {
  items: CenterVisitViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CenterVisitListFilters {
  centerId?: string
  districtId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface CreateCenterVisitInput {
  centerId: string
  visitDate: string
  visitorName: string
  organization?: string
  occupationOrRole?: string
  purposeOrMessage: string
  hostedById?: string
  notes?: string
}

export interface UpdateCenterVisitInput {
  version: number
  visitorName?: string
  organization?: string | null
  occupationOrRole?: string | null
  purposeOrMessage?: string
  hostedById?: string | null
  notes?: string | null
}
