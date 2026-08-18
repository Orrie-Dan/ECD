import { NavLink, useLocation } from 'react-router-dom'

interface DistrictWorkspaceTab {
  path: string
  label: string
  end?: boolean
}

interface DistrictWorkspaceNavProps {
  items: readonly DistrictWorkspaceTab[]
  ariaLabel: string
}

export function DistrictWorkspaceNav({ items, ariaLabel }: DistrictWorkspaceNavProps) {
  const { search } = useLocation()

  return (
    <nav
      className="flex flex-nowrap gap-1 mb-4 border-b border-border overflow-x-auto overscroll-x-contain -mx-3 px-3 sm:mx-0 sm:px-0"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={{ pathname: item.path, search }}
          end={item.end === true}
          className={({ isActive }) =>
            [
              'shrink-0 whitespace-nowrap min-h-11 inline-flex items-center px-3 py-2 text-body font-medium rounded-t-lg border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text hover:border-border-strong',
            ].join(' ')
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
