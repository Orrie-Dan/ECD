import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { district } from '@/locales/rw/district'
import type { TrendDirection } from '@/types'

interface TrendBadgeProps {
  direction: TrendDirection
  change?: number
}

export function TrendBadge({ direction, change }: TrendBadgeProps) {
  if (direction === 'up') {
    return (
      <span className="inline-flex items-center gap-1 text-caption font-semibold text-success">
        <TrendingUp size={14} aria-hidden />
        {district.dashboard.trendUp}
        {change !== undefined && <span className="text-text-muted">(+{change}%)</span>}
      </span>
    )
  }

  if (direction === 'down') {
    return (
      <span className="inline-flex items-center gap-1 text-caption font-semibold text-warning">
        <TrendingDown size={14} aria-hidden />
        {district.dashboard.trendDown}
        {change !== undefined && <span className="text-text-muted">(-{change}%)</span>}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-caption font-semibold text-text-muted">
      <Minus size={14} aria-hidden />
      {district.dashboard.trendStable}
    </span>
  )
}
