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
    transferHistory: (id: string, filters: { page?: number; pageSize?: number } = {}) =>
      [...all, 'transfer-history', id, filters] as const,
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

/**
 * NCDA Admin React Query namespace (Sprint 5.5A/5.5C/5.5D convention).
 * Canonical root: `ncda` — do not introduce a parallel `national.*` tree.
 */
function createNcdaKeys() {
  const all = ['ncda'] as const
  const dashboard = [...all, 'dashboard'] as const
  const districts = [...all, 'districts'] as const
  const centers = [...all, 'centers'] as const
  const children = [...all, 'children'] as const
  const users = [...all, 'users'] as const
  const auditLogs = [...all, 'audit-logs'] as const
  const compliance = [...all, 'compliance'] as const
  const wash = [...all, 'wash'] as const
  const monitoring = [...all, 'monitoring'] as const
  const reporting = [...all, 'reporting'] as const
  return {
    all,
    dashboard: {
      all: dashboard,
      overview: (filters: Record<string, unknown> = {}) =>
        [...dashboard, 'overview', filters] as const,
      kpis: (filters: Record<string, unknown> = {}) =>
        [...dashboard, 'kpis', filters] as const,
      network: (filters: Record<string, unknown> = {}) =>
        [...dashboard, 'network', filters] as const,
    },
    districts: {
      all: districts,
      list: (filters: Record<string, unknown> = {}) =>
        [...districts, 'list', filters] as const,
      detail: (id: string) => [...districts, 'detail', id] as const,
      summary: (id: string, filters: Record<string, unknown> = {}) =>
        [...districts, 'summary', id, filters] as const,
      centers: (id: string, filters: Record<string, unknown> = {}) =>
        [...districts, 'centers', id, filters] as const,
      network: (filters: Record<string, unknown> = {}) =>
        [...districts, 'network', filters] as const,
      adminUnits: (filters: Record<string, unknown> = {}) =>
        [...districts, 'admin-units', filters] as const,
    },
    centers: {
      all: centers,
      list: (filters: Record<string, unknown> = {}) =>
        [...centers, 'list', filters] as const,
      detail: (id: string) => [...centers, 'detail', id] as const,
      summary: (id: string, filters: Record<string, unknown> = {}) =>
        [...centers, 'summary', id, filters] as const,
      children: (id: string, filters: Record<string, unknown> = {}) =>
        [...centers, 'children', id, filters] as const,
      attendance: (id: string, filters: Record<string, unknown> = {}) =>
        [...centers, 'attendance', id, filters] as const,
      nutrition: (id: string, filters: Record<string, unknown> = {}) =>
        [...centers, 'nutrition', id, filters] as const,
      feeding: (id: string, filters: Record<string, unknown> = {}) =>
        [...centers, 'feeding', id, filters] as const,
      referrals: (id: string, filters: Record<string, unknown> = {}) =>
        [...centers, 'referrals', id, filters] as const,
      network: (filters: Record<string, unknown> = {}) =>
        [...centers, 'network', filters] as const,
    },
    children: {
      all: children,
      list: (filters: Record<string, unknown> = {}) =>
        [...children, 'list', filters] as const,
      detail: (id: string) => [...children, 'detail', id] as const,
      attendance: (id: string, filters: Record<string, unknown> = {}) =>
        [...children, 'attendance', id, filters] as const,
      nutrition: (id: string, filters: Record<string, unknown> = {}) =>
        [...children, 'nutrition', id, filters] as const,
      sted: (id: string, filters: Record<string, unknown> = {}) =>
        [...children, 'sted', id, filters] as const,
      referrals: (id: string, filters: Record<string, unknown> = {}) =>
        [...children, 'referrals', id, filters] as const,
      network: (filters: Record<string, unknown> = {}) =>
        [...children, 'network', filters] as const,
    },
    users: {
      all: users,
      list: (filters: Record<string, unknown> = {}) =>
        [...users, 'list', filters] as const,
      detail: (id: string) => [...users, 'detail', id] as const,
      network: (filters: Record<string, unknown> = {}) =>
        [...users, 'network', filters] as const,
    },
    auditLogs: {
      all: auditLogs,
      list: (filters: Record<string, unknown> = {}) =>
        [...auditLogs, 'list', filters] as const,
    },
    compliance: {
      all: compliance,
      list: (filters: Record<string, unknown> = {}) =>
        [...compliance, 'list', filters] as const,
      detail: (id: string) => [...compliance, 'detail', id] as const,
      standards: () => [...compliance, 'standards'] as const,
    },
    wash: {
      all: wash,
      list: (filters: Record<string, unknown> = {}) =>
        [...wash, 'list', filters] as const,
      detail: (id: string) => [...wash, 'detail', id] as const,
    },
    monitoring: {
      all: monitoring,
      overview: (filters: Record<string, unknown> = {}) =>
        [...monitoring, 'overview', filters] as const,
      kpis: (filters: Record<string, unknown> = {}) =>
        [...monitoring, 'kpis', filters] as const,
      sted: (filters: Record<string, unknown> = {}) =>
        [...monitoring, 'sted', filters] as const,
      compliance: (filters: Record<string, unknown> = {}) =>
        [...monitoring, 'compliance', filters] as const,
      wash: (filters: Record<string, unknown> = {}) =>
        [...monitoring, 'wash', filters] as const,
    },
    reporting: {
      all: reporting,
      district: (filters: Record<string, unknown> = {}) =>
        [...reporting, 'district', filters] as const,
      enrollment: (filters: Record<string, unknown> = {}) =>
        [...reporting, 'enrollment', filters] as const,
      dropouts: (filters: Record<string, unknown> = {}) =>
        [...reporting, 'dropouts', filters] as const,
      centers: (filters: Record<string, unknown> = {}) =>
        [...reporting, 'centers', filters] as const,
    },
  }
}

