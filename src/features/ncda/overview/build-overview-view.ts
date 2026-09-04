import { roundPct } from '@/features/monitoring'
import { ncdaNutritionAlertsPath } from '@/lib/ncda-drill-down'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
import type { MonitoringComplianceViewModel, MonitoringStedViewModel } from '@/models/monitoring'
import {
  SEVERITY_RANK,
  classificationCount,
  getDistrictPerformanceBand,
  stedCoverageFromCounts,
} from './performance-band'
import { percentagePointChange, trendDirectionFromDelta } from './previous-period'
import type {
  DistrictRisk,
  NcdaMapMetricId,
  OverviewAttentionItem,
  OverviewKpi,
  OverviewMetricStatus,
} from './types'

const COMPLIANCE_NULL_RATE_MAX = 0.5

export interface OverviewDistrictRow {
  id: string
  name: string
  isActive: boolean
}

function formatCount(value: number): string {
  return value.toLocaleString('en-US')
}

function formatRate(rate: number | null | undefined): string | null {
  if (rate == null || Number.isNaN(rate)) return null
  return `${roundPct(rate)}%`
}

function metricStatus(value: number | null | undefined, present: boolean): OverviewMetricStatus {
  if (!present || value == null || Number.isNaN(value)) return 'unavailable'
  return value === 0 ? 'zero' : 'ready'
}

function interpolate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, val]) => acc.replaceAll(`{${key}}`, val),
    template,
  )
}

function complianceReady(summary: MonitoringComplianceViewModel['summary'] | undefined): boolean {
  if (!summary) return false
  if (summary.classificationPopulated <= 0 || summary.centersAssessed <= 0) return false
  if (summary.classificationNullRate != null && summary.classificationNullRate > COMPLIANCE_NULL_RATE_MAX) {
    return false
  }
  return true
}

export function buildNationalKpis(input: {
  childrenActive?: number
  childrenPresent: boolean
  activeCenters?: number
  activeCentersPresent: boolean
  attendanceRate?: number | null
  attendancePresent: boolean
  previousAttendanceRate?: number | null
  compliance?: MonitoringComplianceViewModel['summary']
  compliancePresent: boolean
}): OverviewKpi[] {
  const children = input.childrenPresent ? (input.childrenActive ?? null) : null
  const centers = input.activeCentersPresent ? (input.activeCenters ?? null) : null
  const attendanceValue = input.attendancePresent ? formatRate(input.attendanceRate) : null
  const attendanceTrend = percentagePointChange(input.attendanceRate, input.previousAttendanceRate)

  const compliantReady = input.compliancePresent && complianceReady(input.compliance)
  const assessed = input.compliance?.centersAssessed ?? 0
  const compliantCount = classificationCount(input.compliance?.byClassification, 'compliant')
  const compliantRate = compliantReady && assessed > 0 ? (compliantCount / assessed) * 100 : null

  return [
    {
      key: 'children',
      label: ncda.overview.kpiChildren,
      value: children == null ? null : formatCount(children),
      status: metricStatus(children, input.childrenPresent),
      higherIsBetter: true,
    },
    {
      key: 'activeCenters',
      label: ncda.overview.kpiActiveCenters,
      value: centers == null ? null : formatCount(centers),
      status: metricStatus(centers, input.activeCentersPresent),
      higherIsBetter: true,
    },
    {
      key: 'attendance',
      label: ncda.overview.kpiAttendance,
      value: attendanceValue,
      status: input.attendancePresent
        ? input.attendanceRate == null
          ? 'unavailable'
          : input.attendanceRate === 0
            ? 'zero'
            : 'ready'
        : 'unavailable',
      trend: attendanceTrend,
      trendDirection: trendDirectionFromDelta(attendanceTrend),
      higherIsBetter: true,
    },
    {
      key: 'compliantCenters',
      label: ncda.overview.kpiCompliantCenters,
      value: compliantRate == null ? null : `${roundPct(compliantRate)}%`,
      status: compliantReady ? (compliantRate === 0 ? 'zero' : 'ready') : 'unavailable',
      higherIsBetter: true,
    },
  ]
}

