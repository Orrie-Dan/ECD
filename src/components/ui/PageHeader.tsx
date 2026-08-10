import { type ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  /** Preferred prop for supporting copy under the title. */
  description?: ReactNode
  /** @deprecated Prefer `description`. Kept for existing call sites. */
  subtitle?: ReactNode
  badge?: string
  action?: ReactNode
  size?: 'default' | 'compact'
}

/**
 * Standard page title block.
 * - default → text-display (page title)
 * - compact → text-heading (dense district pages)
 */
export function PageHeader({
  title,
  description,
  subtitle,
  badge,
  action,
  size = 'default',
}: PageHeaderProps) {
  const compact = size === 'compact'
  const support = description ?? subtitle

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
          {support && (
            <p className={`text-text-secondary max-w-2xl ${compact ? 'text-body' : 'text-body-lg'}`}>
              {support}
            </p>
          )}
        </div>
        {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
      </div>
    </header>
  )
}
