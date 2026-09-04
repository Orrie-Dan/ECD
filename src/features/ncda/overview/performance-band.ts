import type { DistrictSeverity } from './types'

/**
 * Frontend STED coverage bands for national situational awareness.
 * Backend does not supply district performance classification.
 *
 * coverage = assessmentsCompleted / childrenAssessed (0–1).
 */
export const STED_COVERAGE_BANDS = {
  /** ≥ 70% — Gukora neza */
  normal: 0.7,
  /** ≥ 50% — Bikeneye gukurikiranwa */
  watch: 0.5,
  /** ≥ 30% — Biteye impungenge */
  concern: 0.3,
  /** < 30% — Bikeneye kwitabwaho */
} as const

export const SEVERITY_RANK: Record<DistrictSeverity, number> = {
  critical: 0,
  concern: 1,
  watch: 2,
  normal: 3,
}

export function stedCoverageFromCounts(
  assessmentsCompleted: number | null | undefined,
  childrenAssessed: number | null | undefined,
): number | null {
  if (childrenAssessed == null || childrenAssessed <= 0) return null
  if (assessmentsCompleted == null || Number.isNaN(assessmentsCompleted)) return null
  return assessmentsCompleted / childrenAssessed
}

export function bandFromStedCoverage(coverage: number | null): DistrictSeverity | null {
  if (coverage == null || Number.isNaN(coverage)) return null
  if (coverage >= STED_COVERAGE_BANDS.normal) return 'normal'
  if (coverage >= STED_COVERAGE_BANDS.watch) return 'watch'
  if (coverage >= STED_COVERAGE_BANDS.concern) return 'concern'
  return 'critical'
}

export type DistrictBandReason = 'inactive' | 'sted' | 'none'

export interface DistrictPerformanceBand {
  severity: DistrictSeverity
  reason: DistrictBandReason
}

/**
 * Combined district performance band for the national command centre.
 * Inactive directory status outranks STED coverage.
 */
export function getDistrictPerformanceBand(input: {
  isActive: boolean
  stedCoverage: number | null
}): DistrictPerformanceBand {
  if (!input.isActive) {
    return { severity: 'critical', reason: 'inactive' }
  }
  const sted = bandFromStedCoverage(input.stedCoverage)
  if (sted) return { severity: sted, reason: 'sted' }
  return { severity: 'normal', reason: 'none' }
}

export function classificationCount(
  record: Record<string, number> | undefined,
  key: string,
): number {
  if (!record) return 0
  return (
    record[key] ??
    record[key.toLowerCase()] ??
    record[key.toUpperCase()] ??
    0
  )
}
