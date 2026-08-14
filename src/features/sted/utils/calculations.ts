/**
 * Frontend-owned STED calculations (age bands, milestones, outcome, KPIs).
 *
 * These remain frontend-owned because:
 * 1. Age-band eligibility, milestone codes, and default outcomes are presentation /
 *    workflow rules already implemented in the UI and are the product source of truth.
 * 2. The backend stores free-form JSON and does not expose structured scoring APIs.
 * 3. District/caretaker KPIs (coverage, due follow-up, oya counts) are derived from
 *    local assessment arrays; `/monitoring/sted` is a thinner aggregate and is not
 *    wired in this sprint (Monitoring domain out of scope).
 *
 * Do not duplicate these rules elsewhere — import from here or `@/lib/sted-utils`.
 */
export {
  STED_PHYSICAL_PARTS,
  MILESTONES_1_3,
  MILESTONES_4_6,
  emptyPhysicalCheck,
  isPhysicalClear,
  ageInYears,
  getStedAgeBand,
  getMilestoneCodes,
  isAnswered,
  emptyMilestones,
  hasAnyOya,
  hasPhysicalProblem,
  requiresStedReferral,
  addMonths,
  buildDefaultOutcome,
  getLatestStedAssessment,
  getChildrenDueForStedFollowUp,
  getEligibleStedChildren,
  computeStedCenterSummary,
  countOyaResponses,
  filterStedChildren,
  computeCenterStedComparison,
  computeStedDistrictSummary,
  setPhysicalPart,
  markAllPhysicalNormal,
} from '@/lib/sted-utils'

export type {
  MilestoneCode1_3,
  MilestoneCode4_6,
  StedCenterSummaryStats,
  StedListFilter,
  CenterStedComparison,
} from '@/lib/sted-utils'
