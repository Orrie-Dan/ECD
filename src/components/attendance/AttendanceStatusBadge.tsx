import { Badge } from '@/components/ui/Badge'
import { caretaker } from '@/locales/rw/caretaker'
import type { AttendanceDayStatus } from '@/types'

const VARIANT: Record<AttendanceDayStatus, 'success' | 'warning' | 'neutral'> = {
  present: 'success',
  absent: 'warning',
  unrecorded: 'neutral',
}

const LABELS: Record<AttendanceDayStatus, string> = {
  present: caretaker.attendance.statusPresent,
  absent: caretaker.attendance.statusAbsent,
  unrecorded: caretaker.attendance.statusUnrecorded,
}

interface AttendanceStatusBadgeProps {
  status: AttendanceDayStatus
  size?: 'sm' | 'md'
  className?: string
}

export function AttendanceStatusBadge({
  status,
  size = 'sm',
  className = '',
}: AttendanceStatusBadgeProps) {
  return (
    <Badge variant={VARIANT[status]} size={size} className={className} aria-label={LABELS[status]}>
      {LABELS[status]}
    </Badge>
  )
}
