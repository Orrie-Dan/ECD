/**
 * Caregiver work experience / CV history (SF-13).
 * Backend: nested on POST /users; GET/POST /users/:userId/work-experiences;
 * PATCH /users/:userId/work-experiences/:experienceId
 */

export interface CaregiverWorkExperienceViewModel {
  id: string
  userId: string
  employer: string
  jobTitle: string
  /** ISO date YYYY-MM-DD */
  startDate: string
  /** ISO date YYYY-MM-DD or null when current */
  endDate: string | null
  description: string | null
  recordedById: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface CreateCaregiverWorkExperienceInput {
  employer: string
  jobTitle: string
  startDate: string
  endDate?: string | null
  description?: string
}

export interface UpdateCaregiverWorkExperienceInput {
  version: number
  employer?: string
  jobTitle?: string
  startDate?: string
  endDate?: string | null
  description?: string | null
}
