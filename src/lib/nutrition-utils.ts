import type {
  AssessmentDueStatus,
  Child,
  GrowthMeasurement,
  NutritionAssessment,
  NutritionStatus,
} from '@/types'
import {
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
}

export interface GrowthMeasurementInput {
  weightKg: number
  heightCm: number
  muacCm: number
  headCircumferenceCm?: number
}

export interface GrowthSummaryStats {
  totalChildren: number
  /** Children with at least one measurement on record. */
  assessed: number
  /** Children with a measurement within the recommended interval. */
  upToDate: number
  /** Children due, overdue, or never measured (need action). */
  due: number
  overdue: number
  atRisk: number
  /** Share of children with up-to-date measurements. */
  coverageRate: number
}

export interface CenterGrowthComparison {
  centerId: string
  centerName: string
  sector: string
  totalChildren: number
  assessed: number
  overdue: number
  atRisk: number
  coverageRate: number
}

export function getLatestMeasurement(
  measurements: GrowthMeasurement[],
  childId: string,
): GrowthMeasurement | undefined {
  return measurements
    .filter((m) => m.childId === childId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0]
}

export function getLatestAssessment(
  assessments: NutritionAssessment[],
  childId: string,
): NutritionAssessment | undefined {
  return assessments
    .filter((a) => a.childId === childId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0]
}

export function sortMeasurementsDesc(measurements: GrowthMeasurement[]): GrowthMeasurement[] {
  return [...measurements].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  )
}

export function validateMeasurementInput(
  input: {
    date: string
    weightKg: string
    heightCm: string
    muacCm: string
    headCircumferenceCm: string
  },
  today = getTodayDate(),
  /** Form VII default: weight + height + MUAC. HC remains optional. */
  options: { requireHeight?: boolean } = {},
): Record<string, string> {
  const { requireHeight = true } = options
  const errors: Record<string, string> = {}

  if (!input.date) {
    errors.date = 'required'
  } else if (input.date > today) {
    errors.date = 'future'
  }

  const weight = Number(input.weightKg)
  if (!input.weightKg.trim()) errors.weightKg = 'required'
  else if (Number.isNaN(weight) || weight <= 0 || weight > 50) errors.weightKg = 'range'

  if (requireHeight || input.heightCm.trim()) {
    const height = Number(input.heightCm)
    if (requireHeight && !input.heightCm.trim()) errors.heightCm = 'required'
    else if (input.heightCm.trim() && (Number.isNaN(height) || height <= 0 || height > 150)) {
      errors.heightCm = 'range'
    }
  }

  const muac = Number(input.muacCm)
  if (!input.muacCm.trim()) errors.muacCm = 'required'
  else if (Number.isNaN(muac) || muac <= 0 || muac > 25) errors.muacCm = 'range'

  if (input.headCircumferenceCm.trim()) {
    const hc = Number(input.headCircumferenceCm)
    if (Number.isNaN(hc) || hc <= 0 || hc > 60) errors.headCircumferenceCm = 'range'
  }

  return errors
}

export function parseMeasurementInput(
  input: {
    weightKg: string
    heightCm: string
    muacCm: string
    headCircumferenceCm: string
  },
  fallbackHeightCm = 0,
): GrowthMeasurementInput {
  return {
    weightKg: Number(input.weightKg),
    heightCm: input.heightCm.trim() ? Number(input.heightCm) : fallbackHeightCm,
    muacCm: Number(input.muacCm),
    headCircumferenceCm: input.headCircumferenceCm.trim()
      ? Number(input.headCircumferenceCm)
      : undefined,
  }
}

export function buildAssessmentFromMeasurement(
  measurement: GrowthMeasurement,
  id: string,
): NutritionAssessment {
  const status = classifyNutrition({
    muacCm: measurement.muacCm,
    weightKg: measurement.weightKg,
    heightCm: measurement.heightCm,
  })
  return {
    id,
    childId: measurement.childId,
    measurementId: measurement.id,
    date: measurement.date,
    status,
    requiresReferral: requiresReferral(status),
    notes: measurement.notes,
  }
}

