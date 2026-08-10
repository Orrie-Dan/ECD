/**
 * Nutrition feature utilities — shared MUAC / due-status helpers.
 */
export {
  MUAC_SEVERE_CM,
  MUAC_MODERATE_CM,
  MUAC_AT_RISK_CM,
  ASSESSMENT_INTERVAL_DAYS,
  ASSESSMENT_OVERDUE_DAYS,
  classifyNutrition,
  requiresReferral,
  getTodayDate,
  daysBetween,
  getAssessmentDueStatus,
  getNextAssessmentDate,
} from '@/lib/nutrition'

export {
  getLatestAssessment,
  buildAssessmentFromMeasurement,
  buildNutritionAlerts,
  computeNutritionStatusCounts,
} from '@/lib/nutrition-utils'
