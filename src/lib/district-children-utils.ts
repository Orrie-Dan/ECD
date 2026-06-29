import type {
  Child,
  EnrollmentPeriod,
  EnrollmentPeriodSummary,
  EnrollmentTrendPoint,
  Gender,
} from '@/types'
import {
  applySharedChildFilters,
  type ChildrenSearchFilters,
  isChildrenSearchActive,
  DEFAULT_CHILDREN_SEARCH,
} from '@/lib/child-filters'
import { calculateAge } from '@/lib/mock-data'
import { ENROLLMENT_SUMMARY_BY_PERIOD, ENROLLMENT_TREND_BY_PERIOD } from '@/lib/mock-data'

export interface ChildrenDistributionData {
  ageGroups: { label: string; count: number; percent: number }[]
  gender: { label: string; count: number; percent: number }[]
}

function sortChildren(children: Child[], sort: ChildrenSearchFilters['sort']): Child[] {
  return [...children].sort((a, b) => {
    switch (sort) {
      case 'name-desc':
        return b.fullName.localeCompare(a.fullName, 'rw')
      case 'registered-desc':
        return b.registeredAt.localeCompare(a.registeredAt)
      case 'name-asc':
      default:
        return a.fullName.localeCompare(b.fullName, 'rw')
    }
  })
}

export function filterDistrictChildren(
  children: Child[],
  filters: ChildrenSearchFilters,
): Child[] {
  return sortChildren(applySharedChildFilters(children, filters), filters.sort)
}

export function computeChildrenDistribution(children: Child[]): ChildrenDistributionData {
  if (children.length === 0) {
    return {
      ageGroups: [
        { label: '2-3', count: 0, percent: 0 },
        { label: '3-4', count: 0, percent: 0 },
        { label: '4-5', count: 0, percent: 0 },
        { label: '5-6', count: 0, percent: 0 },
      ],
      gender: [
        { label: 'Abahungu', count: 0, percent: 0 },
        { label: 'Abakobwa', count: 0, percent: 0 },
      ],
    }
  }

  const ageBuckets = { '2-3': 0, '3-4': 0, '4-5': 0, '5-6': 0 }
  const genderCounts: Record<Gender, number> = { Umuhungu: 0, Umukobwa: 0 }

  for (const child of children) {
    const age = calculateAge(child.dateOfBirth)
    if (age <= 3) ageBuckets['2-3']++
    else if (age === 4) ageBuckets['3-4']++
    else if (age === 5) ageBuckets['4-5']++
    else ageBuckets['5-6']++
    genderCounts[child.gender]++
  }

  const total = children.length
  const toPercent = (n: number) => Math.round((n / total) * 100)

  return {
    ageGroups: (Object.entries(ageBuckets) as [string, number][]).map(([label, count]) => ({
      label,
      count,
      percent: toPercent(count),
    })),
    gender: [
      { label: 'Abahungu', count: genderCounts.Umuhungu, percent: toPercent(genderCounts.Umuhungu) },
      { label: 'Abakobwa', count: genderCounts.Umukobwa, percent: toPercent(genderCounts.Umukobwa) },
    ],
  }
}

function scaleSummary(
  base: EnrollmentPeriodSummary,
  scale: number,
  totalEnrolled: number,
): EnrollmentPeriodSummary {
  return {
    totalEnrolled,
    newRegistrations: Math.max(0, Math.round(base.newRegistrations * scale)),
    dropouts: Math.max(0, Math.round(base.dropouts * scale)),
    netGrowth: Math.round(base.netGrowth * scale),
    trends: base.trends,
  }
}

function scaleTrendPoint(point: EnrollmentTrendPoint, scale: number): EnrollmentTrendPoint {
  return {
    ...point,
    newRegistrations: Math.max(0, Math.round(point.newRegistrations * scale)),
    dropouts: Math.max(0, Math.round(point.dropouts * scale)),
    netEnrollment: Math.round(point.netEnrollment * scale),
  }
}

