/**
 * Parenting sessions (Section IX) — UI view models.
 * Backend: GET/POST/PATCH /api/v1/parenting-sessions
 */

export interface ParentingSessionViewModel {
  id: string
  centerId: string
  centerName: string
  districtId: string
  /** ISO date YYYY-MM-DD */
  sessionDate: string
  topic: string
  facilitatorName: string
  facilitatorRole: string | null
  facilitatorUserId: string | null
  messageSummary: string
  maleAttendees: number
  femaleAttendees: number
  /** Derived by API as maleAttendees + femaleAttendees */
  totalAttendees: number
  notes: string | null
  recordedById: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface ParentingSessionListResult {
  items: ParentingSessionViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Period attendance totals aggregated from all sessions in the date range. */
export interface ParentingSessionAttendanceSummary {
  centerId: string
  from: string
  to: string
  sessionCount: number
  maleAttendeesTotal: number
  femaleAttendeesTotal: number
  totalAttendees: number
}

export interface ParentingSessionListFilters {
  centerId?: string
  districtId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface CreateParentingSessionInput {
  centerId: string
  sessionDate: string
  topic: string
  facilitatorName: string
  facilitatorRole?: string
  facilitatorUserId?: string
  messageSummary: string
  maleAttendees: number
  femaleAttendees: number
  notes?: string
}

export interface UpdateParentingSessionInput {
  version: number
  topic?: string
  facilitatorName?: string
  facilitatorRole?: string | null
  facilitatorUserId?: string | null
  messageSummary?: string
  maleAttendees?: number
  femaleAttendees?: number
  notes?: string | null
}
