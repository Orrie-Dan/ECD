import type { AttendanceListFilters } from '@/models/attendance'
import type { ChildrenListFilters } from '@/models/child'
import type {
  FeedingDayListFilters,
  FeedingMonthSummaryListFilters,
} from '@/models/feeding'
import type { NutritionAlertFilters } from '@/models/nutrition'
import type { ReferralListFilters } from '@/models/referral'
import type { MonitoringDateFilters, MonitoringScopeFilters } from '@/models/monitoring'
import type { ReportingScopeFilters } from '@/models/reporting'
import type { StedHistoryFilters } from '@/models/sted'

/**
 * Central React Query key factories for migrated domains.
 */

function createAuthKeys() {
  const all = ['auth'] as const
  return {
    all,
    me: () => [...all, 'me'] as const,
  }
}

function createChildrenKeys() {
  const all = ['children'] as const
  const lists = () => [...all, 'list'] as const
  const details = () => [...all, 'detail'] as const
  return {
    all,
    lists,
    list: (filters: ChildrenListFilters = {}) => [...lists(), filters] as const,
    details,
    detail: (id: string) => [...details(), id] as const,
  }
}

export function createDomainKeys<TRoot extends string>(root: TRoot) {
  const all = [root] as const
  const lists = () => [...all, 'list'] as const
  const details = () => [...all, 'detail'] as const
  return {
    all,
    lists,
    list: <TFilters>(filters: TFilters) => [...lists(), filters] as const,
    details,
    detail: (id: string) => [...details(), id] as const,
  }
}

function createAttendanceKeys() {
  const base = createDomainKeys('attendance')
  return {
    ...base,
    list: (filters: AttendanceListFilters = {}) => [...base.lists(), filters] as const,
    window: (filters: Omit<AttendanceListFilters, 'page' | 'pageSize'> = {}) =>
      [...base.all, 'window', filters] as const,
    child: (childId: string, filters: Omit<AttendanceListFilters, 'childId'> = {}) =>
      [...base.all, 'child', childId, filters] as const,
  }
}

function createGrowthKeys() {
  const base = createDomainKeys('growth')
  return {
    ...base,
    child: (childId: string) => [...base.all, 'child', childId] as const,
    history: (childId: string) => [...base.all, 'history', childId] as const,
    latest: (childId: string) => [...base.all, 'latest', childId] as const,
    chart: (childId: string) => [...base.all, 'chart', childId] as const,
    /** @deprecated Prefer nutrition.keys.roster — shared screening cache. */
    roster: (childIds: string[]) => [...base.all, 'roster', childIds] as const,
  }
}

function createNutritionKeys() {
  const base = createDomainKeys('nutrition')
  return {
    ...base,
    child: (childId: string) => [...base.all, 'child', childId] as const,
    history: (childId: string) => [...base.all, 'history', childId] as const,
    latest: (childId: string) => [...base.all, 'latest', childId] as const,
    /** Shared multi-child screening roster (measurements + assessments). */
    roster: (childIds: string[]) => [...base.all, 'roster', childIds] as const,
    assessments: (filters: { childIds?: string[] } = {}) =>
      [...base.all, 'assessments', filters] as const,
    alerts: (filters: NutritionAlertFilters = {}) => [...base.all, 'alerts', filters] as const,
  }
}

/**
 * Feeding / Imirire (Form VI) keys.
 * No child-level keys — feeding is center-scoped.
 * No dedicated month/summary(year,month) fetch keys — API has no date filters;
 * month views filter the center window client-side.
 */
function createFeedingKeys() {
  const base = createDomainKeys('feeding')
  return {
    ...base,
    days: (filters: FeedingDayListFilters) => [...base.all, 'days', filters] as const,
    daysWindow: (centerId: string) => [...base.all, 'days-window', centerId] as const,
    summaries: (filters: FeedingMonthSummaryListFilters) =>
      [...base.all, 'summaries', filters] as const,
    summariesWindow: (centerId: string) => [...base.all, 'summaries-window', centerId] as const,
    center: (centerId: string) => [...base.all, 'center', centerId] as const,
  }
}

/**
 * STED assessment keys.
 * No center list key — API is create + per-child history + findOne only.
 * Roster fans out histories (documented API gap workaround, same as growth).
 * No update/delete keys — backend is append-only.
 */
function createStedKeys() {
  const base = createDomainKeys('sted')
  return {
    ...base,
    detail: (id: string) => [...base.details(), id] as const,
    history: (childId: string, filters: StedHistoryFilters = {}) =>
      [...base.all, 'history', childId, filters] as const,
    historyWindow: (childId: string) => [...base.all, 'history-window', childId] as const,
    latest: (childId: string) => [...base.all, 'latest', childId] as const,
    roster: (childIds: string[]) => [...base.all, 'roster', childIds] as const,
  }
}

