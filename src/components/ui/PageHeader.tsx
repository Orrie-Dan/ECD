import { type ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  badge?: string
  action?: ReactNode
  size?: 'default' | 'compact'
}

export function PageHeader({ title, subtitle, badge, action, size = 'default' }: PageHeaderProps) {
  const compact = size === 'compact'

  return (
    <header className={compact ? 'mb-3' : 'mb-5'}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className={`min-w-0 ${compact ? 'space-y-0.5' : 'space-y-2'}`}>
          {badge && (
            <span className="inline-block px-3 py-1 rounded-full bg-primary-light text-primary text-caption font-semibold">
              {badge}
            </span>
          )}
          <h1 className={compact ? 'text-heading text-text' : 'text-display text-text'}>{title}</h1>
          {subtitle && (
            <p className={`text-text-secondary max-w-2xl ${compact ? 'text-body' : 'text-body-lg'}`}>
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
      </div>
    </header>
  )
}