export function computeGrowthSummary(
  children: Child[],
  measurements: GrowthMeasurement[],
  assessments: NutritionAssessment[],
  today = getTodayDate(),
): GrowthSummaryStats {
  const active = children.filter((c) => c.status === 'active')
  let assessed = 0
  let upToDate = 0
  let due = 0
  let overdue = 0
  let atRisk = 0

  for (const child of active) {
    const latest = getLatestMeasurement(measurements, child.id)
    const dueStatus = getAssessmentDueStatus(latest?.date, today)
    if (latest) assessed++
    if (dueStatus === 'up_to_date') upToDate++
    if (dueStatus === 'due' || dueStatus === 'overdue' || dueStatus === 'never') due++
    if (dueStatus === 'overdue') overdue++
    const assessment = getLatestAssessment(assessments, child.id)
    if (assessment && assessment.status !== 'normal') atRisk++
  }

  const coverageRate =
    active.length === 0 ? 0 : Math.round((upToDate / active.length) * 100)

  return {
    totalChildren: active.length,
    assessed,
    upToDate,
    due,
    overdue,
    atRisk,
    coverageRate,
  }
}

export function getChildrenDueForAssessment(
  children: Child[],
  measurements: GrowthMeasurement[],
  today = getTodayDate(),
): Child[] {
  return children.filter((c) => {
    if (c.status !== 'active') return false
    const latest = getLatestMeasurement(measurements, c.id)
    const status = getAssessmentDueStatus(latest?.date, today)
    return status === 'due' || status === 'overdue' || status === 'never'
  })
}

export function getChildrenOverdueForAssessment(
  children: Child[],
  measurements: GrowthMeasurement[],
  today = getTodayDate(),
): Child[] {
  return children.filter((c) => {
    if (c.status !== 'active') return false
    const latest = getLatestMeasurement(measurements, c.id)
    return getAssessmentDueStatus(latest?.date, today) === 'overdue'
  })
}

export function getChildrenUpToDateForAssessment(
  children: Child[],
  measurements: GrowthMeasurement[],
  today = getTodayDate(),
): Child[] {
  return children.filter((c) => {
    if (c.status !== 'active') return false
    const latest = getLatestMeasurement(measurements, c.id)
    return getAssessmentDueStatus(latest?.date, today) === 'up_to_date'
  })
}

export type GrowthListFilter = 'all' | 'due' | 'overdue' | 'at_risk' | 'up_to_date'

export function filterGrowthChildren(
  children: Child[],
  measurements: GrowthMeasurement[],
  assessments: NutritionAssessment[],
  filter: GrowthListFilter,
  today = getTodayDate(),
): Child[] {
  switch (filter) {
    case 'due':
      return getChildrenDueForAssessment(children, measurements, today)
    case 'overdue':
      return getChildrenOverdueForAssessment(children, measurements, today)
    case 'at_risk':
      return getChildrenAtNutritionalRisk(children, assessments)
    case 'up_to_date':
      return getChildrenUpToDateForAssessment(children, measurements, today)
    case 'all':
    default:
      return children.filter((c) => c.status === 'active')
  }
}

export function getChildrenAtNutritionalRisk(
  children: Child[],
  assessments: NutritionAssessment[],
): Child[] {
  return children.filter((c) => {
    if (c.status !== 'active') return false
    const latest = getLatestAssessment(assessments, c.id)
    return latest != null && latest.status !== 'normal'
  })
}

export function getRecentlyMeasuredChildren(
  children: Child[],
  measurements: GrowthMeasurement[],
  limit = 8,
): { child: Child; measurement: GrowthMeasurement }[] {
  const byChild = new Map<string, GrowthMeasurement>()
  for (const m of sortMeasurementsDesc(measurements)) {
    if (!byChild.has(m.childId)) byChild.set(m.childId, m)
  }

  const rows: { child: Child; measurement: GrowthMeasurement }[] = []
  for (const child of children) {
    if (child.status !== 'active') continue
    const measurement = byChild.get(child.id)
    if (measurement) rows.push({ child, measurement })
  }

  return rows
    .sort((a, b) => b.measurement.date.localeCompare(a.measurement.date))
    .slice(0, limit)
}

