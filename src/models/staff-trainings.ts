/**
 * Staff trainings (Section XIV) — UI view models.
 * Backend: GET/POST /api/v1/staff-trainings, GET/PATCH /api/v1/staff-trainings/:id
 * List filters: centerId, traineeUserId, from, to, page, pageSize.
 */

export interface StaffTrainingViewModel {
  id: string
  centerId: string
  centerName: string
  districtId: string
  traineeUserId: string | null
  traineeName: string
  traineeRole: string
  /** ISO date YYYY-MM-DD */
  trainingDate: string
  trainingProvider: string
  topic: string
  durationDays: number
  certificateReceived: boolean
  notes: string | null
  recordedById: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface StaffTrainingListResult {
  items: StaffTrainingViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface StaffTrainingListFilters {
  centerId?: string
  districtId?: string
  traineeUserId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface CreateStaffTrainingInput {
  centerId: string
  traineeUserId?: string
  traineeName: string
  traineeRole: string
  trainingDate: string
  trainingProvider: string
  topic: string
  durationDays: number
  certificateReceived: boolean
  notes?: string
}

export interface UpdateStaffTrainingInput {
  version: number
  traineeUserId?: string | null
  traineeName?: string
  traineeRole?: string
  trainingProvider?: string
  topic?: string
  durationDays?: number
  certificateReceived?: boolean
  notes?: string | null
}