export function getDistrictChildrenSummary(
  period: EnrollmentPeriod,
  filteredCount: number,
  allCount: number,
  filters: ChildrenSearchFilters,
  yearMonthLabel?: string | null,
): EnrollmentPeriodSummary {
  const base = ENROLLMENT_SUMMARY_BY_PERIOD[period]
  const hasFilters = isChildrenSearchActive(filters, DEFAULT_CHILDREN_SEARCH)
  const scale = allCount > 0 ? filteredCount / allCount : 1

  if (yearMonthLabel && period === 'year') {
    const monthPoint = ENROLLMENT_TREND_BY_PERIOD.year.find((p) => p.label === yearMonthLabel)
    if (monthPoint) {
      const monthScale = hasFilters ? scale : 1
      return {
        totalEnrolled: hasFilters ? filteredCount : base.totalEnrolled,
        newRegistrations: Math.round(monthPoint.newRegistrations * monthScale),
        dropouts: Math.round(monthPoint.dropouts * monthScale),
        netGrowth: Math.round(monthPoint.netEnrollment * monthScale),
        trends: base.trends,
      }
    }
  }

  if (!hasFilters && scale >= 0.99) {
    return base
  }

  return scaleSummary(base, scale, filteredCount)
}

export function getDistrictEnrollmentTrend(
  period: EnrollmentPeriod,
  filteredCount: number,
  allCount: number,
  filters: ChildrenSearchFilters,
  yearMonthLabel?: string | null,
): EnrollmentTrendPoint[] {
  const data = ENROLLMENT_TREND_BY_PERIOD[period]
  const hasFilters = isChildrenSearchActive(filters, DEFAULT_CHILDREN_SEARCH)
  const scale = allCount > 0 && hasFilters ? filteredCount / allCount : 1

  if (yearMonthLabel && period === 'year') {
    const monthPoint = data.find((p) => p.label === yearMonthLabel)
    return monthPoint ? [scaleTrendPoint(monthPoint, scale)] : data.map((p) => scaleTrendPoint(p, scale))
  }

  if (scale >= 0.99 && !hasFilters) {
    return data
  }

  return data.map((p) => scaleTrendPoint(p, scale))
}

export function splitHighlight(text: string, query: string): { text: string; match: boolean }[] {
  const trimmed = query.trim()
  if (!trimmed) return [{ text, match: false }]

  const lowerText = text.toLowerCase()
  const lowerQuery = trimmed.toLowerCase()
  const parts: { text: string; match: boolean }[] = []
  let start = 0
  let index = lowerText.indexOf(lowerQuery)

  while (index !== -1) {
    if (index > start) {
      parts.push({ text: text.slice(start, index), match: false })
    }
    parts.push({ text: text.slice(index, index + trimmed.length), match: true })
    start = index + trimmed.length
    index = lowerText.indexOf(lowerQuery, start)
  }

  if (start < text.length) {
    parts.push({ text: text.slice(start), match: false })
  }

  return parts.length > 0 ? parts : [{ text, match: false }]
}

export function buildDistrictChildrenFilterSummary(
  filters: ChildrenSearchFilters,
  period: EnrollmentPeriod,
): string | null {
  const clauses: string[] = []

  if (filters.childName.trim()) {
    clauses.push(`amazina arimo "${filters.childName.trim()}"`)
  }
  if (filters.gender !== 'all') {
    clauses.push(`igitsina: ${filters.gender}`)
  }
  if (filters.age !== 'all') {
    clauses.push(`imyaka ${filters.age}`)
  }
  if (filters.sector) {
    clauses.push(`umurenge wa ${filters.sector}`)
  }
  if (filters.district) {
    clauses.push(`akarere ka ${filters.district}`)
  }
  if (filters.guardianName.trim()) {
    clauses.push(`umubyeyi arimo "${filters.guardianName.trim()}"`)
  }

  const periodLabels: Record<EnrollmentPeriod, string> = {
    today: 'uyu munsi',
    week: 'iki cyumweru',
    month: 'uku kwezi',
    year: 'uyu mwaka',
  }
  clauses.push(`igihe: ${periodLabels[period]}`)

  if (clauses.length <= 1) return clauses.length === 1 ? clauses[0] : null
  return clauses.join(' · ')
}
