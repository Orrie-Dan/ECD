/**
 * Shared nutrition domain helpers (MUAC / due status).
 * Prefer this module for new feature code; `@/lib/nutrition-utils` remains for UI aggregations.
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
} from './core'
