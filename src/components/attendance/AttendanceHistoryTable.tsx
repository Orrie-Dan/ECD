import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge'
import { usePagination } from '@/hooks/usePagination'
import { caretaker } from '@/locales/rw/caretaker'
import { common, relations } from '@/locales/rw/common'
import { formatDate } from '@/lib/mock-data'
import {
  formatArrivalTime,
  getAbsentReasonLabel,
  getBroughtByLabel,
} from '@/lib/attendance-utils'
import type { AttendanceRecord, Child } from '@/types'
import { CalendarDays } from 'lucide-react'

interface AttendanceHistoryTableProps {
  records: AttendanceRecord[]
  childrenById?: Map<string, Child>
  showChildName?: boolean
  title?: string
  emptyMessage?: string
  emptyDescription?: string
  resetDeps?: unknown[]
  className?: string
}

export function AttendanceHistoryTable({
  records,
  childrenById,
  showChildName = false,
  title = caretaker.childDetail.attendanceHistory,
  emptyMessage = caretaker.childDetail.noAttendanceHistory,
  emptyDescription,
  resetDeps = [],
  className = '',
}: AttendanceHistoryTableProps) {
  const sorted = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          (b.arrivedAt ?? '').localeCompare(a.arrivedAt ?? ''),
      ),
    [records],
  )

  const pagination = usePagination(sorted, { resetDeps: [sorted.length, ...resetDeps] })

  return (
    <Card padding="lg" className={className}>
      <h3 className="text-label text-primary mb-4">{title}</h3>
      {sorted.length === 0 ? (
        emptyDescription ? (
          <EmptyState
            icon={<CalendarDays size={48} className="text-text-muted" strokeWidth={1.5} />}
            title={emptyMessage}
            description={emptyDescription}
          />
        ) : (
          <p className="text-body text-text-secondary text-center py-8">{emptyMessage}</p>
        )
      ) : (
        <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
          <table className="w-full min-w-0 text-left responsive-table-cards">
            <thead>
              <tr className="border-b border-border">
                {showChildName && (
                  <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                    {common.labels.child}
                  </th>
                )}
                <th className="text-caption font-semibold text-text-muted pb-3 pr-4">{common.labels.date}</th>
                <th className="text-caption font-semibold text-text-muted pb-3 pr-4">{common.labels.status}</th>
                <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                  {caretaker.attendance.arrivalTime}
                </th>
                <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                  {caretaker.attendance.recordedBy}
                </th>
                <th className="text-caption font-semibold text-text-muted pb-3">
                  {caretaker.report.reason} / {caretaker.attendance.broughtByLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {pagination.items.map((record) => {
                const child = childrenById?.get(record.childId)
                return (
                  <tr key={record.id} className="border-b border-border last:border-0">
                    {showChildName && (
                      <td className="py-3 pr-4 text-body font-medium text-text" data-label={common.labels.child}>
                        {child?.fullName ?? record.childId}
                      </td>
                    )}
                    <td className="py-3 pr-4 text-body" data-label={common.labels.date}>
                      {formatDate(record.date)}
                    </td>
                    <td className="py-3 pr-4" data-label={common.labels.status}>
                      <AttendanceStatusBadge status={record.present ? 'present' : 'absent'} />
                    </td>
                    <td
                      className="py-3 pr-4 text-body font-mono"
                      data-label={caretaker.attendance.arrivalTime}
                    >
                      {record.present ? formatArrivalTime(record.arrivedAt) : '—'}
                    </td>
                    <td
                      className="py-3 pr-4 text-body text-text-secondary"
                      data-label={caretaker.attendance.recordedBy}
                    >
                      {record.recordedBy ?? '—'}
                    </td>
                    <td
                      className="py-3 text-body text-text-secondary break-words"
                      data-label={caretaker.report.reason}
                    >
                      {record.present ? (
                        getBroughtByLabel(record.broughtBy, record.broughtByOther, relations)
                      ) : (
                        <>
                          {getAbsentReasonLabel(record.absentReason)}
                          {record.notes ? ` — ${record.notes}` : ''}
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {sorted.length > 0 && (
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
      )}
    </Card>
  )
}