export function computeCenterGrowthComparison(
  children: Child[],
  measurements: GrowthMeasurement[],
  assessments: NutritionAssessment[],
  centers: { id: string; name: string; sector: string }[],
  today = getTodayDate(),
): CenterGrowthComparison[] {
  return centers.map((center) => {
    const centerChildren = children.filter(
      (c) => c.centerId === center.id && c.status === 'active',
    )
    const summary = computeGrowthSummary(centerChildren, measurements, assessments, today)
    return {
      centerId: center.id,
      centerName: center.name,
      sector: center.sector,
      totalChildren: summary.totalChildren,
      assessed: summary.assessed,
      overdue: summary.overdue,
      atRisk: summary.atRisk,
      coverageRate: summary.coverageRate,
    }
  })
}

/** Chart series for Form VII: weight, height, and MUAC. */
export function buildTrendPoints(
  measurements: GrowthMeasurement[],
): { date: string; weightKg: number; heightCm: number; muacCm: number }[] {
  return sortMeasurementsDesc(measurements)
    .slice()
    .reverse()
    .map((m) => ({
      date: m.date,
      weightKg: m.weightKg,
      heightCm: m.heightCm,
      muacCm: m.muacCm,
    }))
}

/** YYYY-MM from an ISO date string. */
export function toYearMonth(date: string): string {
  return date.slice(0, 7)
}

export function getCurrentYearMonth(today = getTodayDate()): string {
  return toYearMonth(today)
}

export function getMeasurementForMonth(
  measurements: GrowthMeasurement[],
  childId: string,
  yearMonth: string,
): GrowthMeasurement | undefined {
  return sortMeasurementsDesc(measurements).find(
    (m) => m.childId === childId && toYearMonth(m.date) === yearMonth,
  )
}

export type GrowthRosterView = 'pending' | 'measured' | 'all'

export function partitionGrowthRoster(
  children: Child[],
  measurements: GrowthMeasurement[],
  yearMonth: string,
): { pending: Child[]; measured: Child[] } {
  const pending: Child[] = []
  const measured: Child[] = []
  for (const child of children) {
    if (child.status !== 'active') continue
    if (getMeasurementForMonth(measurements, child.id, yearMonth)) {
      measured.push(child)
    } else {
      pending.push(child)
    }
  }
  return { pending, measured }
}

export function hasWeightFaltered(
  measurements: GrowthMeasurement[],
  childId: string,
): boolean {
  const sorted = sortMeasurementsDesc(measurements.filter((m) => m.childId === childId))
  if (sorted.length < 2) return false
  return sorted[0].weightKg < sorted[1].weightKg
}

/* ─── District monitoring helpers (client-side) ─── */

export type NutritionStatusFilter = 'all' | NutritionStatus
export type GrowthAgeGroupFilter = 'all' | '3-4' | '5-6' | 'other'

export interface DistrictGrowthFilters {
  search: string
  centerId: string
  yearMonth: string
  status: NutritionStatusFilter
  ageGroup: GrowthAgeGroupFilter
}

export const DEFAULT_DISTRICT_GROWTH_FILTERS: DistrictGrowthFilters = {
  search: '',
  centerId: 'all',
  yearMonth: '',
  status: 'all',
  ageGroup: 'all',
}

export interface DistrictGrowthChildRow {
  childId: string
  fullName: string
  dateOfBirth: string
  age: number
  gender: Child['gender']
  centerId: string
  centerName: string
  sector: string
  lastScreeningDate?: string
  nutritionStatus?: NutritionStatus
  requiresReferral: boolean
  dueStatus: AssessmentDueStatus
}

