import { useEffect, useMemo, useState } from 'react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { AttendanceViewSheet } from '@/components/attendance/AttendanceViewSheet'
import { AttendanceSummaryCards } from '@/components/attendance/AttendanceSummaryCards'
import { AttendanceHistoryTable } from '@/components/attendance/AttendanceHistoryTable'
import {
  AttendanceFilters,
  type ReportStatusFilter,
} from '@/components/attendance/AttendanceFilters'
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge'
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { caretaker } from '@/locales/rw/caretaker'
import { common, messages } from '@/locales/rw/common'
import { formatDate } from '@/lib/mock-data'
import {
  clampDateRange,
  computeAttendanceSummary,
  computeRecordsSummary,
  filterAttendanceByRange,
  filterRecordsByChildSearch,
  filterRecordsByStatus,
  formatArrivalTime,
  getAbsentReasonLabel,
  getDayStatus,
  getRecordForDate,
  getTodayDate,
  getYesterdayDate,
} from '@/lib/attendance-utils'
import { CalendarDays, Eye } from 'lucide-react'
import type { AttendanceRecord, Child } from '@/types'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'

const PREVIEW_ROW_LIMIT = 8

function statusFilterLabel(filter: ReportStatusFilter): string {
  switch (filter) {
    case 'present':
      return caretaker.report.filterPresent
    case 'absent':
      return caretaker.report.filterAbsent
    case 'unrecorded':
      return caretaker.report.filterUnrecorded
    default:
      return caretaker.report.filterAll
  }
}

/**
 * Caretaker attendance report — child-level operational rows.
 *
 * Intentionally uses `useData()` attendance/children (Priority 3), not district
 * /reports/* or /monitoring/* aggregates. District ReportsPage owns aggregate reports.
 */
