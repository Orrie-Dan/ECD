import { Users, UserCheck, UserX, TrendingUp, Clock } from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'
import type { AttendanceSummaryStats } from '@/lib/attendance-utils'

interface AttendanceSummaryCardsProps {
  stats: AttendanceSummaryStats
  /** Show late arrivals card (placeholder-friendly). Default true. */
  showLate?: boolean
  /** Compact grid for dashboards */
  compact?: boolean
  className?: string
  labels?: {
    total?: string
    present?: string
    absent?: string
    rate?: string
    late?: string
  }
}

/** Equal-height summary strip for daily / monitoring attendance views. */
export function AttendanceSummaryCards({
  stats,
  showLate = true,
  compact = false,
  className = '',
  labels,
}: AttendanceSummaryCardsProps) {
  const cols = showLate
    ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5'
    : 'grid-cols-2 sm:grid-cols-4'

  return (
    <div
      className={`grid ${cols} gap-4 items-stretch ${className}`}
      role="group"
      aria-label={caretaker.attendance.summaryTitle}
    >
      <div className="h-full [&_>div]:h-full">
        <StatCard
          label={labels?.total ?? caretaker.attendance.todayTotal}
          value={stats.total}
          icon={<Users size={compact ? 18 : 22} className="text-primary" />}
          compact={compact}
        />
      </div>
      <div className="h-full [&_>div]:h-full">
        <StatCard
          label={labels?.present ?? caretaker.attendance.arrived}
          value={stats.present}
          icon={<UserCheck size={compact ? 18 : 22} className="text-success" />}
          variant="success"
          compact={compact}
        />
      </div>
      <div className="h-full [&_>div]:h-full">
        <StatCard
          label={labels?.absent ?? caretaker.attendance.filterAbsent}
          value={stats.absent}
          icon={<UserX size={compact ? 18 : 22} className="text-text-muted" />}
          compact={compact}
        />
      </div>
      <div className="h-full [&_>div]:h-full">
        <StatCard
          label={labels?.rate ?? caretaker.attendance.attendanceRate}
          value={`${stats.rate}%`}
          icon={<TrendingUp size={compact ? 18 : 22} className="text-secondary" />}
          variant={stats.rate >= 70 ? 'success' : 'warning'}
          compact={compact}
        />
      </div>
      {showLate && (
        <div className="h-full [&_>div]:h-full">
          <StatCard
            label={labels?.late ?? caretaker.attendance.lateArrivals}
            value={stats.lateArrivals ?? caretaker.attendance.latePlaceholder}
            icon={<Clock size={compact ? 18 : 22} className="text-warning" />}
            variant="warning"
            compact={compact}
          />
        </div>
      )}
    </div>
  )
}

/** Alias matching design-system naming from attendance UX spec. */
export { AttendanceSummaryCards as AttendanceSummaryCard }
