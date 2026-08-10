/**
 * Frontend-only growth calculations — re-exports shared nutrition core + growth helpers.
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
  getLatestMeasurement,
  getLatestAssessment,
  getAssessmentDueStatus,
  getNextAssessmentDate,
  sortMeasurementsDesc,
  validateMeasurementInput,
  buildAssessmentFromMeasurement,
  computeGrowthSummary,
  buildTrendPoints,
} from '@/lib/nutrition-utils'
