import {
  LayoutDashboard,
  MapPinned,
  Building2,
  Baby,
  ClipboardCheck,
  Droplets,
  Activity,
  Users,
  ScrollText,
  FileText,
  Smartphone,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { ncda } from '@/locales/rw/ncda'

export type NcdaSectionId =
  | 'dashboard'
  | 'districts'
  | 'centers'
  | 'children'
  | 'users'
  | 'compliance'
  | 'wash'
  | 'monitoring'
  | 'reports'
  | 'audit-logs'
  | 'devices'
  | 'sync'

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

/** Canonical NCDA route paths (Sprint 5.5B shell). */
export const NCDA_PATHS = {
  root: '/ncda',
  dashboard: '/ncda/dashboard',
  districts: '/ncda/districts',
  centers: '/ncda/centers',
  children: '/ncda/children',
  users: '/ncda/users',
  compliance: '/ncda/compliance',
  wash: '/ncda/wash',
  monitoring: '/ncda/monitoring',
  reports: '/ncda/reports',
  auditLogs: '/ncda/audit-logs',
  devices: '/ncda/devices',
  sync: '/ncda/sync',
} as const

/**
 * NCDA information architecture — distinct from District operational nav.
 * Domain pages are shell placeholders only until later sprints.
 */
export const NCDA_NAV_GROUPS: NcdaNavGroup[] = [
  {
    id: 'overview',
    label: ncda.groups.overview,
    items: [
      {
        id: 'dashboard',
        path: NCDA_PATHS.dashboard,
        label: ncda.nav.dashboard,
        icon: LayoutDashboard,
        matchPaths: [NCDA_PATHS.dashboard],
      },
    ],
  },
  {
    id: 'program',
    label: ncda.groups.program,
    items: [
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
        id: 'children',
        path: NCDA_PATHS.children,
        label: ncda.nav.children,
        icon: Baby,
        matchPaths: [NCDA_PATHS.children],
      },
    ],
  },
  {
    id: 'quality',
    label: ncda.groups.quality,
    items: [
      {
        id: 'compliance',
        path: NCDA_PATHS.compliance,
        label: ncda.nav.compliance,
        icon: ClipboardCheck,
      },
      {
        id: 'wash',
        path: NCDA_PATHS.wash,
        label: ncda.nav.wash,
        icon: Droplets,
      },
      {
        id: 'monitoring',
        path: NCDA_PATHS.monitoring,
        label: ncda.nav.monitoring,
        icon: Activity,
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
        id: 'audit-logs',
        path: NCDA_PATHS.auditLogs,
        label: ncda.nav.auditLogs,
        icon: ScrollText,
        matchPaths: [NCDA_PATHS.auditLogs],
      },
    ],
  },
  {
    id: 'reporting',
    label: ncda.groups.reporting,
    items: [
      {
        id: 'reports',
        path: NCDA_PATHS.reports,
        label: ncda.nav.reports,
        icon: FileText,
      },
    ],
  },
  {
    id: 'platform',
    label: ncda.groups.platform,
    items: [
      {
        id: 'devices',
        path: NCDA_PATHS.devices,
        label: ncda.nav.devices,
        icon: Smartphone,
      },
      {
        id: 'sync',
        path: NCDA_PATHS.sync,
        label: ncda.nav.sync,
        icon: RefreshCw,
      },
    ],
  },
]

export const NCDA_NAV_ITEMS: NcdaNavItem[] = NCDA_NAV_GROUPS.flatMap((g) => g.items)

export function findNcdaNavItem(pathname: string): NcdaNavItem | undefined {
  if (pathname === NCDA_PATHS.root) {
    return NCDA_NAV_ITEMS.find((item) => item.id === 'dashboard')
  }
  // Prefer the longest matching path so /ncda does not steal /ncda/users.
  const ranked = [...NCDA_NAV_ITEMS].sort((a, b) => b.path.length - a.path.length)
  return ranked.find((item) => {
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
