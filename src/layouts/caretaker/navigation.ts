import {
  Home,
  Users,
  ClipboardCheck,
  Ruler,
  LayoutGrid,
  Building2,
  Settings2,
  BookOpen,
  ArrowLeftRight,
  HandCoins,
  MessagesSquare,
  UsersRound,
  UserCog,
  HeartHandshake,
  DoorOpen,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react'
import { caretaker } from '@/locales/rw/caretaker'

export type CaretakerSectionId =
  | 'home'
  | 'children'
  | 'attendance'
  | 'growth'
  | 'imirire'
  | 'sted'
  | 'more'
  | 'ikigo'
  | 'management'
  | 'users'
  | 'selfEval'
  | 'transfers'
  | 'book'
  | 'bookParentContributions'
  | 'bookEnvironmentTalks'
  | 'bookCommittee'
  | 'bookStaff'
  | 'bookSupport'
  | 'bookVisitors'
  | 'bookTraining'

export interface CaretakerNavItem {
  id: CaretakerSectionId
  path: string
  label: string
  icon: LucideIcon
  matchPaths?: string[]
  /** Match this path only — do not treat child routes as active. */
  exact?: boolean
  /** Nested destinations shown only while this item’s section is open. */
  children?: CaretakerNavItem[]
  /** Hidden from caregivers — requires ecdDirector. */
  directorOnly?: boolean
}

export interface CaretakerNavGroup {
  id: string
  label: string
  /** Hidden from caregivers — requires ecdDirector. */
  directorOnly?: boolean
  items: CaretakerNavItem[]
}

/** Canonical caretaker route paths. */
export const CARETAKER_PATHS = {
  root: '/caretaker',
  home: '/caretaker',
  register: '/caretaker/kwiyandikisha',
  attendance: '/caretaker/ubwitabire',
  growth: '/caretaker/imikurire',
  growthMonthly: '/caretaker/imikurire/ukwezi',
  imirire: '/caretaker/imirire',
  imirireReport: '/caretaker/imirire/raporo',
  sted: '/caretaker/sted',
  stedNew: '/caretaker/sted/new',
  stedHistory: '/caretaker/sted/amateka',
  children: '/caretaker/abana',
  reports: '/caretaker/raporo',
  notifications: '/caretaker/amatangazo',
  alerts: '/caretaker/impugukirwa',
  more: '/caretaker/ibindi',
  settings: '/caretaker/igenamiterere',
  transfers: '/caretaker/kwimura',
  selfEval: '/caretaker/isuzuma',
  selfEvalNew: '/caretaker/isuzuma/new',
  users: '/caretaker/abakoresha',
  /** Director shell — center overview. */
  ikigo: '/caretaker/ikigo',
  /** Director shell — center management hub. */
  management: '/caretaker/imicungire',
  /** Director shell — ECD book hub (Sections VIII–XIV). */
  book: '/caretaker/igitabo',
  bookParentContributions: '/caretaker/igitabo/umusanzu',
  bookEnvironmentTalks: '/caretaker/igitabo/ibiganiro',
  bookCommittee: '/caretaker/igitabo/komite',
  bookStaff: '/caretaker/igitabo/abarezi',
  bookSupport: '/caretaker/igitabo/ubufasha',
  bookVisitors: '/caretaker/igitabo/abashyitsi',
  bookTraining: '/caretaker/igitabo/amahugurwa',
} as const

export type BookSectionId =
  | 'parentContributions'
  | 'environmentTalks'
  | 'committee'
  | 'staff'
  | 'support'
  | 'visitors'
  | 'training'

export interface BookSectionDefinition {
  id: BookSectionId
  sectionId: CaretakerSectionId
  path: string
  paperSection: string
  label: string
  description: string
  icon: LucideIcon
}

export const BOOK_SECTIONS: BookSectionDefinition[] = [
  {
    id: 'parentContributions',
    sectionId: 'bookParentContributions',
    path: CARETAKER_PATHS.bookParentContributions,
    paperSection: 'VIII',
    label: caretaker.director.book.sections.parentContributions.title,
    description: caretaker.director.book.sections.parentContributions.description,
    icon: HandCoins,
  },
  {
    id: 'environmentTalks',
    sectionId: 'bookEnvironmentTalks',
    path: CARETAKER_PATHS.bookEnvironmentTalks,
    paperSection: 'IX',
    label: caretaker.director.book.sections.environmentTalks.title,
    description: caretaker.director.book.sections.environmentTalks.description,
    icon: MessagesSquare,
  },
  {
    id: 'committee',
    sectionId: 'bookCommittee',
    path: CARETAKER_PATHS.bookCommittee,
    paperSection: 'X',
    label: caretaker.director.book.sections.committee.title,
    description: caretaker.director.book.sections.committee.description,
    icon: UsersRound,
  },
  {
    id: 'staff',
    sectionId: 'bookStaff',
    path: CARETAKER_PATHS.bookStaff,
    paperSection: 'XI',
    label: caretaker.director.book.sections.staff.title,
    description: caretaker.director.book.sections.staff.description,
    icon: UserCog,
  },
  {
    id: 'support',
    sectionId: 'bookSupport',
    path: CARETAKER_PATHS.bookSupport,
    paperSection: 'XII',
    label: caretaker.director.book.sections.support.title,
    description: caretaker.director.book.sections.support.description,
    icon: HeartHandshake,
  },
  {
    id: 'visitors',
    sectionId: 'bookVisitors',
    path: CARETAKER_PATHS.bookVisitors,
    paperSection: 'XIII',
    label: caretaker.director.book.sections.visitors.title,
    description: caretaker.director.book.sections.visitors.description,
    icon: DoorOpen,
  },
  {
    id: 'training',
    sectionId: 'bookTraining',
    path: CARETAKER_PATHS.bookTraining,
    paperSection: 'XIV',
    label: caretaker.director.book.sections.training.title,
    description: caretaker.director.book.sections.training.description,
    icon: GraduationCap,
  },
]

/** Hub pages that live under Ibindi rather than as peer sidebar items. */
const moreHubPaths = [
  CARETAKER_PATHS.more,
  CARETAKER_PATHS.register,
  CARETAKER_PATHS.imirire,
  CARETAKER_PATHS.sted,
  CARETAKER_PATHS.reports,
  CARETAKER_PATHS.settings,
]

const directorShellPaths = [
  CARETAKER_PATHS.ikigo,
  CARETAKER_PATHS.management,
  CARETAKER_PATHS.users,
  CARETAKER_PATHS.selfEval,
  CARETAKER_PATHS.transfers,
  CARETAKER_PATHS.book,
  ...BOOK_SECTIONS.map((section) => section.path),
]

/**
 * Daily work first: home → children → attendance → growth.
 * Feeding, STED, register, reports, and settings stay under Ibindi.
 */
const dailyNavItems: CaretakerNavItem[] = [
  {
    id: 'home',
    path: CARETAKER_PATHS.home,
    label: caretaker.nav.home,
    icon: Home,
    exact: true,
    matchPaths: [CARETAKER_PATHS.home],
  },
  {
    id: 'children',
    path: CARETAKER_PATHS.children,
    label: caretaker.nav.children,
    icon: Users,
    matchPaths: [CARETAKER_PATHS.children],
  },
  {
    id: 'attendance',
    path: CARETAKER_PATHS.attendance,
    label: caretaker.nav.attendance,
    icon: ClipboardCheck,
  },
  {
    id: 'growth',
    path: CARETAKER_PATHS.growth,
    label: caretaker.nav.growth,
    icon: Ruler,
    matchPaths: [CARETAKER_PATHS.growth],
  },
  {
    id: 'more',
    path: CARETAKER_PATHS.more,
    label: caretaker.nav.more,
    icon: LayoutGrid,
    matchPaths: moreHubPaths,
  },
]

const directorManagementChildren: CaretakerNavItem[] = [
  {
    id: 'users',
    path: CARETAKER_PATHS.users,
    label: caretaker.nav.users,
    icon: Users,
    matchPaths: [CARETAKER_PATHS.users],
    directorOnly: true,
  },
  {
    id: 'selfEval',
    path: CARETAKER_PATHS.selfEval,
    label: caretaker.selfEval.title,
    icon: ClipboardCheck,
    matchPaths: [CARETAKER_PATHS.selfEval],
    directorOnly: true,
  },
  {
    id: 'transfers',
    path: CARETAKER_PATHS.transfers,
    label: caretaker.nav.transfers,
    icon: ArrowLeftRight,
    matchPaths: [CARETAKER_PATHS.transfers],
    directorOnly: true,
  },
]

const directorBookChildren: CaretakerNavItem[] = BOOK_SECTIONS.map((section) => ({
  id: section.sectionId,
  path: section.path,
  label: section.label,
  icon: section.icon,
  matchPaths: [section.path],
  directorOnly: true,
}))

/**
 * Director extras as three hubs, not a flat list of every nested page.
 * Book and management children expand only while that section is open.
 */
const directorIkigoNavItems: CaretakerNavItem[] = [
  {
    id: 'ikigo',
    path: CARETAKER_PATHS.ikigo,
    label: caretaker.director.nav.ikigo,
    icon: Building2,
    matchPaths: [CARETAKER_PATHS.ikigo],
    directorOnly: true,
  },
  {
    id: 'book',
    path: CARETAKER_PATHS.book,
    label: caretaker.director.nav.book,
    icon: BookOpen,
    exact: true,
    matchPaths: [CARETAKER_PATHS.book],
    directorOnly: true,
    children: directorBookChildren,
  },
  {
    id: 'management',
    path: CARETAKER_PATHS.management,
    label: caretaker.director.nav.management,
    icon: Settings2,
    exact: true,
    matchPaths: [CARETAKER_PATHS.management],
    directorOnly: true,
    children: directorManagementChildren,
  },
]

export const CARETAKER_DAILY_NAV_GROUP: CaretakerNavGroup = {
  id: 'daily',
  label: caretaker.director.groups.daily,
  items: dailyNavItems,
}

export const CARETAKER_IKIGO_NAV_GROUP: CaretakerNavGroup = {
  id: 'ikigo',
  label: caretaker.director.groups.ikigo,
  directorOnly: true,
  items: directorIkigoNavItems,
}

/** Daily map: ≤5 items. Rarer tasks live under Ibindi. */
export const CARETAKER_MOBILE_NAV: CaretakerNavItem[] = dailyNavItems.map((item) =>
  item.id === 'more'
    ? { ...item, matchPaths: [...moreHubPaths, ...directorShellPaths] }
    : item,
)

export function buildCaretakerNavGroups(director: boolean): CaretakerNavGroup[] {
  if (!director) {
    const caregiverMorePaths = [
      ...moreHubPaths,
      CARETAKER_PATHS.selfEval,
      CARETAKER_PATHS.users,
      CARETAKER_PATHS.transfers,
    ]
    return [
      {
        ...CARETAKER_DAILY_NAV_GROUP,
        items: dailyNavItems.map((item) =>
          item.id === 'more'
            ? { ...item, matchPaths: caregiverMorePaths }
            : item,
        ),
      },
    ]
  }
  return [CARETAKER_DAILY_NAV_GROUP, CARETAKER_IKIGO_NAV_GROUP]
}

export function flattenCaretakerNavGroups(groups: CaretakerNavGroup[]): CaretakerNavItem[] {
  const walk = (items: CaretakerNavItem[]): CaretakerNavItem[] =>
    items.flatMap((item) => [item, ...(item.children ? walk(item.children) : [])])
  return groups.flatMap((group) => walk(group.items))
}

export function navItemMatchesPath(pathname: string, item: CaretakerNavItem): boolean {
  if (item.exact || item.id === 'home') {
    return pathname === item.path
  }
  const paths = item.matchPaths?.length ? item.matchPaths : [item.path]
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function isPathWithinNavItem(pathname: string, item: CaretakerNavItem): boolean {
  if (navItemMatchesPath(pathname, item)) return true
  return item.children?.some((child) => isPathWithinNavItem(pathname, child)) ?? false
}

export function findBookSectionByPath(pathname: string): BookSectionDefinition | undefined {
  const ranked = [...BOOK_SECTIONS].sort((a, b) => b.path.length - a.path.length)
  return ranked.find(
    (section) => pathname === section.path || pathname.startsWith(`${section.path}/`),
  )
}

export function findCaretakerNavItem(pathname: string, director: boolean): CaretakerNavItem | undefined {
  const groups = buildCaretakerNavGroups(director)
  const items = flattenCaretakerNavGroups(groups)
  const ranked = [...items].sort((a, b) => b.path.length - a.path.length)
  return ranked.find((item) => navItemMatchesPath(pathname, item))
}

const HUB_PAGE_TITLES: { path: string; title: string }[] = [
  { path: CARETAKER_PATHS.register, title: caretaker.nav.register },
  { path: CARETAKER_PATHS.imirire, title: caretaker.nav.imirire },
  { path: CARETAKER_PATHS.sted, title: caretaker.nav.sted },
  { path: CARETAKER_PATHS.reports, title: caretaker.nav.reports },
  { path: CARETAKER_PATHS.settings, title: caretaker.nav.settings },
]

export function getCaretakerPageTitle(pathname: string, director: boolean): string {
  const bookSection = findBookSectionByPath(pathname)
  if (bookSection) return bookSection.label

  const hubTitle = [...HUB_PAGE_TITLES]
    .sort((a, b) => b.path.length - a.path.length)
    .find((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`))
  if (hubTitle) return hubTitle.title

  const navItem = findCaretakerNavItem(pathname, director)
  if (navItem && navItem.id !== 'more') return navItem.label
  if (pathname === CARETAKER_PATHS.more || pathname.startsWith(`${CARETAKER_PATHS.more}/`)) {
    return caretaker.nav.more
  }

  return caretaker.nav.home
}
