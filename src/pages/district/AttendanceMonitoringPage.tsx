import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, Eye, AlertTriangle, XCircle } from 'lucide-react'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { DistrictWorkspaceNav } from '@/layouts/district/DistrictWorkspaceNav'
import { DISTRICT_MONITORING_TABS } from '@/layouts/district/navigation'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField, SelectInput, TextInput } from '@/components/ui/FormField'
import { SearchInput } from '@/components/ui/SearchInput'
import { AttendanceSummaryCards } from '@/components/attendance/AttendanceSummaryCards'
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge'
import { useData } from '@/contexts/AppContext'
import { useAttendanceMonitoringView, roundPct } from '@/features/monitoring'
import { useDistrictCenterDayAttendanceRoster } from '@/features/district'
import { useMonitoringCentre } from '@/features/district/monitoring/useMonitoringCentre'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { ECD_CENTERS, formatDate } from '@/lib/mock-data'
import { getTodayDate, getYesterdayDate } from '@/lib/attendance-utils'
import {
  buildCenterChildDayRowsFromContext,
  buildSyntheticCenterChildDayRows,
  summarizeSubmissionStatuses,
  type CenterDailyAttendanceRow,
  type CenterSubmissionStatus,
} from '@/lib/district-attendance'
import { env } from '@/config/env'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import type { AttendanceDayStatus, AttendanceRecord, Child, EcdCenter } from '@/types'

type ChildStatusFilter = 'all' | AttendanceDayStatus

function deriveSubmissionStatus(
  enrolled: number,
  present: number,
  absent: number,
): CenterSubmissionStatus {
  const recorded = present + absent
  if (recorded <= 0) return 'missing'
  if (enrolled > 0 && recorded < enrolled) return 'partial'
  return 'submitted'
}

const SUBMISSION_VARIANT: Record<CenterSubmissionStatus, 'success' | 'danger' | 'warning'> = {
  submitted: 'success',
  missing: 'danger',
  partial: 'warning',
}

function SubmissionStatusBadge({ status }: { status: CenterSubmissionStatus }) {
  const label =
    status === 'submitted'
      ? district.attendanceMonitoring.statusSubmitted
      : status === 'missing'
        ? district.attendanceMonitoring.statusMissing
        : district.attendanceMonitoring.statusPartial

  return (
    <Badge variant={SUBMISSION_VARIANT[status]} aria-label={label}>
      {label}
    </Badge>
  )
}

export function DistrictAttendancePage() {
  if (env.isLive) {
    return <DistrictAttendancePageShared children={[]} attendance={[]} />
  }
  return <DistrictAttendancePageMock />
}

function DistrictAttendancePageMock() {
  const { children, attendance } = useData()
  return <DistrictAttendancePageShared children={children} attendance={attendance} />
}

