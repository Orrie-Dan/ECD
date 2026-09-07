import {
  LayoutDashboard,
  Activity,
  ClipboardCheck,
  Users,
  Shield,
  Settings,
  ScrollText,
  MapPinned,
  Building2,
  Baby,
  Droplets,
  Smartphone,
  RefreshCw,
  BookOpen,
  Bell,
  type LucideIcon,
} from 'lucide-react'
import { ncda } from '@/locales/rw/ncda'

export type NcdaSectionId =
  | 'dashboard'
  | 'monitoring'
  | 'inspections'
  | 'follow-up'
  | 'reports'
  | 'users'
  | 'roles'
  | 'settings'
  | 'audit-logs'
  | 'districts'
  | 'centers'
  | 'children'
  | 'compliance'
  | 'wash'
  | 'devices'
  | 'sync'
  | 'book'

export interface NcdaNavItem {
  id: NcdaSectionId
  path: string
  label: string
  icon: LucideIcon
  /** Paths that count as active for this item (prefix-aware via SidebarNavLink). */
  matchPaths?: string[]
}

export interface NcdaNavGroup {
  id: string
  label: string
  items: NcdaNavItem[]
}

/** Canonical NCDA route paths. */
export const NCDA_PATHS = {
  root: '/ncda',
  dashboard: '/ncda/dashboard',
  overview: '/ncda/overview',
  monitoring: '/ncda/gukurikirana',
  monitoringAttendance: '/ncda/gukurikirana/ubwitabire',
  monitoringGrowth: '/ncda/gukurikirana/imikurire',
  monitoringFeeding: '/ncda/gukurikirana/imirire',
  monitoringSted: '/ncda/gukurikirana/sted',
  followUp: '/ncda/gukurikirana/impugukirwa',
  /** @deprecated Prefer followUp with ?category=nutrition */
  monitoringNutrition: '/ncda/gukurikirana/impugukirwa',
  inspections: '/ncda/inspections',
  reports: '/ncda/reports',
  users: '/ncda/users',
  roles: '/ncda/roles',
  settings: '/ncda/settings',
  auditLogs: '/ncda/audit-logs',
  districts: '/ncda/districts',
  centers: '/ncda/centers',
  children: '/ncda/children',
  demographics: '/ncda/demographics',
  compliance: '/ncda/compliance',
  wash: '/ncda/wash',
  devices: '/ncda/devices',
  sync: '/ncda/sync',
  book: '/ncda/igitabo',
} as const

/** Legacy English/flat paths kept for redirects. */
export const NCDA_LEGACY_REDIRECTS = {
  monitoring: '/ncda/monitoring',
  monitoringNutrition: '/ncda/monitoring/nutrition',
  followUp: '/ncda/impugukirwa',
} as const

const overviewItem: NcdaNavItem = {
  id: 'dashboard',
  path: NCDA_PATHS.dashboard,
  label: ncda.nav.overview,
  icon: LayoutDashboard,
  matchPaths: [NCDA_PATHS.dashboard, NCDA_PATHS.overview],
}

/**
 * Primary information architecture — GIS command centre, analytics,
 * operational follow-up, evidence, then administration.
 */
export const NCDA_NAV_GROUPS: NcdaNavGroup[] = [
  {
    id: 'command',
    label: ncda.groups.command,
    items: [
      overviewItem,
      {
        id: 'monitoring',
        path: NCDA_PATHS.monitoring,
        label: ncda.nav.monitoring,
        icon: Activity,
        matchPaths: [
          NCDA_PATHS.monitoring,
          NCDA_PATHS.monitoringAttendance,
          NCDA_PATHS.monitoringGrowth,
          NCDA_PATHS.monitoringFeeding,
          NCDA_PATHS.monitoringSted,
        ],
      },
      {
        id: 'inspections',
        path: NCDA_PATHS.inspections,
        label: ncda.nav.inspections,
        icon: ClipboardCheck,
        matchPaths: [NCDA_PATHS.inspections, NCDA_PATHS.compliance],
      },
      {
        id: 'follow-up',
        path: NCDA_PATHS.followUp,
        label: ncda.nav.followUp,
        icon: Bell,
        matchPaths: [NCDA_PATHS.followUp],
      },
      {
        id: 'children',
        path: NCDA_PATHS.children,
        label: ncda.nav.children,
        icon: Baby,
        matchPaths: [NCDA_PATHS.children],
      },
    ],
  },
  {
    id: 'administration',
    label: ncda.groups.administration,
    items: [
      {
        id: 'users',
        path: NCDA_PATHS.users,
        label: ncda.nav.users,
        icon: Users,
        matchPaths: [NCDA_PATHS.users],
      },
      {
        id: 'roles',
        path: NCDA_PATHS.roles,
        label: ncda.nav.roles,
        icon: Shield,
      },
      {
        id: 'settings',
        path: NCDA_PATHS.settings,
        label: ncda.nav.settings,
        icon: Settings,
        matchPaths: [NCDA_PATHS.settings, NCDA_PATHS.devices, NCDA_PATHS.sync],
      },
      {
        id: 'audit-logs',
        path: NCDA_PATHS.auditLogs,
        label: ncda.nav.auditLogs,
        icon: ScrollText,
        matchPaths: [NCDA_PATHS.auditLogs],
      },
    ],
  },
]

