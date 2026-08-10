import { Users, AlertTriangle, Clock, CheckCircle2, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'
import type { GrowthListFilter, GrowthSummaryStats } from '@/lib/nutrition-utils'

interface GrowthSummaryCardsProps {
  stats: GrowthSummaryStats
  compact?: boolean
  className?: string
  /** Active list filter — highlights the matching KPI card. */
  activeFilter?: GrowthListFilter
  /** Click a KPI to filter the child list. */
  onFilterChange?: (filter: GrowthListFilter) => void
  labels?: {
    total?: string
    due?: string
    overdue?: string
    atRisk?: string
    upToDate?: string
    coverage?: string
  }
}

/**
 * Growth/nutrition KPI strip aligned with Imikurire work.
 * Cards can act as filters when onFilterChange is provided.
 */
export function GrowthSummaryCards({
  stats,
  compact = false,
  className = '',
  activeFilter,
  onFilterChange,
  labels,
}: GrowthSummaryCardsProps) {
  const clickable = !!onFilterChange

  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 items-stretch ${className}`}
      role="group"
      aria-label={caretaker.growth.summaryTitle}
    >
      <div className="h-full [&>button]:h-full [&>div]:h-full">
        <StatCard
          label={labels?.total ?? caretaker.growth.totalChildren}
          value={stats.totalChildren}
          icon={<Users size={compact ? 18 : 22} className="text-primary" />}
          compact={compact}
          selected={activeFilter === 'all'}
          onClick={clickable ? () => onFilterChange('all') : undefined}
          aria-label={`${labels?.total ?? caretaker.growth.totalChildren}: ${stats.totalChildren}`}
        />
      </div>
      <div className="h-full [&>button]:h-full [&>div]:h-full">
        <StatCard
          label={labels?.due ?? caretaker.growth.due}
          value={stats.due}
          icon={<Clock size={compact ? 18 : 22} className="text-warning" />}
          variant="warning"
          compact={compact}
          selected={activeFilter === 'due'}
          onClick={clickable ? () => onFilterChange('due') : undefined}
          aria-label={`${labels?.due ?? caretaker.growth.due}: ${stats.due}`}
        />
      </div>
      <div className="h-full [&>button]:h-full [&>div]:h-full">
        <StatCard
          label={labels?.overdue ?? caretaker.growth.overdue}
          value={stats.overdue}
          icon={<Clock size={compact ? 18 : 22} className="text-error" />}
          variant="danger"
          compact={compact}
          selected={activeFilter === 'overdue'}
          onClick={clickable ? () => onFilterChange('overdue') : undefined}
          aria-label={`${labels?.overdue ?? caretaker.growth.overdue}: ${stats.overdue}`}
        />
      </div>
      <div className="h-full [&>button]:h-full [&>div]:h-full">
        <StatCard
          label={labels?.atRisk ?? caretaker.growth.atRisk}
          value={stats.atRisk}
          icon={<AlertTriangle size={compact ? 18 : 22} className="text-error" />}
          variant="danger"
          compact={compact}
          selected={activeFilter === 'at_risk'}
          onClick={clickable ? () => onFilterChange('at_risk') : undefined}
          aria-label={`${labels?.atRisk ?? caretaker.growth.atRisk}: ${stats.atRisk}`}
        />
      </div>
      <div className="h-full [&>button]:h-full [&>div]:h-full col-span-2 sm:col-span-1">
        <StatCard
          label={labels?.coverage ?? caretaker.growth.coverage}
          value={`${stats.coverageRate}%`}
          icon={
            stats.coverageRate >= 70 ? (
              <CheckCircle2 size={compact ? 18 : 22} className="text-success" />
            ) : (
              <TrendingUp size={compact ? 18 : 22} className="text-secondary" />
            )
          }
          variant={stats.coverageRate >= 70 ? 'success' : 'warning'}
          compact={compact}
          selected={activeFilter === 'up_to_date'}
          onClick={clickable ? () => onFilterChange('up_to_date') : undefined}
          aria-label={`${labels?.coverage ?? caretaker.growth.coverage}: ${stats.coverageRate}%`}
        />
      </div>
    </div>
  )
}
