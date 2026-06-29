import { Link } from 'react-router-dom'
import { type LucideIcon } from 'lucide-react'

export interface SidebarNavItem {
  path: string
  label: string
  icon: LucideIcon
  matchPaths?: string[]
}

interface SidebarNavLinkProps {
  item: SidebarNavItem
  active: boolean
  collapsed?: boolean
  onNavigate?: () => void
  activeStyle?: 'filled' | 'tinted'
}

export function isSidebarNavActive(pathname: string, item: SidebarNavItem): boolean {
  if (item.matchPaths) {
    return item.matchPaths.some(
      (path) => pathname === path || pathname.startsWith(path + '/'),
    )
  }
  if (item.path.endsWith('/') || item.path === '/caretaker' || item.path === '/district') {
    return pathname === item.path
  }
  return pathname === item.path || pathname.startsWith(item.path + '/')
}

export function SidebarNavLink({
  item,
  active,
  collapsed = false,
  onNavigate,
  activeStyle = 'filled',
}: SidebarNavLinkProps) {
  const Icon = item.icon

  const activeClasses =
    activeStyle === 'filled'
      ? 'bg-primary text-white shadow-sm'
      : 'bg-primary-light text-primary shadow-sm'

  const inactiveClasses = 'text-text-secondary hover:bg-background-subtle hover:text-text'

  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`
        flex items-center gap-2.5 rounded-lg text-body font-medium transition-colors
        ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
        ${active ? activeClasses : inactiveClasses}
      `}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={20} strokeWidth={active ? 2.5 : 2} className="shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate leading-snug">{item.label}</span>}
    </Link>
  )
}