/**
 * Deep-linkable geographic / operational surfaces that are no longer
 * primary destinations. Kept for titles, redirects, and contract tests.
 */
export const NCDA_CONTEXTUAL_ITEMS: NcdaNavItem[] = [
  {
    id: 'districts',
    path: NCDA_PATHS.districts,
    label: ncda.nav.districts,
    icon: MapPinned,
    matchPaths: [NCDA_PATHS.districts],
  },
  {
    id: 'centers',
    path: NCDA_PATHS.centers,
    label: ncda.nav.centers,
    icon: Building2,
    matchPaths: [NCDA_PATHS.centers],
  },
  {
    id: 'book',
    path: NCDA_PATHS.book,
    label: ncda.registers.nav,
    icon: BookOpen,
    matchPaths: [NCDA_PATHS.book],
  },
  {
    id: 'compliance',
    path: NCDA_PATHS.compliance,
    label: ncda.nav.inspections,
    icon: ClipboardCheck,
    matchPaths: [NCDA_PATHS.compliance],
  },
  {
    id: 'wash',
    path: NCDA_PATHS.wash,
    label: ncda.nav.wash,
    icon: Droplets,
    matchPaths: [NCDA_PATHS.wash],
  },
  {
    id: 'devices',
    path: NCDA_PATHS.devices,
    label: ncda.nav.devices,
    icon: Smartphone,
    matchPaths: [NCDA_PATHS.devices],
  },
  {
    id: 'sync',
    path: NCDA_PATHS.sync,
    label: ncda.nav.sync,
    icon: RefreshCw,
    matchPaths: [NCDA_PATHS.sync],
  },
]

export const NCDA_NAV_ITEMS: NcdaNavItem[] = NCDA_NAV_GROUPS.flatMap((g) => g.items)

export const NCDA_MONITORING_TABS = [
  { path: NCDA_PATHS.monitoring, label: ncda.monitoringHub.overview, end: true },
  { path: NCDA_PATHS.monitoringAttendance, label: ncda.monitoringHub.attendance },
  { path: NCDA_PATHS.monitoringGrowth, label: ncda.monitoringHub.growth },
  { path: NCDA_PATHS.monitoringFeeding, label: ncda.monitoringHub.feeding },
  { path: NCDA_PATHS.monitoringSted, label: ncda.monitoringHub.sted },
] as const

const NCDA_RESOLVE_ITEMS: NcdaNavItem[] = [...NCDA_NAV_ITEMS, ...NCDA_CONTEXTUAL_ITEMS]

export function findNcdaNavItem(pathname: string): NcdaNavItem | undefined {
  if (pathname === NCDA_PATHS.root) {
    return NCDA_NAV_ITEMS.find((item) => item.id === 'dashboard')
  }
  const ranked = [...NCDA_RESOLVE_ITEMS].sort((a, b) => b.path.length - a.path.length)
  return ranked.find((item) => {
    if (item.id === 'monitoring') {
      return isNcdaMonitoringPath(pathname)
    }
    if (item.matchPaths?.length) {
      return item.matchPaths.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`),
      )
    }
    return pathname === item.path || pathname.startsWith(`${item.path}/`)
  })
}

export function getNcdaPageTitle(pathname: string): string {
  return findNcdaNavItem(pathname)?.label ?? ncda.brand
}

export function isNcdaOverviewPath(pathname: string): boolean {
  return (
    pathname === NCDA_PATHS.dashboard ||
    pathname === NCDA_PATHS.overview ||
    pathname === NCDA_PATHS.root
  )
}

export function isNcdaMonitoringPath(pathname: string): boolean {
  if (pathname === NCDA_PATHS.followUp || pathname.startsWith(`${NCDA_PATHS.followUp}/`)) {
    return false
  }
  return (
    pathname === NCDA_PATHS.monitoring ||
    pathname.startsWith(`${NCDA_PATHS.monitoring}/`)
  )
}

export function isNcdaFollowupPath(pathname: string): boolean {
  return (
    pathname === NCDA_PATHS.followUp ||
    pathname.startsWith(`${NCDA_PATHS.followUp}/`)
  )
}
