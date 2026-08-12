/**
 * Authoritative NCDA dashboard metric definitions (Sprint 5.5C).
 * Only metrics classified READY / READY WITH FRONTEND WORK are listed as supported.
 */

export type NcdaMetricFreshness =
  | 'near-real-time'
  | 'period-based'
  | 'snapshot'
  | 'unavailable'

export type NcdaMetricAvailability = 'supported' | 'unavailable'

export interface NcdaMetricDefinition {
  id: string
  name: string
  source: string
  definition: string
  scope: 'national'
  period: string
  freshness: NcdaMetricFreshness
  availability: NcdaMetricAvailability
  unavailableReason?: string
}

export const NCDA_DASHBOARD_METRICS: NcdaMetricDefinition[] = [
  {
    id: 'districts',
    name: 'Total Districts',
    source: 'GET /api/v1/districts (total)',
    definition: 'Count of districts visible to ncda_admin (paginated list total).',
    scope: 'national',
    period: 'n/a (directory snapshot)',
    freshness: 'snapshot',
    availability: 'supported',
  },
  {
    id: 'centers',
    name: 'Total Centers',
    source: 'GET /api/v1/analytics/dashboard → centersInScope',
    definition: 'Non-deleted ECD centers in national scope (deletedAt IS NULL).',
    scope: 'national',
    period: 'n/a (directory snapshot)',
    freshness: 'snapshot',
    availability: 'supported',
  },
  {
    id: 'activeCenters',
    name: 'Active Centers',
    source: 'GET /api/v1/centers?status=active (total)',
    definition: 'Centers with status=active (paginated list total).',
    scope: 'national',
    period: 'n/a (directory snapshot)',
    freshness: 'snapshot',
    availability: 'supported',
  },
  {
    id: 'childrenActive',
    name: 'Active Enrolled Children',
    source: 'GET /api/v1/analytics/dashboard → children.active',
    definition: 'Children with status=active and deletedAt IS NULL in national scope.',
    scope: 'national',
    period: 'snapshot (not range-bound)',
    freshness: 'snapshot',
    availability: 'supported',
  },
  {
    id: 'childrenTotal',
    name: 'Children (all statuses)',
    source: 'GET /api/v1/analytics/dashboard → children.total',
    definition: 'Non-deleted children in national scope (all lifecycle statuses).',
    scope: 'national',
    period: 'snapshot (not range-bound)',
    freshness: 'snapshot',
    availability: 'supported',
  },
  {
    id: 'newRegistrations',
    name: 'New Registrations',
    source: 'GET /api/v1/reports/district → kpis.newRegistrations',
    definition: 'Children with registeredAt within the selected inclusive UTC date range.',
    scope: 'national',
    period: 'selected from/to (default last 30 UTC days if omitted)',
    freshness: 'period-based',
    availability: 'supported',
  },
  {
    id: 'dropouts',
    name: 'Dropouts (archived)',
    source: 'GET /api/v1/reports/district → kpis.dropouts',
    definition:
      'Children with status=archived and archivedAt within range. Transfers are not dropouts.',
    scope: 'national',
    period: 'selected from/to',
    freshness: 'period-based',
    availability: 'supported',
  },
  {
    id: 'attendance',
    name: 'Attendance',
    source: 'GET /api/v1/analytics/dashboard → attendance',
    definition:
      'Present/absent record counts and rate = present/(present+absent) in range. Null rate when no records.',
    scope: 'national',
    period: 'selected from/to',
    freshness: 'period-based',
    availability: 'supported',
  },
  {
    id: 'nutrition',
    name: 'Nutrition screenings',
    source: 'GET /api/v1/analytics/dashboard → nutrition',
    definition:
      'Screening counts by nutritionStatus and requiresReferral flag within range.',
    scope: 'national',
    period: 'selected from/to',
    freshness: 'period-based',
    availability: 'supported',
  },
  {
    id: 'feeding',
    name: 'Feeding days',
    source: 'GET /api/v1/analytics/dashboard → feeding',
    definition:
      'Center feeding-day records in range (milk/porridge/balanced meal flags + distinct centers reporting).',
    scope: 'national',
    period: 'selected from/to',
    freshness: 'period-based',
    availability: 'supported',
  },
  {
    id: 'referrals',
    name: 'Referrals',
    source: 'GET /api/v1/analytics/dashboard → referrals',
    definition:
      'Created/completed/cancelled by referralDate in range; pending is open pipeline (not range-limited).',
    scope: 'national',
    period: 'selected from/to (pending = open)',
    freshness: 'period-based',
    availability: 'supported',
  },
  {
    id: 'stedCount',
    name: 'STED assessments (count)',
    source: 'GET /api/v1/reports/district → kpis.stedAssessments',
    definition: 'Count of STED assessments with assessmentDate in range. Not coverage or scores.',
    scope: 'national',
    period: 'selected from/to',
    freshness: 'period-based',
    availability: 'supported',
  },
  {
    id: 'enrollmentTrend',
    name: 'Enrollment trend',
    source: 'GET /api/v1/reports/enrollment → trend',
    definition: 'Daily new-registration series',
    scope: 'national',
    period: 'selected from/to',
    freshness: 'unavailable',
    availability: 'unavailable',
    unavailableReason:
      'Trend uses findMany take:10000 then in-memory grouping — incomplete at national scale.',
  },
  {
    id: 'attendanceTrend',
    name: 'Attendance trend',
    source: 'GET /api/v1/monitoring/attendance',
    definition: 'Daily attendance series',
    scope: 'national',
    period: 'selected from/to',
    freshness: 'unavailable',
    availability: 'unavailable',
    unavailableReason:
      'Monitoring attendance summary is aggregated, but the endpoint also materializes all centers for items (~39k) — unsafe as national default.',
  },
  {
    id: 'stedCoverage',
    name: 'STED coverage / scores',
    source: 'GET /api/v1/monitoring/sted',
    definition: 'STED coverage and score distributions',
    scope: 'national',
    period: 'selected from/to',
    freshness: 'unavailable',
    availability: 'unavailable',
    unavailableReason:
      'Unbounded stedAssessment.findMany at national scope — UNSAFE AT NATIONAL SCALE.',
  },
  {
    id: 'compliance',
    name: 'Compliance KPIs',
    source: 'GET /api/v1/compliance/assessments',
    definition: 'Centers assessed / compliance rate',
    scope: 'national',
    period: 'n/a',
    freshness: 'unavailable',
    availability: 'unavailable',
    unavailableReason: 'Paginated operational list only — no national aggregate KPI contract.',
  },
  {
    id: 'wash',
    name: 'WASH KPIs',
    source: 'GET /api/v1/wash',
    definition: 'WASH coverage / deficiencies',
    scope: 'national',
    period: 'n/a',
    freshness: 'unavailable',
    availability: 'unavailable',
    unavailableReason: 'Paginated operational list only — no national aggregate KPI contract.',
  },
  {
    id: 'alerts',
    name: 'National alerts / follow-up',
    source: 'GET /api/v1/alerts/follow-up',
    definition: 'Follow-up workload counts',
    scope: 'national',
    period: 'fixed windows',
    freshness: 'unavailable',
    availability: 'unavailable',
    unavailableReason:
      'Soft-capped scans (e.g. take 500–2000) — counts are not authoritative nationally.',
  },
]

export const NCDA_UNSUPPORTED_METRICS = NCDA_DASHBOARD_METRICS.filter(
  (m) => m.availability === 'unavailable',
)
