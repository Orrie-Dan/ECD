import { type ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  badge?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, badge, action }: PageHeaderProps) {
  return (
    <header className="mb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          {badge && (
            <span className="inline-block px-3 py-1 rounded-full bg-primary-light text-primary text-caption font-semibold">
              {badge}
            </span>
          )}
          <h1 className="text-display text-text">{title}</h1>
          {subtitle && (
            <p className="text-body-lg text-text-secondary max-w-2xl">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  )
}