export function buildAttentionItems(input: {
  nonCompliant?: number
  nonCompliantPresent: boolean
  nutritionSevere?: number
  nutritionPresent: boolean
  inactiveDistricts?: number
  inactivePresent: boolean
}): OverviewAttentionItem[] {
  const items: OverviewAttentionItem[] = []

  if (input.nonCompliantPresent && input.nonCompliant != null) {
    items.push({
      key: 'nonCompliant',
      tone: 'critical',
      value: input.nonCompliant,
      label: ncda.overview.attentionNonCompliant,
      description: ncda.overview.attentionNonCompliantHint,
      href: NCDA_PATHS.inspections,
    })
  }

  if (input.nutritionPresent && input.nutritionSevere != null) {
    items.push({
      key: 'nutrition',
      tone: 'concern',
      value: input.nutritionSevere,
      label: ncda.overview.attentionNutrition,
      description: ncda.overview.attentionNutritionHint,
      href: ncdaNutritionAlertsPath({ status: 'severe_nutrition' }),
    })
  }

  if (input.inactivePresent && input.inactiveDistricts != null) {
    items.push({
      key: 'inactiveDistricts',
      tone: 'watch',
      value: input.inactiveDistricts,
      label: ncda.overview.attentionInactiveDistricts,
      description: ncda.overview.attentionInactiveHint,
      href: NCDA_PATHS.districts,
    })
  }

  return items.filter((item) => item.value > 0).slice(0, 4)
}

export function buildDistrictRisks(
  districts: OverviewDistrictRow[],
  sted: MonitoringStedViewModel | undefined,
): DistrictRisk[] {
  const stedByDistrict = new Map<string, { coverage: number | null; assessments: number; children: number | null }>()
  for (const row of sted?.items ?? []) {
    if (!row.districtId) continue
    stedByDistrict.set(row.districtId, {
      coverage: stedCoverageFromCounts(row.assessmentsCompleted, row.childrenAssessed),
      assessments: row.assessmentsCompleted,
      children: row.childrenAssessed ?? null,
    })
  }

  return districts.map((district) => {
    const stedRow = stedByDistrict.get(district.id)
    const coverage = stedRow?.coverage ?? null
    const band = getDistrictPerformanceBand({
      isActive: district.isActive,
      stedCoverage: coverage,
    })

    let primaryIssue: string | undefined
    if (band.reason === 'inactive') {
      primaryIssue = ncda.overview.inactiveIssue
    } else if (band.reason === 'sted' && coverage != null) {
      primaryIssue = interpolate(ncda.overview.stedCoverageIssue, {
        rate: `${roundPct(coverage * 100)}%`,
      })
    }

    const rankScore =
      band.reason === 'inactive'
        ? -1
        : coverage == null
          ? 1
          : coverage

    return {
      districtId: district.id,
      districtName: district.name,
      severity: band.severity,
      primaryIssue,
      rankScore,
      stedCoverage: coverage,
      isActive: district.isActive,
    }
  })
}

export function selectPriorityDistricts(
  risks: DistrictRisk[],
  metric: NcdaMapMetricId,
  limit = 8,
): DistrictRisk[] {
  const filtered = risks.filter((row) => {
    if (metric === 'centers') return !row.isActive
    if (metric === 'inspections') {
      return row.stedCoverage != null && row.severity !== 'normal'
    }
    if (metric === 'attendance' || metric === 'nutrition') return false
    return row.severity !== 'normal' || !row.isActive
  })

  return [...filtered]
    .sort((a, b) => {
      const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
      if (sev !== 0) return sev
      return a.rankScore - b.rankScore
    })
    .slice(0, limit)
}