export type NutritionAlertKind = 'severe' | 'moderate' | 'at_risk' | 'overdue' | 'due'

export interface NutritionAlert {
  id: string
  childId: string
  childName: string
  centerId: string
  centerName: string
  kind: NutritionAlertKind
  nutritionStatus?: NutritionStatus
  recommendationKey: NutritionAlertKind
  lastScreeningDate?: string
  priority: number
}

export interface NutritionStatusCounts {
  normal: number
  at_risk: number
  moderate: number
  severe: number
  requiresReferral: number
  unassessed: number
}

export interface CoverageByCenterPoint {
  centerId: string
  centerName: string
  coverageRate: number
  atRisk: number
  totalChildren: number
}

function getAgeGroupForFilter(age: number): Exclude<GrowthAgeGroupFilter, 'all'> {
  if (age >= 3 && age <= 4) return '3-4'
  if (age >= 5 && age <= 6) return '5-6'
  return 'other'
}

export function computeNutritionStatusCounts(
  children: Child[],
  assessments: NutritionAssessment[],
): NutritionStatusCounts {
  const counts: NutritionStatusCounts = {
    normal: 0,
    at_risk: 0,
    moderate: 0,
    severe: 0,
    requiresReferral: 0,
    unassessed: 0,
  }

  for (const child of children) {
    if (child.status !== 'active') continue
    const latest = getLatestAssessment(assessments, child.id)
    if (!latest) {
      counts.unassessed++
      continue
    }
    counts[latest.status]++
    if (latest.requiresReferral || requiresReferral(latest.status)) {
      counts.requiresReferral++
    }
  }

  return counts
}

