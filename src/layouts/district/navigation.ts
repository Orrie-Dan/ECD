import {
  LayoutDashboard,
  Building2,
  Baby,
  Activity,
  AlertTriangle,
  FileText,
  UserCog,
  Settings,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'
import { district } from '@/locales/rw/district'

export type DistrictSectionId =
  | 'dashboard'
  | 'centers'
  | 'children'
  | 'monitoring'
  | 'followup'
  | 'reports'
  | 'book'
  | 'caregivers'
  | 'settings'
  | 'gis'

export interface DistrictNavItem {
  id: DistrictSectionId
  path: string
  label: string
  icon: LucideIcon
  matchPaths?: string[]
}

export interface DistrictNavGroup {
  id: string
  label: string
  items: DistrictNavItem[]
}

/** Canonical District route paths. */
export const DISTRICT_PATHS = {
  root: '/district',
  dashboard: '/district',
  centers: '/district/ibigo',
  children: '/district/abana',
  demographics: '/district/demografi',
  monitoring: '/district/imikorere',
  monitoringAttendance: '/district/imikorere/ubwitabire',
  monitoringGrowth: '/district/imikorere/imikurire',
  monitoringFeeding: '/district/imikorere/imirire',
  monitoringSted: '/district/imikorere/sted',
  followup: '/district/gukurikirana',
  reports: '/district/raporo',
  book: '/district/igitabo',
  caregivers: '/district/abakoresha',
  settings: '/district/igenamiterere',
  /** District GIS map page (`?centerId=` focuses a center). */
  gis: '/district/ikarita',
} as const

export const DISTRICT_LEGACY_REDIRECTS = {
  attendance: '/district/attendance',
  growth: '/district/imikurire',
  feeding: '/district/imirire',
  sted: '/district/sted',
  referrals: '/district/referrals',
  gis: '/district/ikarita',
  followupLegacy: '/district/ibikurikiranywa',
  monitoringEn: '/district/monitoring',
  followupEn: '/district/follow-up',
} as const

export const DISTRICT_NAV_GROUPS: DistrictNavGroup[] = [
  {
    id: 'command',
    label: district.groups.command,
    items: [
      {
        id: 'dashboard',
        path: DISTRICT_PATHS.dashboard,
        label: district.nav.dashboard,
        icon: LayoutDashboard,
        matchPaths: [DISTRICT_PATHS.dashboard],
      },
      {
        id: 'centers',
        path: DISTRICT_PATHS.centers,
        label: district.nav.centers,
        icon: Building2,
        matchPaths: [DISTRICT_PATHS.centers],
      },
      {
        id: 'children',
        path: DISTRICT_PATHS.children,
        label: district.nav.children,
        icon: Baby,
        matchPaths: [DISTRICT_PATHS.children],
      },
      {
        id: 'monitoring',
        path: DISTRICT_PATHS.monitoring,
        label: district.nav.monitoring,
        icon: Activity,
        matchPaths: [DISTRICT_PATHS.monitoring],
      },
      {
        id: 'followup',
        path: DISTRICT_PATHS.followup,
        label: district.nav.followup,
        icon: AlertTriangle,
        matchPaths: [DISTRICT_PATHS.followup],
      },
      {
        id: 'reports',
        path: DISTRICT_PATHS.reports,
        label: district.nav.reports,
        icon: FileText,
        matchPaths: [DISTRICT_PATHS.reports],
      },
      {
        id: 'book',
        path: DISTRICT_PATHS.book,
        label: district.registers.nav,
        icon: BookOpen,
        matchPaths: [DISTRICT_PATHS.book],
      },
    ],
  },
  {
    id: 'administration',
    label: district.groups.administration,
    items: [
      {
        id: 'caregivers',
        path: DISTRICT_PATHS.caregivers,
        label: district.nav.caregivers,
        icon: UserCog,
        matchPaths: [DISTRICT_PATHS.caregivers],
      },
      {
        id: 'settings',
        path: DISTRICT_PATHS.settings,
        label: district.nav.settings,
        icon: Settings,
        matchPaths: [DISTRICT_PATHS.settings],
      },
    ],
  },
]

export const DISTRICT_NAV_ITEMS: DistrictNavItem[] = DISTRICT_NAV_GROUPS.flatMap((g) => g.items)

export const DISTRICT_MOBILE_NAV: DistrictNavItem[] = [
  DISTRICT_NAV_ITEMS.find((item) => item.id === 'dashboard')!,
  DISTRICT_NAV_ITEMS.find((item) => item.id === 'centers')!,
  DISTRICT_NAV_ITEMS.find((item) => item.id === 'children')!,
  DISTRICT_NAV_ITEMS.find((item) => item.id === 'followup')!,
  DISTRICT_NAV_ITEMS.find((item) => item.id === 'monitoring')!,
]

export const DISTRICT_MONITORING_TABS = [
  { path: DISTRICT_PATHS.monitoring, label: district.monitoringHub.overview, end: true },
  { path: DISTRICT_PATHS.monitoringAttendance, label: district.nav.attendance },
  { path: DISTRICT_PATHS.monitoringGrowth, label: district.nav.growth },
  { path: DISTRICT_PATHS.monitoringFeeding, label: district.nav.imirire },
  { path: DISTRICT_PATHS.monitoringSted, label: district.nav.sted },
] as const

export function findDistrictNavItem(pathname: string): DistrictNavItem | undefined {
  const ranked = [...DISTRICT_NAV_ITEMS].sort((a, b) => b.path.length - a.path.length)
  return ranked.find((item) => {
    if (item.id === 'dashboard') {
      return pathname === DISTRICT_PATHS.dashboard
    }
    if (item.matchPaths?.length) {
      return item.matchPaths.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`),
      )
    }
    return pathname === item.path || pathname.startsWith(`${item.path}/`)
  })
}

export function getDistrictPageTitle(pathname: string): string {
  return findDistrictNavItem(pathname)?.label ?? district.nav.dashboard
}

export function isDistrictOverviewPath(pathname: string): boolean {
  return pathname === DISTRICT_PATHS.dashboard
}

export function isDistrictMonitoringPath(pathname: string): boolean {
  return (
    pathname === DISTRICT_PATHS.monitoring ||
    pathname.startsWith(`${DISTRICT_PATHS.monitoring}/`)
  )
}

export function isDistrictFollowupPath(pathname: string): boolean {
  return (
    pathname === DISTRICT_PATHS.followup ||
    pathname.startsWith(`${DISTRICT_PATHS.followup}/`)
  )
}