/**
 * Referral keys — justified by API: list, child history, status update.
 * No detail key — backend has no GET /referrals/{id}.
 * No follow-up / assign keys — not in the contract.
 */
function createReferralKeys() {
  const base = createDomainKeys('referrals')
  return {
    ...base,
    list: (filters: ReferralListFilters = {}) => [...base.lists(), filters] as const,
    /** Full paginated window for DataProvider-style lists. */
    window: (filters: Omit<ReferralListFilters, 'page' | 'pageSize'> = {}) =>
      [...base.all, 'window', filters] as const,
    child: (childId: string) => [...base.all, 'child', childId] as const,
    history: (childId: string) => [...base.all, 'history', childId] as const,
  }
}

/**
 * Monitoring read-model keys — one key per backend aggregate endpoint (+ dashboard).
 * No growth key — backend has no /monitoring/growth (use nutrition).
 */
function createMonitoringKeys() {
  const all = ['monitoring'] as const
  return {
    all,
    dashboard: (filters: MonitoringDateFilters = {}) => [...all, 'dashboard', filters] as const,
    attendance: (filters: MonitoringScopeFilters = {}) =>
      [...all, 'attendance', filters] as const,
    nutrition: (filters: MonitoringScopeFilters = {}) =>
      [...all, 'nutrition', filters] as const,
    feeding: (filters: MonitoringScopeFilters = {}) => [...all, 'feeding', filters] as const,
    sted: (filters: MonitoringScopeFilters = {}) => [...all, 'sted', filters] as const,
    referrals: (filters: MonitoringScopeFilters = {}) =>
      [...all, 'referrals', filters] as const,
  }
}

/**
 * Reporting keys — /reports/* only.
 * Attendance/nutrition report aggregates reuse monitoring.keys.*
 */
function createReportingKeys() {
  const all = ['reporting'] as const
  return {
    all,
    enrollment: (filters: ReportingScopeFilters = {}) =>
      [...all, 'enrollment', filters] as const,
    dropouts: (filters: ReportingScopeFilters = {}) => [...all, 'dropouts', filters] as const,
    centers: (filters: ReportingScopeFilters = {}) => [...all, 'centers', filters] as const,
    district: (filters: ReportingScopeFilters = {}) => [...all, 'district', filters] as const,
  }
}

function createCentersDirectoryKeys() {
  const all = ['centers-directory'] as const
  const lists = () => [...all, 'list'] as const
  const details = () => [...all, 'detail'] as const
  return {
    all,
    lists,
    list: (filters: Record<string, unknown> = {}) => [...lists(), filters] as const,
    details,
    detail: (id: string) => [...details(), id] as const,
  }
}

export const queryKeys = {
  auth: createAuthKeys(),
  children: createChildrenKeys(),
  attendance: createAttendanceKeys(),
  growth: createGrowthKeys(),
  nutrition: createNutritionKeys(),
  feeding: createFeedingKeys(),
  sted: createStedKeys(),
  referrals: createReferralKeys(),
  monitoring: createMonitoringKeys(),
  reporting: createReportingKeys(),
  centersDirectory: createCentersDirectoryKeys(),
} as const

export const auth = { keys: queryKeys.auth }
export const children = { keys: queryKeys.children }
export const attendance = { keys: queryKeys.attendance }
export const growth = { keys: queryKeys.growth }
export const nutrition = { keys: queryKeys.nutrition }
export const feeding = { keys: queryKeys.feeding }
export const sted = { keys: queryKeys.sted }
export const referrals = { keys: queryKeys.referrals }
export const monitoring = { keys: queryKeys.monitoring }
export const reporting = { keys: queryKeys.reporting }

export const authKeys = queryKeys.auth
export const childrenKeys = queryKeys.children
export const attendanceKeys = queryKeys.attendance
export const growthKeys = queryKeys.growth
export const nutritionKeys = queryKeys.nutrition
export const feedingKeys = queryKeys.feeding
export const stedKeys = queryKeys.sted
export const referralKeys = queryKeys.referrals
export const monitoringKeys = queryKeys.monitoring
export const reportingKeys = queryKeys.reporting

export const queryStaleTimes = {
  authMe: 60_000,
  childrenList: 30_000,
  childrenDetail: 30_000,
  attendanceList: 30_000,
  attendanceChild: 30_000,
  growthHistory: 30_000,
  growthLatest: 30_000,
  growthChart: 60_000,
  growthRoster: 30_000,
  nutritionHistory: 30_000,
  nutritionLatest: 30_000,
  nutritionRoster: 30_000,
  nutritionAlerts: 30_000,
  feedingDays: 30_000,
  feedingSummaries: 30_000,
  stedHistory: 30_000,
  stedLatest: 30_000,
  stedDetail: 30_000,
  stedRoster: 30_000,
  referralList: 30_000,
  referralHistory: 30_000,
  referralWindow: 30_000,
  monitoringDashboard: 60_000,
  monitoringDomain: 60_000,
  reporting: 60_000,
} as const
