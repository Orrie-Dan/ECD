import { Users, Accessibility, Clock, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'
import type { StedCenterSummaryStats, StedListFilter } from '@/lib/sted-utils'

interface StedSummaryCardsProps {
  stats: StedCenterSummaryStats
  compact?: boolean
  className?: string
  activeFilter?: StedListFilter
  onFilterChange?: (filter: StedListFilter) => void
}

export function StedSummaryCards({
  stats,
  compact = false,
  className = '',
  activeFilter,
  onFilterChange,
}: StedSummaryCardsProps) {
  const clickable = !!onFilterChange

  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-4 gap-4 items-stretch ${className}`}
      role="group"
      aria-label={caretaker.sted.summaryTitle}
    >
      <div className="h-full [&>button]:h-full [&>div]:h-full">
        <StatCard
          label={caretaker.sted.eligibleChildren}
          value={stats.eligible}
          icon={<Users size={compact ? 18 : 22} className="text-primary" />}
          compact={compact}
          selected={activeFilter === 'all'}
          onClick={clickable ? () => onFilterChange('all') : undefined}
        />
      </div>
      <div className="h-full [&>button]:h-full [&>div]:h-full">
        <StatCard
          label={caretaker.sted.assessed}
          value={stats.assessed}
          icon={<Accessibility size={compact ? 18 : 22} className="text-success" />}
          variant="success"
          compact={compact}
          selected={activeFilter === 'assessed'}
          onClick={clickable ? () => onFilterChange('assessed') : undefined}
        />
      </div>
      <div className="h-full [&>button]:h-full [&>div]:h-full">
        <StatCard
          label={caretaker.sted.dueFollowUpCount}
          value={stats.dueFollowUp}
          icon={<Clock size={compact ? 18 : 22} className="text-warning" />}
          variant="warning"
          compact={compact}
          selected={activeFilter === 'due'}
          onClick={clickable ? () => onFilterChange('due') : undefined}
        />
      </div>
      <div className="h-full [&>button]:h-full [&>div]:h-full">
        <StatCard
          label={caretaker.sted.coverage}
          value={`${stats.coverageRate}%`}
          icon={<TrendingUp size={compact ? 18 : 22} className="text-secondary" />}
          variant={stats.coverageRate >= 70 ? 'success' : 'warning'}
          compact={compact}
          selected={activeFilter === 'assessed'}
          onClick={clickable ? () => onFilterChange('assessed') : undefined}
        />
      </div>
    </div>
  )
}