/**
 * District portal query namespace — online admin/monitoring reads.
 * Prefer these for District pages; do not collide with caregiver LocalStore keys.
 */
function createDistrictKeys() {
  const all = ['district'] as const
  return {
    all,
    children: (...parts: unknown[]) => [...all, 'children', ...parts] as const,
    child: (id: string) => [...all, 'child', id] as const,
    attendance: {
      all: [...all, 'attendance'] as const,
      list: (filters: AttendanceListFilters = {}) =>
        [...all, 'attendance', 'list', filters] as const,
      centerDay: (centerId: string, date: string, page = 1) =>
        [...all, 'attendance', 'center-day', centerId, date, page] as const,
    },
    growth: (...parts: unknown[]) => [...all, 'growth', ...parts] as const,
    nutrition: {
      all: [...all, 'nutrition'] as const,
      alerts: (filters: NutritionAlertFilters = {}) =>
        [...all, 'nutrition', 'alerts', filters] as const,
      screenings: (filters: Record<string, unknown> = {}) =>
        [...all, 'nutrition', 'screenings', filters] as const,
    },
    dashboard: (...parts: unknown[]) => [...all, 'dashboard', ...parts] as const,
    monitoring: (...parts: unknown[]) => [...all, 'monitoring', ...parts] as const,
    reporting: (...parts: unknown[]) => [...all, 'reporting', ...parts] as const,
    referrals: {
      all: [...all, 'referrals'] as const,
      list: (filters: ReferralListFilters = {}) =>
        [...all, 'referrals', 'list', filters] as const,
    },
    alerts: (filters: Record<string, unknown> = {}) => [...all, 'alerts', filters] as const,
    overview: {
      identity: (id: string) => [...all, 'overview', 'identity', id] as const,
      adminUnits: (filters: Record<string, unknown> = {}) =>
        [...all, 'overview', 'admin-units', filters] as const,
      centers: (filters: Record<string, unknown> = {}) =>
        [...all, 'overview', 'centers', filters] as const,
    },
    centers: (...parts: unknown[]) => [...all, 'centers', ...parts] as const,
    settings: (...parts: unknown[]) => [...all, 'settings', ...parts] as const,
    users: {
      all: [...all, 'users'] as const,
      list: (filters: Record<string, unknown> = {}) =>
        [...all, 'users', 'list', filters] as const,
      detail: (id: string) => [...all, 'users', 'detail', id] as const,
      centerOptions: (filters: Record<string, unknown> = {}) =>
        [...all, 'users', 'center-options', filters] as const,
    },
  }
}

