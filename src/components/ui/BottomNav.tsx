import { Link, useLocation } from 'react-router-dom'
import { type LucideIcon } from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  matchPaths?: string[]
}

interface BottomNavProps {
  items: NavItem[]
}

export function BottomNav({ items }: BottomNavProps) {
  const location = useLocation()

  const isActive = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some((p) => location.pathname.startsWith(p))
    }
    return location.pathname === item.path
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border shadow-lg lg:hidden"
      aria-label="Imbuga nkuru"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-2 min-h-[56px]
                transition-colors
                ${active ? 'text-primary' : 'text-text-muted hover:text-text-secondary'}
              `}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={`
                  flex items-center justify-center w-9 h-9 rounded-lg transition-colors
                  ${active ? 'bg-primary-light' : ''}
                `}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              </span>
              <span className={`text-xs leading-tight text-center ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
