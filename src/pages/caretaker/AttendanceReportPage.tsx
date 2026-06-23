import { useMemo, useState } from 'react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { StatCard } from '@/components/ui/Card'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { EmptyState } from '@/components/ui/EmptyState'
import { AttendanceViewSheet } from '@/components/caretaker/attendance/AttendanceViewSheet'
import { useData } from '@/contexts/AppContext'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { formatDate } from '@/lib/mock-data'
import {
  getRecordForDate,
  getTodayDate,
  getYesterdayDate,
  isPresentOnDate,
} from '@/lib/attendance-utils'
import { Users, UserCheck, UserX, TrendingUp, Eye, CalendarDays } from 'lucide-react'
import type { AttendanceRecord, Child } from '@/types'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'

type ReportFilter = 'all' | 'present' | 'absent'

export function AttendanceReportPage() {
  const { children, attendance } = useData()
  const [viewEntry, setViewEntry] = useState<{ child: Child; record: AttendanceRecord } | null>(null)
  const [selectedDate, setSelectedDate] = useState(getTodayDate)
  const [filter, setFilter] = useState<ReportFilter>('all')

  const today = getTodayDate()
  const yesterday = getYesterdayDate()

  const reportRows = useMemo(() => {
    return children
      .map((child) => {
        const present = isPresentOnDate(attendance, child.id, selectedDate)
        const record = getRecordForDate(attendance, child.id, selectedDate)
        return { child, present, record }
      })
      .filter((row) => {
        if (filter === 'present') return row.present
        if (filter === 'absent') return !row.present
        return true
      })
  }, [children, attendance, selectedDate, filter])

  const pagination = usePagination(reportRows, {
    resetDeps: [selectedDate, filter],
  })

  const presentCount = useMemo(
    () => children.filter((child) => isPresentOnDate(attendance, child.id, selectedDate)).length,
    [children, attendance, selectedDate],
  )

  const absentCount = children.length - presentCount
  const rate = children.length > 0 ? Math.round((presentCount / children.length) * 100) : 0

  const formattedDate = formatDate(selectedDate)
  const isToday = selectedDate === today
  const isYesterday = selectedDate === yesterday

  return (
    <CaretakerLayout>
      <p className="text-body-lg text-text-secondary mb-6">
        {caretaker.report.subtitle} — <span className="font-semibold text-text">{formattedDate}</span>
        {isToday && (
          <span className="ml-2 inline-flex items-center rounded-full bg-primary-light px-2.5 py-0.5 text-caption font-semibold text-primary">
            {common.today}
          </span>
        )}
        {isYesterday && (
          <span className="ml-2 inline-flex items-center rounded-full bg-background-subtle px-2.5 py-0.5 text-caption font-semibold text-text-secondary">
            {caretaker.report.yesterday}
          </span>
        )}
      </p>

      <Card padding="lg" className="mb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
          <div className="flex-1 min-w-0">
            <FormField label={caretaker.report.dateLabel}>
              <TextInput
                type="date"
                value={selectedDate}
                max={today}
                onChange={(event) => setSelectedDate(event.target.value)}
                aria-label={caretaker.report.dateLabel}
              />
            </FormField>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={isToday ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setSelectedDate(today)}
            >
              {common.today}
            </Button>
            <Button
              type="button"
              variant={isYesterday ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setSelectedDate(yesterday)}
            >
              {caretaker.report.yesterday}
            </Button>
          </div>

          <div className="w-full sm:w-44 shrink-0">
            <FormField label={caretaker.report.filterLabel}>
              <SelectInput
                value={filter}
                onChange={(event) => setFilter(event.target.value as ReportFilter)}
                aria-label={caretaker.report.filterLabel}
                className="!min-h-12 text-body font-semibold"
              >
                <option value="all">{caretaker.report.filterAll}</option>
                <option value="present">{caretaker.report.filterPresent}</option>
                <option value="absent">{caretaker.report.filterAbsent}</option>
              </SelectInput>
            </FormField>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={caretaker.report.registered}
          value={children.length}
          icon={<Users size={22} className="text-primary" />}
        />
        <StatCard
          label={caretaker.report.present}
          value={presentCount}
          icon={<UserCheck size={22} className="text-success" />}
          variant="success"
        />
        <StatCard
          label={caretaker.report.absent}
          value={absentCount}
          icon={<UserX size={22} className="text-text-muted" />}
        />
        <StatCard
          label={caretaker.report.rate}
          value={`${rate}%`}
          icon={<TrendingUp size={22} className="text-secondary" />}
          variant={rate >= 70 ? 'success' : 'warning'}
        />
      </div>

      <Card padding="lg">
        <h3 className="text-subheading text-text mb-1">{caretaker.report.listTitle}</h3>
        <p className="text-body text-text-secondary mb-5">{formattedDate}</p>

        {reportRows.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={48} className="text-text-muted" strokeWidth={1.5} />}
            title={caretaker.report.noResults}
            description={caretaker.report.subtitle}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-caption font-semibold text-text-muted pb-3 pr-4">Umwana</th>
                    <th className="text-caption font-semibold text-text-muted pb-3 pr-4 hidden sm:table-cell">Umubyeyi</th>
                    <th className="text-caption font-semibold text-text-muted pb-3 pr-4 hidden md:table-cell">
                      {caretaker.children.dateRegistered}
                    </th>
                    <th className="text-caption font-semibold text-text-muted pb-3 pr-4">Imiterere</th>
                    <th className="text-caption font-semibold text-text-muted pb-3">Ibyakora</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.items.map(({ child, present, record }) => (
                    <tr key={child.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 text-body font-medium text-text">{child.fullName}</td>
                      <td className="py-3 pr-4 text-body text-text-secondary hidden sm:table-cell">
                        {child.guardianName}
                      </td>
                      <td className="py-3 pr-4 text-body text-text-secondary hidden md:table-cell">
                        {formatDate(child.registeredAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`text-caption font-semibold px-3 py-1 rounded-full ${
                            present ? 'bg-success-light text-success' : 'bg-background-subtle text-text-muted'
                          }`}
                        >
                          {present ? caretaker.report.presentStatus : caretaker.report.absentStatus}
                        </span>
                      </td>
                      <td className="py-3">
                        {present && record ? (
                          <Button
                            variant="tertiary"
                            size="sm"
                            icon={<Eye size={16} />}
                            onClick={() => setViewEntry({ child, record })}
                          >
                            {caretaker.attendance.view}
                          </Button>
                        ) : (
                          <span className="text-caption text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
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
              className="!mt-0"
            />
          </>
        )}
      </Card>

      <AttendanceViewSheet
        open={!!viewEntry}
        child={viewEntry?.child ?? null}
        record={viewEntry?.record ?? null}
        onClose={() => setViewEntry(null)}
      />
    </CaretakerLayout>
  )
}
