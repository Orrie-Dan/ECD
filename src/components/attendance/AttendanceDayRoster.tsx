import { CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { AttendanceActions } from '@/components/attendance/AttendanceActions'
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge'
import { usePagination } from '@/hooks/usePagination'
import { caretaker } from '@/locales/rw/caretaker'
import { common, relations } from '@/locales/rw/common'
import {
  formatArrivalTime,
  formatRelativeDayLabel,
  getAbsentReasonLabel,
  getBroughtByLabel,
  type AttendanceDayRow,
} from '@/lib/attendance-utils'
import { formatDate } from '@/lib/mock-data'
import type { AttendanceRecord, Child } from '@/types'

const ROW_TONE: Record<AttendanceDayRow['status'], string> = {
  present: 'bg-success-light/40',
  absent: 'bg-warning-light/35',
  unrecorded: '',
}

function rowDetail(row: AttendanceDayRow): string {
  if (row.status === 'present') {
    const time = formatArrivalTime(row.record?.arrivedAt)
    const broughtBy = getBroughtByLabel(row.record?.broughtBy, row.record?.broughtByOther, relations)
    return broughtBy !== '—' ? `${time} · ${broughtBy}` : time
  }
  if (row.status === 'absent') {
    const reason = getAbsentReasonLabel(row.record?.absentReason)
    return row.record?.notes ? `${reason} — ${row.record.notes}` : reason
  }
  return '—'
}

function previousLabel(previous?: AttendanceRecord): string | null {
  if (!previous) return null
  const day = formatRelativeDayLabel(previous.date) || formatDate(previous.date)
  const status = previous.present
    ? caretaker.attendance.statusPresent
    : caretaker.attendance.statusAbsent
  return `${day} · ${status}`
}

interface AttendanceDayRosterProps {
  rows: AttendanceDayRow[]
  dateLabel: string
  resetDeps?: unknown[]
  onMarkPresent: (child: Child) => void
  onMarkAbsent: (child: Child) => void
  onView: (child: Child, record: AttendanceRecord) => void
  onEdit: (child: Child, record: AttendanceRecord) => void
}

export function AttendanceDayRoster({
  rows,
  dateLabel,
  resetDeps = [],
  onMarkPresent,
  onMarkAbsent,
  onView,
  onEdit,
}: AttendanceDayRosterProps) {
  const pagination = usePagination(rows, { resetDeps: [rows.length, ...resetDeps] })

  return (
    <Card padding="lg">
      <h3 className="text-subheading text-text mb-1">{caretaker.attendance.listTitle}</h3>
      <p className="text-body text-text-secondary mb-5">{dateLabel}</p>

      {rows.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={48} className="text-text-muted" strokeWidth={1.5} />}
          title={caretaker.attendance.noChildren}
          description={caretaker.attendance.noChildrenDesc}
        />
      ) : (
        <>
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="w-full min-w-0 text-left responsive-table-cards">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                    {common.labels.child}
                  </th>
                  <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                    {common.labels.status}
                  </th>
                  <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                    {caretaker.attendance.rosterDetail}
                  </th>
                  <th className="text-caption font-semibold text-text-muted pb-3">
                    {common.labels.actions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagination.items.map((row) => {
                  const previous = row.status === 'unrecorded' ? previousLabel(row.previous) : null
                  return (
                    <tr
                      key={row.child.id}
                      className={`border-b border-border last:border-0 ${ROW_TONE[row.status]}`}
                    >
                      <td
                        className="py-3 pr-4 text-body font-medium text-text"
                        data-label={common.labels.child}
                      >
                        {row.child.fullName}
                        <span className="block text-caption font-normal text-text-secondary">
                          {row.child.guardianName}
                        </span>
                        {previous && (
                          <span className="block text-caption font-normal text-text-muted mt-0.5">
                            {caretaker.attendance.lastAttendance}: {previous}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4" data-label={common.labels.status}>
                        <AttendanceStatusBadge status={row.status} />
                      </td>
                      <td
                        className="py-3 pr-4 text-body text-text-secondary"
                        data-label={caretaker.attendance.rosterDetail}
                      >
                        {rowDetail(row)}
                      </td>
                      <td className="py-3 td-actions" data-label="">
                        {row.status === 'unrecorded' ? (
                          <AttendanceActions
                            childName={row.child.fullName}
                            mode="record"
                            compact
                            fullWidth={false}
                            onMarkPresent={() => onMarkPresent(row.child)}
                            onMarkAbsent={() => onMarkAbsent(row.child)}
                          />
                        ) : row.record ? (
                          <AttendanceActions
                            childName={row.child.fullName}
                            mode="edit"
                            compact
                            fullWidth={false}
                            onView={() => onView(row.child, row.record!)}
                            onEdit={() => onEdit(row.child, row.record!)}
                          />
                        ) : (
                          <span className="text-caption text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            hasPrevious={pagination.hasPrevious}
            hasNext={pagination.hasNext}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            className="mt-0!"
          />
        </>
      )}
    </Card>
  )
}
