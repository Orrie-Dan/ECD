/**
 * Centre educators / caregivers (Section XI) — fields beyond stale Orval user DTOs.
 * Source of truth remains /api/v1/users — not a parallel staff table.
 */

export type PersonSex = 'male' | 'female'

export type EducationLevel =
  | 'none'
  | 'primary'
  | 'secondary'
  | 'vocational'
  | 'diploma'
  | 'bachelor'
  | 'postgraduate'
  | 'other'

export const PERSON_SEX_OPTIONS: PersonSex[] = ['male', 'female']

export const EDUCATION_LEVEL_OPTIONS: EducationLevel[] = [
  'none',
  'primary',
  'secondary',
  'vocational',
  'diploma',
  'bachelor',
  'postgraduate',
  'other',
]

export type CenterCaregiverProfileFields = {
  gender?: PersonSex | null
  educationLevel?: EducationLevel | null
}
