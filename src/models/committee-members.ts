/**
 * ECD committee members (Section X) — UI view models.
 * Backend: GET/POST/PATCH /api/v1/committee-members, POST :id/deactivate
 */

export interface CommitteeMemberViewModel {
  id: string
  centerId: string
  centerName: string
  districtId: string
  userId: string | null
  fullName: string
  position: string
  phone: string | null
  /** ISO date YYYY-MM-DD */
  startDate: string | null
  /** ISO date YYYY-MM-DD */
  endDate: string | null
  isActive: boolean
  notes: string | null
  recordedById: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface CommitteeMemberListResult {
  items: CommitteeMemberViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CommitteeMemberListFilters {
  centerId?: string
  districtId?: string
  isActive?: boolean
  page?: number
  pageSize?: number
}

export interface CreateCommitteeMemberInput {
  centerId: string
  userId?: string
  fullName: string
  position: string
  phone?: string
  startDate?: string
  notes?: string
}

export interface UpdateCommitteeMemberInput {
  version: number
  fullName?: string
  position?: string
  phone?: string | null
  startDate?: string | null
  notes?: string | null
}

export interface DeactivateCommitteeMemberInput {
  version: number
  endDate?: string
}
