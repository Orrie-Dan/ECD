export type OverviewTrendDirection = 'up' | 'down' | 'flat'

export type DistrictSeverity = 'normal' | 'watch' | 'concern' | 'critical'

export type OverviewMetricStatus = 'ready' | 'unavailable' | 'zero'

export type NcdaMapMetricId = 'overall' | 'attendance' | 'nutrition' | 'inspections' | 'centers'

export interface OverviewKpi {
  key: 'children' | 'activeCenters' | 'attendance' | 'compliantCenters'
  label: string
  /** Display value; `null` means unavailable (not a real zero). */
  value: string | number | null
  status: OverviewMetricStatus
  /** Percentage-point or relative change vs previous comparable period. */
  trend?: number
  trendDirection?: OverviewTrendDirection
  /** True when a higher value is an improvement (enrollment, compliance). */
  higherIsBetter: boolean
}

export interface OverviewAttentionItem {
  key: 'nonCompliant' | 'nutrition' | 'inactiveDistricts' | 'sted'
  tone: 'critical' | 'concern' | 'watch'
  value: number
  label: string
  description: string
  href: string
}

export interface DistrictRisk {
  districtId: string
  districtName: string
  severity: DistrictSeverity
  primaryIssue?: string
  /** Strongest numeric deviation used for ranking (lower coverage / higher count). */
  rankScore: number
  stedCoverage: number | null
  isActive: boolean
}
