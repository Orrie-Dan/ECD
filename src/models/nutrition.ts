import type { NutritionAssessment, NutritionStatus } from '@/types'

/**
 * UI-facing nutrition assessment (MUAC status projection from a screening).
 * Components consume `NutritionAssessment`; feature hooks expose this view model.
 *
 * Backend entity: NutritionScreening (same as Growth measurements).
 * Growth owns anthropometric measurement UX; Nutrition owns assessment/alerts UX.
 */
export interface NutritionAssessmentViewModel extends NutritionAssessment {
  version: number
  weightKg?: number
  muacCm?: number
  heightCm?: number
  recordedById?: string
}

export interface NutritionHistoryResult {
  childId: string
  assessments: NutritionAssessmentViewModel[]
  total: number
}

export interface NutritionAssessmentsResult {
  assessments: NutritionAssessmentViewModel[]
}

export interface NutritionAlertFilters {
  districtId?: string
  centerId?: string
  date?: string
  status?: 'overdue_screening' | 'requires_referral' | 'severe_nutrition'
  nutritionStatus?: NutritionStatus
}

export type NutritionAlertKindApi =
  | 'overdue_screening'
  | 'requires_referral'
  | 'severe_nutrition'

/**
 * API-backed nutrition alert (distinct from client-built `NutritionAlert` in nutrition-utils).
 */
export interface NutritionAlertViewModel {
  id: string
  type: NutritionAlertKindApi
  childId: string
  childFullName: string
  centerId: string
  centerName?: string
  screeningId?: string
  screeningDate?: string
  nutritionStatus?: NutritionStatus
  requiresReferral?: boolean
  message: string
}

export interface NutritionAlertsResult {
  items: NutritionAlertViewModel[]
  total: number
}

/** Input for recording a nutrition screening (assessment write path). */
export interface NutritionScreeningCreateInput {
  childId: string
  date: string
  weightKg: number
  muacCm: number
  heightCm?: number
  headCircumferenceCm?: number
  notes?: string
  recordedBy?: string
}