function createNotificationKeys() {
  const all = ['notifications'] as const
  const lists = () => [...all, 'list'] as const
  return {
    all,
    lists,
    list: (filters: Record<string, unknown> = {}) => [...lists(), filters] as const,
    unreadCount: () => [...all, 'unread-count'] as const,
  }
}

function createClassroomKeys() {
  const all = ['classrooms'] as const
  const lists = () => [...all, 'list'] as const
  return {
    all,
    lists,
    byCenter: (centerId: string) => [...lists(), centerId] as const,
    detail: (id: string) => [...all, 'detail', id] as const,
  }
}

function createTransfersKeys() {
  const all = ['transfers'] as const
  return {
    all,
    history: (
      centerId: string,
      filters: {
        page?: number
        pageSize?: number
        status?: string
        direction?: string
      } = {},
    ) => [...all, 'center-history', centerId, filters] as const,
  }
}

/**
 * ECD director caregiver-governance queries — center-scoped user admin.
 */
function createEcdCenterKeys() {
  const all = ['ecd-center'] as const
  return {
    all,
    users: {
      all: [...all, 'users'] as const,
      list: (filters: Record<string, unknown> = {}) =>
        [...all, 'users', 'list', filters] as const,
      detail: (id: string) => [...all, 'users', 'detail', id] as const,
    },
  }
}

/** Section VIII — parent contributions (center register). */
function createContributionsKeys() {
  const all = ['contributions'] as const
  return {
    all,
    list: (filters: Record<string, unknown> = {}) =>
      [...all, 'list', filters] as const,
    summary: (filters: Record<string, unknown> = {}) =>
      [...all, 'summary', filters] as const,
    detail: (id: string) => [...all, 'detail', id] as const,
  }
}

/** Section IX — parenting sessions (center register). */
function createParentingSessionsKeys() {
  const all = ['parentingSessions'] as const
  return {
    all,
    list: (filters: Record<string, unknown> = {}) =>
      [...all, 'list', filters] as const,
    summary: (filters: Record<string, unknown> = {}) =>
      [...all, 'summary', filters] as const,
    detail: (id: string) => [...all, 'detail', id] as const,
  }
}

/** Section X — ECD committee members (center register). */
function createCommitteeMembersKeys() {
  const all = ['committeeMembers'] as const
  return {
    all,
    list: (filters: Record<string, unknown> = {}) =>
      [...all, 'list', filters] as const,
    detail: (id: string) => [...all, 'detail', id] as const,
  }
}

/** Section XII — centre support received (center register). */
function createCenterSupportKeys() {
  const all = ['centerSupport'] as const
  return {
    all,
    list: (filters: Record<string, unknown> = {}) =>
      [...all, 'list', filters] as const,
    detail: (id: string) => [...all, 'detail', id] as const,
  }
}

/** Section XIII — centre visitor log (center register). */
function createCenterVisitsKeys() {
  const all = ['centerVisits'] as const
  return {
    all,
    list: (filters: Record<string, unknown> = {}) =>
      [...all, 'list', filters] as const,
    detail: (id: string) => [...all, 'detail', id] as const,
  }
}

