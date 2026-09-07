import { Link } from 'react-router-dom'
import { type LucideIcon } from 'lucide-react'

export interface SidebarNavItem {
  path: string
  label: string
  icon: LucideIcon
  matchPaths?: string[]
  /** Match this path only — do not treat child routes as active. */
  exact?: boolean
}

interface SidebarNavLinkProps {
  item: SidebarNavItem
  active: boolean
  collapsed?: boolean
  onNavigate?: () => void
  activeStyle?: 'filled' | 'tinted'
  /** Visual highlight for a parent whose child route is current. */
  inSection?: boolean
  /** Pill-shaped active state, matching the NCDA overview shell. */
  pill?: boolean
}

export function isSidebarNavActive(pathname: string, item: SidebarNavItem): boolean {
  const paths = item.matchPaths?.length ? item.matchPaths : [item.path]
  return paths.some((path) => {
    // Root portal paths and explicit exact items never prefix-match child routes.
    if (
      item.exact ||
      path === '/ncda' ||
      path === '/district' ||
      path === '/caretaker'
    ) {
      return pathname === path
    }
    return pathname === path || pathname.startsWith(`${path}/`)
  })
}

export function SidebarNavLink({
  item,
  active,
  collapsed = false,
  onNavigate,
  activeStyle = 'filled',
  inSection = false,
  pill = false,
}: SidebarNavLinkProps) {
  const Icon = item.icon

  const filledClasses = 'bg-primary !text-white shadow-sm'
  const tintedClasses = 'bg-primary-light text-primary shadow-sm'
  const inactiveClasses = 'text-text-secondary hover:bg-background-subtle hover:text-text'
  const activeClasses = activeStyle === 'filled' ? filledClasses : tintedClasses
  const visualClasses = active ? activeClasses : inSection ? tintedClasses : inactiveClasses

  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`
        flex items-center gap-2.5 text-body transition-colors
        ${pill ? 'rounded-full' : 'rounded-lg'}
        ${active || inSection ? 'font-semibold' : 'font-medium'}
        ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
        ${visualClasses}
      `}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={20} strokeWidth={active || inSection ? 2.5 : 2} className="shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate leading-snug">{item.label}</span>}
    </Link>
  )
}
