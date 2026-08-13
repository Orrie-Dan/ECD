import { NavLink } from 'react-router-dom'

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
  return (
    <nav
      className="flex flex-wrap gap-1 mb-4 border-b border-border"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.end === true}
          className={({ isActive }) =>
            [
              'px-3 py-2 text-body font-medium rounded-t-lg border-b-2 -mb-px transition-colors',
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