/** Section XIV — staff trainings (center register). */
function createStaffTrainingsKeys() {
  const all = ['staffTrainings'] as const
  return {
    all,
    list: (filters: Record<string, unknown> = {}) =>
      [...all, 'list', filters] as const,
    detail: (id: string) => [...all, 'detail', id] as const,
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
  district: createDistrictKeys(),
  ncda: createNcdaKeys(),
  ecdCenter: createEcdCenterKeys(),
  contributions: createContributionsKeys(),
  parentingSessions: createParentingSessionsKeys(),
  committeeMembers: createCommitteeMembersKeys(),
  centerSupport: createCenterSupportKeys(),
  centerVisits: createCenterVisitsKeys(),
  staffTrainings: createStaffTrainingsKeys(),
  classrooms: createClassroomKeys(),
  notifications: createNotificationKeys(),
  transfers: createTransfersKeys(),
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
export const district = { keys: queryKeys.district }
export const ncda = { keys: queryKeys.ncda }
export const ecdCenter = { keys: queryKeys.ecdCenter }
export const contributions = { keys: queryKeys.contributions }
export const parentingSessions = { keys: queryKeys.parentingSessions }
export const committeeMembers = { keys: queryKeys.committeeMembers }
export const centerSupport = { keys: queryKeys.centerSupport }
export const centerVisits = { keys: queryKeys.centerVisits }
export const staffTrainings = { keys: queryKeys.staffTrainings }
export const classrooms = { keys: queryKeys.classrooms }

export const notifications = { keys: queryKeys.notifications }

export const transfers = { keys: queryKeys.transfers }

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

/**
 * LocalStore-backed caregiver queries must fetch while the browser is offline.
 * React Query defaults to networkMode: 'online', which pauses refetch after a
 * local write — so the UI would hide what the caretaker just saved until reconnect.
 */
export const localFirstQueryOptions = {
  networkMode: 'always' as const,
}

export const queryStaleTimes = {
  authMe: 60_000,
  childrenList: 30_000,
  childrenDetail: 30_000,
  childrenTransferHistory: 30_000,
  centerTransferHistory: 30_000,
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
  /** National aggregates change slowly; 2m balances freshness vs load on ~39k centers. */
  ncdaDashboard: 120_000,
  /** District directory pages — short stale window; pagination params already key the cache. */
  ncdaDistricts: 60_000,
  /** Center directory pages — same cadence as districts; keys include page/filters. */
  ncdaCenters: 60_000,
  /** Child directory pages — pagination params already key the cache. */
  ncdaChildren: 60_000,
  /** User admin directory — short stale; mutations invalidate list/detail. */
  ncdaUsers: 30_000,
  /** Audit evidence — short stale; never mutate client-side. */
  ncdaAuditLogs: 30_000,
  /** Compliance / WASH operational browse — paginated; keys include filters. */
  ncdaCompliance: 30_000,
  ncdaWash: 30_000,
  /** National monitoring aggregates (same cadence as dashboard). */
  ncdaMonitoring: 120_000,
  /** Report JSON summaries — period-scoped. */
  ncdaReporting: 60_000,
  /** District caregiver admin — short stale; mutations invalidate list/detail. */
  districtUsers: 30_000,
  /** ECD director caregiver admin — short stale; mutations invalidate list/detail. */
  ecdCenterUsers: 30_000,
  /** Parent contributions list/summary — short stale; mutations invalidate. */
  contributions: 30_000,
  /** Parenting sessions list/summary — short stale; mutations invalidate. */
  parentingSessions: 30_000,
  /** Committee members list — short stale; mutations invalidate. */
  committeeMembers: 30_000,
  /** Centre support list — short stale; mutations invalidate. */
  centerSupport: 30_000,
  /** Centre visitor log — short stale; mutations invalidate. */
  centerVisits: 30_000,
  /** Staff trainings list — short stale; mutations invalidate. */
  staffTrainings: 30_000,
  /** Classrooms per center — rarely changes; 2m stale window. */
  classrooms: 120_000,
  /** Notifications list — short stale; mutations invalidate. */
  notifications: 15_000,
  /** Unread count badge — polled every 30s; very short stale. */
  notificationsUnread: 10_000,
  /** District Incamake geo identity / sectors / centres. */
  districtOverview: 60_000,
} as const
