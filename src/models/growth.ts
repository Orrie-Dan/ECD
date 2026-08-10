import type { GrowthMeasurement, NutritionAssessment, NutritionStatus } from '@/types'

/**
 * UI-facing growth measurement model.
 * Extends existing `GrowthMeasurement` with API-only fields from nutrition screenings.
 *
 * Backend entity: NutritionScreening (POST/GET under /nutrition-screenings).
 * Components continue to consume `GrowthMeasurement` via DataProvider.
 */
export interface GrowthMeasurementViewModel extends GrowthMeasurement {
  /** Optimistic-lock version from the API. */
  version: number
  /** API nutrition status captured at screening time. */
  nutritionStatus: NutritionStatus
  requiresReferral: boolean
  recordedById?: string
}

/**
 * Assessment projection derived from the same screening DTO.
 * Kept so existing UI (`getChildAssessments`) stays unchanged without a Nutrition domain migration.
 */
export interface GrowthAssessmentViewModel extends NutritionAssessment {
  version: number
}

export interface GrowthHistoryResult {
  childId: string
  measurements: GrowthMeasurementViewModel[]
  assessments: GrowthAssessmentViewModel[]
  total: number
}

export interface GrowthRosterResult {
  measurements: GrowthMeasurementViewModel[]
  assessments: GrowthAssessmentViewModel[]
}

export interface GrowthChartSeriesPoint {
  date: string
  value: number
}

export interface GrowthChartViewModel {
  childId: string
  weight: GrowthChartSeriesPoint[]
  muac: GrowthChartSeriesPoint[]
  height: GrowthChartSeriesPoint[]
  headCircumference: GrowthChartSeriesPoint[]
}

export type GrowthMeasurementCreateInput = Omit<GrowthMeasurement, 'id'>