export function AttendanceReportPage() {
  const { children, attendance } = useData()
  const { showSuccess, showError } = useToast()
  const [viewEntry, setViewEntry] = useState<{ child: Child; record: AttendanceRecord } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState(getTodayDate)
  const [dateTo, setDateTo] = useState(getTodayDate)
  const [filter, setFilter] = useState<ReportStatusFilter>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const today = getTodayDate()
  const yesterday = getYesterdayDate()
  const isSingleDay = dateFrom === dateTo
  const selectedDate = dateTo
  const isToday = isSingleDay && selectedDate === today
  const isYesterday = isSingleDay && selectedDate === yesterday

  useEffect(() => {
    if (!isSingleDay && filter === 'unrecorded') {
      setFilter('all')
    }
  }, [isSingleDay, filter])

  useEffect(() => {
    setIsLoading(true)
    const timer = window.setTimeout(() => setIsLoading(false), 280)
    return () => window.clearTimeout(timer)
  }, [dateFrom, dateTo, filter, search])

  const childrenById = useMemo(() => new Map(children.map((child) => [child.id, child])), [children])

  const activeChildren = useMemo(
    () => children.filter((child) => child.status === 'active'),
    [children],
  )

  const applyRange = (from: string, to: string) => {
    const next = clampDateRange(from, to, today)
    setDateFrom(next.from)
    setDateTo(next.to)
  }

  const setSingleDate = (date: string) => {
    const capped = date > today ? today : date
    setDateFrom(capped)
    setDateTo(capped)
  }

  const rangeRecords = useMemo(() => {
    let records = filterAttendanceByRange(attendance, dateFrom, dateTo)
    records = filterRecordsByChildSearch(records, children, search)
    if (filter !== 'unrecorded') {
      records = filterRecordsByStatus(records, filter)
    }
    return records
  }, [attendance, dateFrom, dateTo, children, search, filter])

  const summary = useMemo(() => {
    if (isSingleDay) {
      return computeAttendanceSummary(activeChildren, attendance, selectedDate)
    }
    return computeRecordsSummary(rangeRecords, { includeLate: false })
  }, [isSingleDay, activeChildren, attendance, selectedDate, rangeRecords])

  const reportRows = useMemo(() => {
    if (!isSingleDay) return []
    const q = search.trim().toLowerCase()
    return activeChildren
      .map((child) => {
        const status = getDayStatus(attendance, child.id, selectedDate)
        const record = getRecordForDate(attendance, child.id, selectedDate)
        return { child, status, record }
      })
      .filter((row) => {
        if (
          q &&
          !row.child.fullName.toLowerCase().includes(q) &&
          !row.child.guardianName.toLowerCase().includes(q)
        ) {
          return false
        }
        if (filter === 'all') return true
        return row.status === filter
      })
  }, [isSingleDay, activeChildren, attendance, selectedDate, filter, search])

  const pagination = usePagination(reportRows, {
    resetDeps: [selectedDate, filter, search, dateFrom, dateTo],
  })

  const rangeLabel =
    isSingleDay
      ? formatDate(selectedDate)
      : `${formatDate(dateFrom)} – ${formatDate(dateTo)}`

  const summaryLabels = isSingleDay
    ? {
        total: caretaker.report.registered,
        present: caretaker.report.present,
        absent: caretaker.report.absent,
        rate: caretaker.report.rate,
      }
    : {
        total: caretaker.report.totalRecords,
        present: caretaker.report.present,
        absent: caretaker.report.absent,
        rate: caretaker.report.rate,
      }

  const previewFilters = useMemo(() => {
    const items: { label: string; value: string }[] = [
      { label: caretaker.report.filterLabel, value: statusFilterLabel(filter) },
    ]
    const q = search.trim()
    if (q) {
      items.push({ label: caretaker.report.searchLabel, value: q })
    }
    return items
  }, [filter, search])

  const previewRows = reportRows.slice(0, PREVIEW_ROW_LIMIT)
  const previewRecords = rangeRecords.slice(0, PREVIEW_ROW_LIMIT)

  const handleMockExport = (format: 'PDF' | 'Excel') => {
    if (env.isLive) {
      showError(messages.liveExportUnavailable)
      return
    }
    showSuccess(
      `${common.reportPreview.exportStarted} (${caretaker.report.title} — ${format})`,
    )
    setPreviewOpen(false)
  }

  return (
    <CaretakerLayout>
      <PageContainer>
        <PageHeader
          title={caretaker.report.title}
          description={
            <>
              {caretaker.report.subtitle} — <span className="font-semibold text-text">{rangeLabel}</span>
              {isToday && (
                <span className="ml-2 inline-flex items-center rounded-full bg-primary-light px-2.5 py-0.5 text-caption font-semibold text-primary">
                  {common.today}
                </span>
              )}
              {isYesterday && (
                <span className="ml-2 inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-caption font-semibold text-text-secondary">
                  {caretaker.report.yesterday}
                </span>
              )}
            </>
          }
        />

        <PageContent>
      <AttendanceFilters
        selectedDate={selectedDate}
        maxDate={today}
        statusFilter={filter}
        search={search}
        dateFrom={dateFrom}
        dateTo={dateTo}
        isToday={isToday}
        isYesterday={isYesterday}
        hideUnrecorded={!isSingleDay}
        onDateChange={setSingleDate}
        onDateFromChange={(from) => applyRange(from, dateTo)}
        onDateToChange={(to) => applyRange(dateFrom, to)}
        onStatusChange={(status) => {
          if (!isSingleDay && status === 'unrecorded') {
            setFilter('all')
            return
          }
          setFilter(status)
        }}
        onSearchChange={setSearch}
        onSelectToday={() => setSingleDate(today)}
        onSelectYesterday={() => setSingleDate(yesterday)}
        onPreviewExport={() => setPreviewOpen(true)}
      />

      {isLoading ? (
        <SkeletonPage label={caretaker.report.loading} />
      ) : (
        <>
          <AttendanceSummaryCards
            stats={summary}
            showLate={isSingleDay}
            className="mb-8"
            labels={summaryLabels}
          />

          {isSingleDay ? (
            <Card padding="lg">
              <h3 className="text-subheading text-text mb-1">{caretaker.report.listTitle}</h3>
              <p className="text-body text-text-secondary mb-5">{rangeLabel}</p>

              {reportRows.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays size={48} className="text-text-muted" strokeWidth={1.5} />}
                  title={caretaker.report.noResults}
                  description={caretaker.report.subtitle}
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
                            {common.labels.parent}
                          </th>
                          <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                            {common.labels.status}
                          </th>
                          <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                            {caretaker.attendance.arrivalTime}
                          </th>
                          <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                            {caretaker.report.reason}
                          </th>
                          <th className="text-caption font-semibold text-text-muted pb-3">
                            {common.labels.actions}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagination.items.map(({ child, status, record }) => (
                          <tr key={child.id} className="border-b border-border last:border-0">
                            <td
                              className="py-3 pr-4 text-body font-medium text-text"
                              data-label={common.labels.child}
                            >
                              {child.fullName}
                            </td>
                            <td
                              className="py-3 pr-4 text-body text-text-secondary"
                              data-label={common.labels.parent}
                            >
                              {child.guardianName}
                            </td>
                            <td className="py-3 pr-4" data-label={common.labels.status}>
                              <AttendanceStatusBadge status={status} />
                            </td>
                            <td
                              className="py-3 pr-4 text-body font-mono text-text-secondary"
                              data-label={caretaker.attendance.arrivalTime}
                            >
                              {status === 'present' ? formatArrivalTime(record?.arrivedAt) : '—'}
                            </td>
                            <td
                              className="py-3 pr-4 text-body text-text-secondary"
                              data-label={caretaker.report.reason}
                            >
                              {status === 'absent' ? getAbsentReasonLabel(record?.absentReason) : '—'}
                            </td>
                            <td className="py-3 td-actions" data-label="">
                              {record ? (
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
          ) : (
            <AttendanceHistoryTable
              records={rangeRecords}
              childrenById={childrenById}
              showChildName
              title={caretaker.report.historyTitle}
              emptyMessage={caretaker.report.noRecords}
              emptyDescription={caretaker.report.noRecordsDesc}
              resetDeps={[dateFrom, dateTo, filter, search]}
            />
          )}
        </>
      )}

      <AttendanceViewSheet
        open={!!viewEntry}
        child={viewEntry?.child ?? null}
        record={viewEntry?.record ?? null}
        onClose={() => setViewEntry(null)}
      />

      <ReportPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        reportTitle={caretaker.report.title}
        dateRangeLabel={rangeLabel}
        filters={previewFilters}
        summary={summary}
        summaryLabels={summaryLabels}
        showLate={isSingleDay}
        exportMockNote={env.isLive ? common.live.exportUnavailable : caretaker.report.exportMock}
        exportDisabled={env.isLive}
        onExportPdf={() => handleMockExport('PDF')}
        onExportExcel={() => handleMockExport('Excel')}
        tablePreview={
          isSingleDay ? (
            reportRows.length === 0 ? (
              <p className="text-body text-text-secondary">{common.reportPreview.emptyPreview}</p>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-0 text-left responsive-table-cards">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {common.labels.child}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {common.labels.parent}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {common.labels.status}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3">
                          {caretaker.attendance.arrivalTime}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map(({ child, status, record }) => (
                        <tr key={child.id} className="border-b border-border last:border-0">
                          <td
                            className="py-3 pr-4 text-body font-medium text-text"
                            data-label={common.labels.child}
                          >
                            {child.fullName}
                          </td>
                          <td
                            className="py-3 pr-4 text-body text-text-secondary"
                            data-label={common.labels.parent}
                          >
                            {child.guardianName}
                          </td>
                          <td className="py-3 pr-4" data-label={common.labels.status}>
                            <AttendanceStatusBadge status={status} />
                          </td>
                          <td
                            className="py-3 text-body font-mono text-text-secondary"
                            data-label={caretaker.attendance.arrivalTime}
                          >
                            {status === 'present' ? formatArrivalTime(record?.arrivedAt) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-caption text-text-muted">
                  {common.reportPreview.previewRows
                    .replace('{count}', String(previewRows.length))
                    .replace('{total}', String(reportRows.length))}
                </p>
              </div>
            )
          ) : previewRecords.length === 0 ? (
            <p className="text-body text-text-secondary">{common.reportPreview.emptyPreview}</p>
          ) : (
            <div className="space-y-3">
              <AttendanceHistoryTable
                records={previewRecords}
                childrenById={childrenById}
                showChildName
                title={caretaker.report.historyTitle}
                emptyMessage={caretaker.report.noRecords}
                resetDeps={[dateFrom, dateTo, filter, search, previewOpen]}
              />
              <p className="text-caption text-text-muted">
                {common.reportPreview.previewRows
                  .replace('{count}', String(previewRecords.length))
                  .replace('{total}', String(rangeRecords.length))}
              </p>
            </div>
          )
        }
      />
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}