function DistrictAttendancePageShared({
  children,
  attendance,
}: {
  children: Child[]
  attendance: AttendanceRecord[]
}) {
  const today = getTodayDate()
  const yesterday = getYesterdayDate()
  const { centreId: scopedCentreId, setCentreId: setScopedCentreId } = useMonitoringCentre()

  const [selectedDate, setSelectedDate] = useState(getTodayDate)
  const [centerId, setCenterId] = useState('all')
  const [statusFilter, setStatusFilter] = useState<CenterSubmissionStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(scopedCentreId)
  const [childStatusFilter, setChildStatusFilter] = useState<ChildStatusFilter>('all')
  const [liveDrillPage, setLiveDrillPage] = useState(1)

  useEffect(() => {
    setSelectedCenterId(scopedCentreId)
    setCenterId(scopedCentreId ?? 'all')
  }, [scopedCentreId])

  const monitoring = useAttendanceMonitoringView({
    selectedDate,
    centerId,
  })

  const liveRoster = useDistrictCenterDayAttendanceRoster(
    {
      centerId: selectedCenterId,
      date: selectedDate,
      page: liveDrillPage,
      pageSize: 50,
    },
    env.isLive && !!selectedCenterId,
  )

  const setDateCapped = (date: string) => {
    setSelectedDate(date > today ? today : date)
    setLiveDrillPage(1)
  }

  const closeCenter = () => {
    setSelectedCenterId(null)
    setScopedCentreId(null)
    setCenterId('all')
    setLiveDrillPage(1)
  }

  const allRows = useMemo((): CenterDailyAttendanceRow[] => {
    if (monitoring.source === 'mock' && monitoring.mockRows) {
      return monitoring.mockRows
    }
    // LIVE: map API items only — never enrich with ECD_CENTERS mock identities.
    return (monitoring.data?.items ?? []).map((item) => {
      const center: EcdCenter = {
        id: item.centerId,
        name: item.centerName,
        sector: '—',
        cell: '—',
        children: item.enrolledChildren,
        caretaker: '—',
        attendance: roundPct(item.rate),
        submittedToday: item.present + item.absent > 0,
        enrollmentChange: 0,
      }
      const status = deriveSubmissionStatus(item.enrolledChildren, item.present, item.absent)
      const unrecorded = Math.max(0, item.enrolledChildren - item.present - item.absent)
      return {
        center,
        status,
        rate: roundPct(item.rate),
        childrenCount: item.enrolledChildren,
        present: item.present,
        absent: item.absent,
        unrecorded,
      }
    })
  }, [monitoring.data?.items, monitoring.mockRows, monitoring.source])

  const centerFilterOptions = useMemo(() => {
    if (env.isLive) {
      return allRows.map((row) => ({
        id: row.center.id,
        name: row.center.name,
        sector: row.center.sector,
      }))
    }
    return ECD_CENTERS.map((c) => ({ id: c.id, name: c.name, sector: c.sector }))
  }, [allRows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allRows.filter((row) => {
      if (centerId !== 'all' && row.center.id !== centerId) return false
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (
        q &&
        !row.center.name.toLowerCase().includes(q) &&
        !row.center.sector.toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [allRows, centerId, statusFilter, search])

  const statusSummary = useMemo(() => summarizeSubmissionStatuses(filteredRows), [filteredRows])

  const pagination = usePagination(filteredRows, {
    resetDeps: [selectedDate, centerId, statusFilter, search],
  })

  const selectedRow = useMemo(
    () => allRows.find((row) => row.center.id === selectedCenterId) ?? null,
    [allRows, selectedCenterId],
  )

  const drillDown = useMemo(() => {
    if (!selectedRow) return null
    if (env.isLive) {
      if (!liveRoster.data) return null
      return { rows: liveRoster.data.rows, stats: liveRoster.data.stats }
    }
    const fromContext = buildCenterChildDayRowsFromContext(
      children,
      attendance,
      selectedRow.center.id,
      selectedDate,
    )
    if (fromContext) return fromContext
    return buildSyntheticCenterChildDayRows(selectedRow)
  }, [selectedRow, children, attendance, selectedDate, liveRoster.data])

  const drillRows = useMemo(() => {
    if (!drillDown) return []
    if (childStatusFilter === 'all') return drillDown.rows
    return drillDown.rows.filter((row) => row.status === childStatusFilter)
  }, [drillDown, childStatusFilter])

  const drillPagination = usePagination(drillRows, {
    resetDeps: [selectedCenterId, selectedDate, childStatusFilter],
  })

  const isToday = selectedDate === today
  const isYesterday = selectedDate === yesterday
  const isSynthetic = env.isMock && (drillDown?.rows.some((r) => r.isSynthetic) ?? false)
  const isLoading = monitoring.isLoading
  const liveDrillLoading = env.isLive && !!selectedRow && liveRoster.isLoading
  const liveDrillError = env.isLive && !!selectedRow && liveRoster.isError

  const openCenter = (row: CenterDailyAttendanceRow) => {
    setSelectedCenterId(row.center.id)
    setScopedCentreId(row.center.id)
    setChildStatusFilter('all')
    setLiveDrillPage(1)
  }

  return (
    <>
      <PageContainer>
        <PageHeader
          title={district.attendanceMonitoring.title}
          subtitle={district.attendanceMonitoring.subtitle}
        />
        <DistrictWorkspaceNav
          items={DISTRICT_MONITORING_TABS}
          ariaLabel={district.monitoringHub.title}
        />
        <PageContent>
      <Card padding="lg" className="mb-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1 min-w-0">
            <FormField label={district.attendanceMonitoring.dateLabel}>
              <TextInput
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => setDateCapped(e.target.value)}
                aria-label={district.attendanceMonitoring.dateLabel}
              />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={isToday ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setDateCapped(today)}
            >
              {common.today}
            </Button>
            <Button
              type="button"
              variant={isYesterday ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setDateCapped(yesterday)}
            >
              {district.attendanceMonitoring.yesterday}
            </Button>
          </div>
          <div className="w-full sm:w-52 shrink-0">
            <FormField label={district.attendanceMonitoring.statusLabel}>
              <SelectInput
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as CenterSubmissionStatus | 'all')
                }}
                aria-label={district.attendanceMonitoring.statusLabel}
                className="!min-h-12 text-body font-semibold"
              >
                <option value="all">{district.attendanceMonitoring.statusAll}</option>
                <option value="submitted">{district.attendanceMonitoring.statusSubmitted}</option>
                <option value="partial">{district.attendanceMonitoring.statusPartial}</option>
                <option value="missing">{district.attendanceMonitoring.statusMissing}</option>
              </SelectInput>
            </FormField>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label={district.attendanceMonitoring.searchLabel}>
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value)
              }}
              placeholder={district.attendanceMonitoring.searchPlaceholder}
            />
          </FormField>
          <FormField label={district.attendanceMonitoring.centerLabel}>
            <SelectInput
              value={centerId}
              onChange={(e) => {
                const value = e.target.value
                setCenterId(value)
                if (value === 'all') {
                  closeCenter()
                } else {
                  setSelectedCenterId(value)
                  setScopedCentreId(value)
                  setChildStatusFilter('all')
                  setLiveDrillPage(1)
                }
              }}
              aria-label={district.attendanceMonitoring.centerLabel}
              className="!min-h-12 text-body font-semibold"
            >
              <option value="all">{district.attendanceMonitoring.centerAll}</option>
              {centerFilterOptions.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name} — {center.sector}
                </option>
              ))}
            </SelectInput>
          </FormField>
        </div>
      </Card>

      <p className="text-body text-text-secondary mb-4">
        {district.attendanceMonitoring.overviewTitle} —{' '}
        <span className="font-semibold text-text">{formatDate(selectedDate)}</span>
      </p>

      {monitoring.isError ? (
        <div className="space-y-6">
          <LiveUnavailableState
            title={common.error}
            description="Ntibyashoboye kubona ubwitabire kuri API. Ongera ugerageze."
            action={
              <Button
                type="button"
                variant="primary"
                onClick={() => void monitoring.refetch?.()}
              >
                {common.reset}
              </Button>
            }
          />
        </div>
      ) : isLoading ? (
        <SkeletonPage label={district.attendanceMonitoring.loading} stats={3} />
      ) : selectedRow && liveDrillLoading ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="tertiary"
              size="md"
              icon={<ArrowLeft size={16} />}
              onClick={closeCenter}
            >
              {district.attendanceMonitoring.backToList}
            </Button>
            <div className="min-w-0">
              <h2 className="text-subheading text-text">{selectedRow.center.name}</h2>
              <p className="text-body text-text-secondary">
                {selectedRow.center.sector} · {formatDate(selectedDate)}
              </p>
            </div>
          </div>
          <SkeletonPage label={district.attendanceMonitoring.childrenList} stats={3} />
        </div>
      ) : selectedRow && liveDrillError ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="tertiary"
              size="md"
              icon={<ArrowLeft size={16} />}
              onClick={closeCenter}
            >
              {district.attendanceMonitoring.backToList}
            </Button>
            <div className="min-w-0">
              <h2 className="text-subheading text-text">{selectedRow.center.name}</h2>
              <p className="text-body text-text-secondary">
                {selectedRow.center.sector} · {formatDate(selectedDate)}
              </p>
            </div>
          </div>
          <LiveUnavailableState
            title={common.error}
            description="Ntibyashoboye kubona urutonde rw’abana kuri API. Ongera ugerageze."
            action={
              <Button type="button" variant="primary" onClick={() => void liveRoster.refetch()}>
                {common.reset}
              </Button>
            }
          />
        </div>
      ) : selectedRow && drillDown ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="tertiary"
              size="md"
              icon={<ArrowLeft size={16} />}
              onClick={closeCenter}
            >
              {district.attendanceMonitoring.backToList}
            </Button>
            <div className="min-w-0">
              <h2 className="text-subheading text-text">{selectedRow.center.name}</h2>
              <p className="text-body text-text-secondary">
                {selectedRow.center.sector} · {formatDate(selectedDate)} ·{' '}
                <SubmissionStatusBadge status={selectedRow.status} />
              </p>
            </div>
          </div>

          <AttendanceSummaryCards
            stats={drillDown.stats}
            showLate={false}
            labels={{
              total: district.attendanceMonitoring.childrenCount,
              present: district.attendanceMonitoring.present,
              absent: district.attendanceMonitoring.absent,
              rate: district.attendanceMonitoring.attendanceRate,
            }}
          />

          {isSynthetic && (
            <p className="text-caption text-text-muted">{district.attendanceMonitoring.syntheticNote}</p>
          )}

          <Card padding="lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
              <h3 className="text-subheading text-text">{district.attendanceMonitoring.childrenList}</h3>
              <div className="w-full sm:w-48">
                <FormField label={district.attendanceMonitoring.filterChildStatus}>
                  <SelectInput
                    value={childStatusFilter}
                    onChange={(e) => setChildStatusFilter(e.target.value as ChildStatusFilter)}
                    aria-label={district.attendanceMonitoring.filterChildStatus}
                    className="!min-h-11 text-body font-semibold"
                  >
                    <option value="all">{district.attendanceMonitoring.filterChildAll}</option>
                    <option value="present">{district.attendanceMonitoring.present}</option>
                    <option value="absent">{district.attendanceMonitoring.absent}</option>
                    <option value="unrecorded">{district.attendanceMonitoring.unrecorded}</option>
                  </SelectInput>
                </FormField>
              </div>
            </div>

            {drillRows.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={48} className="text-text-muted" strokeWidth={1.5} />}
                title={district.attendanceMonitoring.emptyChildren}
                description={district.attendanceMonitoring.emptyChildrenDesc}
              />
            ) : (
              <>
                <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-0 text-left responsive-table-cards">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {district.attendanceMonitoring.childName}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3">
                          {district.attendanceMonitoring.childStatus}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(env.isLive ? drillRows : drillPagination.items).map((row) => (
                        <tr key={row.id} className="border-b border-border last:border-0">
                          <td
                            className="py-3 pr-4 text-body font-medium text-text"
                            data-label={district.attendanceMonitoring.childName}
                          >
                            {row.fullName}
                            {row.guardianName && (
                              <span className="block text-caption text-text-secondary font-normal">
                                {row.guardianName}
                              </span>
                            )}
                          </td>
                          <td
                            className="py-3"
                            data-label={district.attendanceMonitoring.childStatus}
                          >
                            <AttendanceStatusBadge status={row.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {env.isLive && liveRoster.data ? (
                  <Pagination
                    page={liveRoster.data.childrenPage}
                    pageSize={liveRoster.data.childrenPageSize}
                    total={liveRoster.data.childrenTotal}
                    totalPages={liveRoster.data.childrenTotalPages}
                    startIndex={
                      (liveRoster.data.childrenPage - 1) * liveRoster.data.childrenPageSize + 1
                    }
                    endIndex={Math.min(
                      liveRoster.data.childrenPage * liveRoster.data.childrenPageSize,
                      liveRoster.data.childrenTotal,
                    )}
                    hasPrevious={liveRoster.data.childrenPage > 1}
                    hasNext={liveRoster.data.childrenPage < liveRoster.data.childrenTotalPages}
                    onPageChange={setLiveDrillPage}
                    onPageSizeChange={() => undefined}
                    className="!mt-0"
                  />
                ) : (
                  <Pagination
                    page={drillPagination.page}
                    pageSize={drillPagination.pageSize}
                    total={drillPagination.total}
                    totalPages={drillPagination.totalPages}
                    startIndex={drillPagination.startIndex}
                    endIndex={drillPagination.endIndex}
                    hasPrevious={drillPagination.hasPrevious}
                    hasNext={drillPagination.hasNext}
                    onPageChange={drillPagination.setPage}
                    onPageSizeChange={drillPagination.setPageSize}
                    className="!mt-0"
                  />
                )}
              </>
            )}
          </Card>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              label={district.attendanceMonitoring.submittedCount}
              value={statusSummary.submitted}
              icon={<CheckCircle2 size={22} className="text-success" />}
              variant="success"
            />
            <StatCard
              label={district.attendanceMonitoring.partialCount}
              value={statusSummary.partial}
              icon={<AlertTriangle size={22} className="text-warning" />}
              variant="warning"
            />
            <StatCard
              label={district.attendanceMonitoring.missingCount}
              value={statusSummary.missing}
              icon={<XCircle size={22} className="text-error" />}
            />
          </div>

          <Card padding="lg">
            <h3 className="text-subheading text-text mb-1">{district.attendanceMonitoring.overviewTitle}</h3>
            <p className="text-body text-text-secondary mb-5">{formatDate(selectedDate)}</p>

            {filteredRows.length === 0 ? (
              <EmptyState
                icon={<Building2 size={48} className="text-text-muted" strokeWidth={1.5} />}
                title={district.attendanceMonitoring.emptyCenters}
                description={district.attendanceMonitoring.emptyCentersDesc}
              />
            ) : (
              <>
                <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-0 text-left responsive-table-cards">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {district.attendanceMonitoring.centerName}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {district.attendanceMonitoring.childrenCount}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {district.attendanceMonitoring.submissionStatus}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {district.attendanceMonitoring.attendanceRate}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3">
                          {common.labels.actions}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.items.map((row) => (
                        <tr key={row.center.id} className="border-b border-border last:border-0">
                          <td
                            className="py-3 pr-4 text-body font-medium text-text"
                            data-label={district.attendanceMonitoring.centerName}
                          >
                            {row.center.name}
                            <span className="block text-caption text-text-secondary font-normal">
                              {row.center.sector}
                            </span>
                          </td>
                          <td
                            className="py-3 pr-4 text-body text-text-secondary"
                            data-label={district.attendanceMonitoring.childrenCount}
                          >
                            {row.childrenCount}
                          </td>
                          <td
                            className="py-3 pr-4"
                            data-label={district.attendanceMonitoring.submissionStatus}
                          >
                            <SubmissionStatusBadge status={row.status} />
                          </td>
                          <td
                            className="py-3 pr-4 text-body font-semibold"
                            data-label={district.attendanceMonitoring.attendanceRate}
                          >
                            <span className={row.rate < 70 ? 'text-warning' : 'text-success'}>
                              {row.rate}%
                            </span>
                          </td>
                          <td className="py-3 td-actions" data-label="">
                            <Button
                              variant="tertiary"
                              size="sm"
                              icon={<Eye size={16} />}
                              onClick={() => openCenter(row)}
                            >
                              {district.attendanceMonitoring.viewDetails}
                            </Button>
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
        </>
      )}
        </PageContent>
      </PageContainer>
    </>
  )
}
