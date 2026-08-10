import { UserCheck, UserX, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'

interface AttendanceSummaryCardProps {
  presentCount: number
  absentCount: number
  className?: string
}

/** Child-detail attendance snapshot — present, absent, and rate only. */
export function AttendanceSummaryCard({
  presentCount,
  absentCount,
  className = '',
}: AttendanceSummaryCardProps) {
  const total = presentCount + absentCount
  const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${className}`}
      role="group"
      aria-label={caretaker.childDetail.attendanceSummary}
    >
      <StatCard
        label={caretaker.childDetail.totalPresent}
        value={presentCount}
        icon={<UserCheck size={22} className="text-success" />}
        variant="success"
      />
      <StatCard
        label={caretaker.childDetail.totalAbsent}
        value={absentCount}
        icon={<UserX size={22} className="text-text-muted" />}
      />
      <StatCard
        label={caretaker.childDetail.attendanceRate}
        value={`${rate}%`}
        icon={<TrendingUp size={22} className="text-secondary" />}
        variant={rate >= 70 ? 'success' : 'warning'}
      />
    </div>
  )
}