export function buildDistrictGrowthChildRows(
  children: Child[],
  measurements: GrowthMeasurement[],
  assessments: NutritionAssessment[],
  calculateAge: (dob: string) => number,
  today = getTodayDate(),
): DistrictGrowthChildRow[] {
  const rows: DistrictGrowthChildRow[] = []

  for (const child of children) {
    if (child.status !== 'active') continue
    const latestMeasurement = getLatestMeasurement(measurements, child.id)
    const latestAssessment = getLatestAssessment(assessments, child.id)
    const status = latestAssessment?.status
    rows.push({
      childId: child.id,
      fullName: child.fullName,
      dateOfBirth: child.dateOfBirth,
      age: calculateAge(child.dateOfBirth),
      gender: child.gender,
      centerId: child.centerId,
      centerName: child.centerName,
      sector: child.sector,
      lastScreeningDate: latestMeasurement?.date ?? latestAssessment?.date,
      nutritionStatus: status,
      requiresReferral: latestAssessment
        ? latestAssessment.requiresReferral || requiresReferral(latestAssessment.status)
        : false,
      dueStatus: getAssessmentDueStatus(latestMeasurement?.date, today),
    })
  }

  return rows.sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export function filterDistrictGrowthRows(
  rows: DistrictGrowthChildRow[],
  filters: DistrictGrowthFilters,
): DistrictGrowthChildRow[] {
  const q = filters.search.trim().toLowerCase()

  return rows.filter((row) => {
    if (filters.centerId !== 'all' && row.centerId !== filters.centerId) return false

    if (filters.status !== 'all') {
      if (!row.nutritionStatus || row.nutritionStatus !== filters.status) return false
    }

    if (filters.ageGroup !== 'all' && getAgeGroupForFilter(row.age) !== filters.ageGroup) {
      return false
    }

    if (filters.yearMonth) {
      if (!row.lastScreeningDate || toYearMonth(row.lastScreeningDate) !== filters.yearMonth) {
        return false
      }
    }

    if (q) {
      const haystack = `${row.fullName} ${row.centerName} ${row.sector}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }

    return true
  })
}

export function isDistrictGrowthFiltersActive(filters: DistrictGrowthFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.centerId !== 'all' ||
    filters.yearMonth !== '' ||
    filters.status !== 'all' ||
    filters.ageGroup !== 'all'
  )
}

const ALERT_PRIORITY: Record<NutritionAlertKind, number> = {
  severe: 0,
  moderate: 1,
  at_risk: 2,
  overdue: 3,
  due: 4,
}

export function buildNutritionAlerts(
  rows: DistrictGrowthChildRow[],
  limit = 8,
): NutritionAlert[] {
  const alerts: NutritionAlert[] = []

  for (const row of rows) {
    if (row.nutritionStatus === 'severe') {
      alerts.push({
        id: `${row.childId}-severe`,
        childId: row.childId,
        childName: row.fullName,
        centerId: row.centerId,
        centerName: row.centerName,
        kind: 'severe',
        nutritionStatus: 'severe',
        recommendationKey: 'severe',
        lastScreeningDate: row.lastScreeningDate,
        priority: ALERT_PRIORITY.severe,
      })
      continue
    }
    if (row.nutritionStatus === 'moderate') {
      alerts.push({
        id: `${row.childId}-moderate`,
        childId: row.childId,
        childName: row.fullName,
        centerId: row.centerId,
        centerName: row.centerName,
        kind: 'moderate',
        nutritionStatus: 'moderate',
        recommendationKey: 'moderate',
        lastScreeningDate: row.lastScreeningDate,
        priority: ALERT_PRIORITY.moderate,
      })
      continue
    }
    if (row.nutritionStatus === 'at_risk') {
      alerts.push({
        id: `${row.childId}-at_risk`,
        childId: row.childId,
        childName: row.fullName,
        centerId: row.centerId,
        centerName: row.centerName,
        kind: 'at_risk',
        nutritionStatus: 'at_risk',
        recommendationKey: 'at_risk',
        lastScreeningDate: row.lastScreeningDate,
        priority: ALERT_PRIORITY.at_risk,
      })
      continue
    }
    if (row.dueStatus === 'overdue' || row.dueStatus === 'never') {
      alerts.push({
        id: `${row.childId}-overdue`,
        childId: row.childId,
        childName: row.fullName,
        centerId: row.centerId,
        centerName: row.centerName,
        kind: 'overdue',
        nutritionStatus: row.nutritionStatus,
        recommendationKey: 'overdue',
        lastScreeningDate: row.lastScreeningDate,
        priority: ALERT_PRIORITY.overdue,
      })
      continue
    }
    if (row.dueStatus === 'due') {
      alerts.push({
        id: `${row.childId}-due`,
        childId: row.childId,
        childName: row.fullName,
        centerId: row.centerId,
        centerName: row.centerName,
        kind: 'due',
        nutritionStatus: row.nutritionStatus,
        recommendationKey: 'due',
        lastScreeningDate: row.lastScreeningDate,
        priority: ALERT_PRIORITY.due,
      })
    }
  }

  return alerts
    .sort((a, b) => a.priority - b.priority || a.childName.localeCompare(b.childName))
    .slice(0, limit)
}

export function buildCoverageByCenterSeries(
  comparison: CenterGrowthComparison[],
  limit = 8,
): CoverageByCenterPoint[] {
  return [...comparison]
    .filter((row) => row.totalChildren > 0)
    .sort((a, b) => a.coverageRate - b.coverageRate)
    .slice(0, limit)
    .map((row) => ({
      centerId: row.centerId,
      centerName: row.centerName,
      coverageRate: row.coverageRate,
      atRisk: row.atRisk,
      totalChildren: row.totalChildren,
    }))
}

export function buildStatusDistributionSeries(counts: NutritionStatusCounts): {
  key: keyof Pick<NutritionStatusCounts, 'normal' | 'at_risk' | 'moderate' | 'severe'>
  count: number
}[] {
  return [
    { key: 'normal', count: counts.normal },
    { key: 'at_risk', count: counts.at_risk },
    { key: 'moderate', count: counts.moderate },
    { key: 'severe', count: counts.severe },
  ]
}
