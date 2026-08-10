import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge'
import { AttendanceActions } from '@/components/attendance/AttendanceActions'
import { calculateAge, formatDate } from '@/lib/mock-data'
import { gender as genderLabels } from '@/locales/rw/common'
import { caretaker } from '@/locales/rw/caretaker'
import {
  formatArrivalTime,
  getAbsentReasonLabel,
} from '@/lib/attendance-utils'
import type { AttendanceDayStatus, AttendanceRecord, Child } from '@/types'

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

interface AttendanceCardProps {
  child: Child
  todayStatus: AttendanceDayStatus
  todayRecord?: AttendanceRecord
  history?: AttendanceRecord[]
  onMarkPresent?: () => void
  onMarkAbsent?: () => void
  onEdit?: () => void
  className?: string
}

export function AttendanceCard({
  child,
  todayStatus,
  todayRecord,
  history = [],
  onMarkPresent,
  onMarkAbsent,
  onEdit,
  className = '',
}: AttendanceCardProps) {
  const age = calculateAge(child.dateOfBirth)
  const initials = getInitials(child.fullName)

  const last = useMemo(() => {
    const prior = history
      .filter((r) => !todayRecord || r.id !== todayRecord.id)
      .sort((a, b) => b.date.localeCompare(a.date))
    return prior[0]
  }, [history, todayRecord])

  const lastAttendanceMeta = (() => {
    if (todayStatus === 'present' && todayRecord) {
      return {
        date: formatDate(todayRecord.date),
        detail: todayRecord.arrivedAt
          ? formatArrivalTime(todayRecord.arrivedAt)
          : caretaker.attendance.statusPresent,
      }
    }
    if (todayStatus === 'absent' && todayRecord) {
      return {
        date: formatDate(todayRecord.date),
        detail: getAbsentReasonLabel(todayRecord.absentReason),
      }
    }
    if (!last) {
      return {
        date: null as string | null,
        detail: caretaker.attendance.noLastAttendance,
      }
    }
    const status = last.present
      ? caretaker.attendance.statusPresent
      : caretaker.attendance.statusAbsent
    const detail = last.present
      ? formatArrivalTime(last.arrivedAt)
      : getAbsentReasonLabel(last.absentReason)
    return {
      date: formatDate(last.date),
      detail: `${status}${detail !== '—' ? ` · ${detail}` : ''}`,
    }
  })()

  const canRecord = todayStatus === 'unrecorded'

  return (
    <Card
      padding="lg"
      className={`h-60 flex flex-col ${className}`}
      aria-label={`${child.fullName} — ${todayStatus}`}
    >
      {/* Identity */}
      <div className="flex items-start gap-3">
        <div
          className={`
            flex items-center justify-center w-12 h-12 rounded-xl text-body font-bold shrink-0
            ${child.gender === 'Umuhungu'
              ? 'bg-secondary-light text-secondary'
              : 'bg-primary-light text-primary'}
          `}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-subheading text-text line-clamp-2 leading-snug min-h-11">
            {child.fullName}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 min-h-6">
            <span className="inline-flex items-center rounded-full bg-background-subtle px-2.5 py-0.5 text-caption font-semibold text-text-secondary">
              {caretaker.children.age} {age}
            </span>
            <span className="text-caption text-text-muted truncate">
              {genderLabels[child.gender]}
            </span>
            <AttendanceStatusBadge status={todayStatus} />
          </div>
        </div>
      </div>

      {/* Ubwitabire bwa nyuma + actions grouped together */}
      <div className="mt-auto pt-3">
        <div className="min-h-12 mb-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-caption font-semibold text-text-muted shrink-0">
              {caretaker.attendance.lastAttendance}
            </p>
            {lastAttendanceMeta.date && (
              <p className="text-caption font-semibold text-text tabular-nums text-right truncate">
                {lastAttendanceMeta.date}
              </p>
            )}
          </div>
          <p className="text-caption text-text-secondary line-clamp-2 mt-0.5">
            {lastAttendanceMeta.detail}
          </p>
        </div>

        <AttendanceActions
          childName={child.fullName}
          mode={canRecord ? 'record' : 'edit'}
          onMarkPresent={onMarkPresent}
          onMarkAbsent={onMarkAbsent}
          onEdit={onEdit}
        />
      </div>
    </Card>
  )
}
