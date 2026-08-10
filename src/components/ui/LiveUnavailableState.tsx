import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { common } from '@/locales/rw/common'

interface LiveUnavailableStateProps {
  title?: string
  description?: string
  compact?: boolean
  className?: string
  action?: ReactNode
}

/**
 * Honest empty/unavailable surface for LIVE mode when mock data or
 * unsupported mutations must not be shown as real.
 */
export function LiveUnavailableState({
  title = common.live.unavailableTitle,
  description = common.live.unavailableDesc,
  compact = false,
  className = '',
  action,
}: LiveUnavailableStateProps) {
  return (
    <Card
      padding={compact ? 'md' : 'lg'}
      className={`border-border bg-background-subtle/40 ${className}`.trim()}
    >
      <p className={`font-semibold text-text ${compact ? 'text-body' : 'text-subheading'}`}>
        {title}
      </p>
      <p className={`text-text-secondary mt-1 ${compact ? 'text-caption' : 'text-body'}`}>
        {description}
      </p>
      {action ? <div className="mt-3">{action}</div> : null}
    </Card>
  )
}
