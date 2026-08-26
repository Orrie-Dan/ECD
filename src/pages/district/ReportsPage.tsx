import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Download,
  Eye,
  FileText,
} from 'lucide-react'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { FormField, SelectInput, TextInput } from '@/components/ui/FormField'
import { SearchInput } from '@/components/ui/SearchInput'
import { AttendanceSummaryCards } from '@/components/attendance/AttendanceSummaryCards'
import { AttendanceHistoryTable } from '@/components/attendance/AttendanceHistoryTable'
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal'
import { useData } from '@/contexts/AppContext'
import { env } from '@/config/env'
import {
  useDistrictAttendanceReport,
  useExcelExport,
  useReportPreviewData,
  roundPct,
} from '@/features/reporting'
import {
  buildDistrictReportWorkbook,
  districtExcelExportAvailable,
  districtExcelFilenamePrefix,
  districtKindHasExportData,
} from '@/features/reporting/exporters'
import { buildExcelFilename } from '@/lib/export'
import type { ReportPreviewKind } from '@/models/reporting'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { ECD_CENTERS, formatDate } from '@/lib/mock-data'
import {
  clampDateRange,
  filterAttendanceByRange,
  getTodayDate,
  getYesterdayDate,
} from '@/lib/attendance-utils'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { caretaker } from '@/locales/rw/caretaker'

const otherReports: {
  key: ReportPreviewKind
  title: string
  description: string
  accent: 'blue' | 'amber' | 'teal' | 'green'
}[] = [
  {
    key: 'enrollment',
    title: district.reports.enrollment,
    description: district.reports.enrollmentDesc,
    accent: 'blue',
  },
  {
    key: 'dropouts',
    title: district.reports.dropouts,
    description: district.reports.dropoutsDesc,
    accent: 'amber',
  },
  {
    key: 'centers',
    title: district.reports.centers,
    description: district.reports.centersDesc,
    accent: 'teal',
  },
  {
    key: 'sectors',
    title: district.reports.sectors,
    description: district.reports.sectorsDesc,
    accent: 'green',
  },
  {
    key: 'nutritionCoverage',
    title: district.reports.nutritionCoverage,
    description: district.reports.nutritionCoverageDesc,
    accent: 'teal',
  },
  {
    key: 'nutritionStatus',
    title: district.reports.nutritionStatus,
    description: district.reports.nutritionStatusDesc,
    accent: 'amber',
  },
  {
    key: 'nutritionCenters',
    title: district.reports.nutritionCenters,
    description: district.reports.nutritionCentersDesc,
    accent: 'blue',
  },
  {
    key: 'nutritionTrends',
    title: district.reports.nutritionTrends,
    description: district.reports.nutritionTrendsDesc,
    accent: 'green',
  },
]

const accentStyles = {
  green: 'bg-primary-light text-primary',
  blue: 'bg-secondary-light text-secondary',
  teal: 'bg-success-light text-success',
  amber: 'bg-accent-light text-accent',
}

export function DistrictReportsPage() {
  if (env.isLive) {
    return <DistrictReportsPageShared children={[]} attendance={[]} />
  }
  return <DistrictReportsPageMock />
}

function DistrictReportsPageMock() {
  const { children, attendance } = useData()
  return <DistrictReportsPageShared children={children} attendance={attendance} />
}

function DistrictReportsPageShared({
  children,
  attendance,
}: {
  children: import('@/types').Child[]
  attendance: import('@/types').AttendanceRecord[]
}) {
  const { exporting, exportWorkbook, notifyPdfUnavailable } = useExcelExport()
  const today = getTodayDate()
  const yesterday = getYesterdayDate()

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(getTodayDate)
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('all')
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null)
  const [previewReport, setPreviewReport] = useState<{
    key: ReportPreviewKind
    title: string
    description?: string
  } | null>(null)
  const [excelKind, setExcelKind] = useState<ReportPreviewKind | null>(null)
  const pendingExcelRef = useRef<{ kind: ReportPreviewKind; title: string } | null>(null)

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

  // LIVE: never invent sector options from ECD_CENTERS. MOCK keeps mock geography.
  const sectors = useMemo(() => {
    if (env.isLive) return [] as string[]
    return [...new Set(ECD_CENTERS.map((c) => c.sector))].sort((a, b) => a.localeCompare(b, 'rw'))
  }, [])

  const effectiveSector = env.isLive ? 'all' : sector

  const attendanceReport = useDistrictAttendanceReport({
    dateFrom,
    dateTo,
    sector: effectiveSector,
    search,
  })

  const previewData = useReportPreviewData({
    kind: previewReport?.key ?? excelKind,
    dateFrom,
    dateTo,
  })

  const comparisonRows = attendanceReport.rows
  const districtSummary = attendanceReport.summary
  const isLoading = attendanceReport.isLoading
  const isError = attendanceReport.isError
  const refetch = attendanceReport.refetch

  const pagination = usePagination(comparisonRows, {
    resetDeps: [dateFrom, dateTo, search, sector],
  })

  const selectedRow = useMemo(
    () => comparisonRows.find((row) => row.centerId === selectedCenterId) ?? null,
    [comparisonRows, selectedCenterId],
  )

  const centerChildren = useMemo(() => {
    if (!selectedCenterId) return []
    return children.filter((child) => child.centerId === selectedCenterId && child.status === 'active')
  }, [children, selectedCenterId])

  const childrenById = useMemo(
    () => new Map(centerChildren.map((child) => [child.id, child])),
    [centerChildren],
  )

  const centerRecords = useMemo(() => {
    if (!selectedCenterId) return []
    const ids = new Set(centerChildren.map((child) => child.id))
    return filterAttendanceByRange(attendance, dateFrom, dateTo, ids)
  }, [selectedCenterId, centerChildren, attendance, dateFrom, dateTo])

  const rangeLabel =
    dateFrom === dateTo
      ? formatDate(dateFrom)
      : `${formatDate(dateFrom)} – ${formatDate(dateTo)}`

  const isToday = dateFrom === today && dateTo === today
  const isYesterday = dateFrom === yesterday && dateTo === yesterday

  const previewFilters = useMemo(() => {
    const items: { label: string; value: string }[] = [
      {
        label: district.reports.filterSector,
        value: sector === 'all' ? district.reports.allSectors : sector,
      },
    ]
    const q = search.trim()
    if (q) {
      items.push({ label: district.reports.searchLabel, value: q })
    }
    return items
  }, [sector, search])

  const previewComparisonRows = comparisonRows.slice(0, 8)

  const runDistrictExcel = useCallback(
    (kind: ReportPreviewKind, title: string) => {
      const spec = buildDistrictReportWorkbook({
        kind,
        title,
        dateFrom,
        dateTo,
        isMock: !env.isLive,
        filters: previewFilters,
        attendance: {
          summary: districtSummary,
          rows: comparisonRows,
        },
        enrollment: previewData.enrollment,
        dropouts: previewData.dropouts,
        centers: previewData.centers,
        nutrition: previewData.nutrition,
      })
      void exportWorkbook(
        spec,
        buildExcelFilename([districtExcelFilenamePrefix(kind), 'akarere', dateFrom, dateTo]),
      )
    },
    [
      comparisonRows,
      dateFrom,
      dateTo,
      districtSummary,
      exportWorkbook,
      previewData.centers,
      previewData.dropouts,
      previewData.enrollment,
      previewData.nutrition,
      previewFilters,
    ],
  )

  const excelAvailable =
    !!previewReport &&
    districtKindHasExportData({
      kind: previewReport.key,
      loading: previewData.isLoading,
      enrollment: previewData.enrollment,
      dropouts: previewData.dropouts,
      centers: previewData.centers,
      nutrition: previewData.nutrition,
    })

  const requestDistrictExcel = (kind: ReportPreviewKind, title: string) => {
    if (!districtExcelExportAvailable(kind)) {
      setPreviewReport({ key: kind, title })
      return
    }
    const ready = districtKindHasExportData({
      kind,
      loading: previewData.isLoading && excelKind === kind,
      enrollment: previewData.enrollment,
      dropouts: previewData.dropouts,
      centers: previewData.centers,
      nutrition: previewData.nutrition,
    })
    if (kind === 'attendance' || ready) {
      runDistrictExcel(kind, title)
      return
    }
    pendingExcelRef.current = { kind, title }
    setExcelKind(kind)
  }

  useEffect(() => {
    const pending = pendingExcelRef.current
    if (!pending || pending.kind !== excelKind || previewData.isLoading) return
    const hasData = districtKindHasExportData({
      kind: pending.kind,
      loading: false,
      enrollment: previewData.enrollment,
      dropouts: previewData.dropouts,
      centers: previewData.centers,
      nutrition: previewData.nutrition,
    })
    pendingExcelRef.current = null
    setExcelKind(null)
    if (hasData) {
      runDistrictExcel(pending.kind, pending.title)
      return
    }
    setPreviewReport({ key: pending.kind, title: pending.title })
  }, [
    excelKind,
    previewData.centers,
    previewData.dropouts,
    previewData.enrollment,
    previewData.isLoading,
    previewData.nutrition,
    runDistrictExcel,
  ])

  const handleExportExcel = () => {
    if (!previewReport || !excelAvailable) return
    runDistrictExcel(previewReport.key, previewReport.title)
  }

  const excelBusy = exporting || !!excelKind

  const openAttendancePreview = () => {
    setPreviewReport({
      key: 'attendance',
      title: district.reports.attendance,
      description: district.reports.attendanceDesc,
    })
  }

  const openCenterDetails = (centerId: string) => {
    setSelectedCenterId(centerId)
  }

  const selectedSummary = selectedRow
    ? {
        total: selectedRow.totalRecords,
        present: selectedRow.present,
        absent: selectedRow.absent,
        unrecorded: 0,
        rate: selectedRow.rate,
        lateArrivals: null as number | null,
      }
    : null

  const renderOtherPreview = () => {
    const key = previewReport?.key
    if (!key || key === 'attendance') return null

    if (key === 'sectors') {
      return (
        <div className="rounded-xl border border-border bg-background-subtle/40 p-4 space-y-2">
          <p className="text-body text-text-secondary">{previewReport?.description}</p>
          <p className="text-body text-text-muted">{district.reports.otherPreviewHint}</p>
          <p className="text-caption text-warning">
            {district.reports.sectorsUnavailable}
          </p>
        </div>
      )
    }

    if (previewData.isLoading) {
      return <p className="text-body text-text-secondary">{common.loading}</p>
    }

    if (key === 'enrollment' && previewData.enrollment) {
      const s = previewData.enrollment.summary
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card padding="md"><p className="text-caption text-text-muted">{district.reports.previewActive}</p><p className="text-subheading">{s.active}</p></Card>
            <Card padding="md"><p className="text-caption text-text-muted">{district.reports.previewNew}</p><p className="text-subheading">{s.newRegistrations}</p></Card>
            <Card padding="md"><p className="text-caption text-text-muted">{district.reports.previewArchived}</p><p className="text-subheading">{s.archived}</p></Card>
          </div>
        </div>
      )
    }

    if (key === 'dropouts' && previewData.dropouts) {
      const s = previewData.dropouts.summary
      const items = previewData.dropouts.items.slice(0, 8)
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card padding="md"><p className="text-caption text-text-muted">{district.reports.previewDropouts}</p><p className="text-subheading">{s.dropouts}</p></Card>
          </div>
          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left responsive-table-cards">
                <thead>
                  <tr className="border-b border-border text-caption text-text-muted">
                    <th className="pb-2 pr-3">{district.reports.previewChild}</th>
                    <th className="pb-2">{district.reports.previewCenter}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.childId} className="border-b border-border/60">
                      <td className="py-2 pr-3 text-body" data-label={district.reports.previewChild}>{item.childName}</td>
                      <td className="py-2 text-body" data-label={district.reports.previewCenter}>{item.centerName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )
    }

    if (key === 'centers' && previewData.centers) {
      const items = previewData.centers.items.slice(0, 8)
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left responsive-table-cards">
            <thead>
              <tr className="border-b border-border text-caption text-text-muted">
                <th className="pb-2 pr-3">{district.reports.previewCenter}</th>
                <th className="pb-2 pr-3">{district.reports.previewChildren}</th>
                <th className="pb-2">{district.reports.previewRate}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.centerId} className="border-b border-border/60">
                  <td className="py-2 pr-3 text-body" data-label={district.reports.previewCenter}>{item.centerName}</td>
                  <td className="py-2 pr-3 text-body" data-label={district.reports.previewChildren}>{item.enrolledChildren}</td>
                  <td className="py-2 text-body" data-label={district.reports.previewRate}>{roundPct(item.attendance.rate)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (
      (key === 'nutritionCoverage' ||
        key === 'nutritionStatus' ||
        key === 'nutritionCenters' ||
        key === 'nutritionTrends') &&
      previewData.nutrition
    ) {
      const s = previewData.nutrition.summary
      const items = previewData.nutrition.items.slice(0, 8)
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card padding="md"><p className="text-caption text-text-muted">{district.reports.previewCoverage}</p><p className="text-subheading">{roundPct(s.screeningCoverage)}%</p></Card>
            <Card padding="md"><p className="text-caption text-text-muted">{district.reports.previewScreenings}</p><p className="text-subheading">{s.screenings}</p></Card>
            <Card padding="md"><p className="text-caption text-text-muted">{district.reports.previewSevere}</p><p className="text-subheading">{s.severe}</p></Card>
            <Card padding="md"><p className="text-caption text-text-muted">{district.reports.previewOverdue}</p><p className="text-subheading">{s.overdueScreenings}</p></Card>
          </div>
          {key === 'nutritionCenters' && items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left responsive-table-cards">
                <thead>
                  <tr className="border-b border-border text-caption text-text-muted">
                    <th className="pb-2 pr-3">{district.reports.previewCenter}</th>
                    <th className="pb-2 pr-3">{district.reports.previewScreenings}</th>
                    <th className="pb-2">{district.reports.previewSevere}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.centerId} className="border-b border-border/60">
                      <td className="py-2 pr-3 text-body" data-label={district.reports.previewCenter}>{item.centerName}</td>
                      <td className="py-2 pr-3 text-body" data-label={district.reports.previewScreenings}>{item.screenings}</td>
                      <td className="py-2 text-body" data-label={district.reports.previewSevere}>{item.severe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="rounded-xl border border-border bg-background-subtle/40 p-4 space-y-2">
        <p className="text-body text-text-secondary">{previewReport?.description}</p>
        <p className="text-body text-text-muted">{district.reports.otherPreviewHint}</p>
      </div>
    )
  }

  return (
    <>
      <PageContainer>
        <PageHeader
          title={district.reports.title}
          subtitle={district.reports.attendanceSubtitle}
          action={
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<Download size={18} />}
              onClick={() => requestDistrictExcel('attendance', district.reports.attendance)}
              loading={excelBusy}
              fullWidth
              className="sm:w-auto"
            >
              {common.reportPreview.exportExcel}
            </Button>
          }
        />
        <PageContent>
      <Card padding="lg" className="mb-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1 min-w-0">
            <FormField label={common.labels.date}>
              <TextInput
                type="date"
                value={dateTo}
                max={today}
                onChange={(e) => setSingleDate(e.target.value)}
                aria-label={common.labels.date}
              />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={isToday ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setSingleDate(today)}
            >
              {common.today}
            </Button>
            <Button
              type="button"
              variant={isYesterday ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setSingleDate(yesterday)}
            >
              {district.attendanceMonitoring.yesterday}
            </Button>
          </div>
          <div className="w-full sm:w-52 shrink-0">
            <FormField
              label={district.reports.filterSector}
              hint={env.isLive ? common.live.sectorFilterUnavailable : undefined}
            >
              <SelectInput
                value={env.isLive ? 'all' : sector}
                onChange={(e) => {
                  setSector(e.target.value)
                  setSelectedCenterId(null)
                }}
                aria-label={district.reports.filterSector}
                className="!min-h-12 text-body font-semibold"
                disabled={env.isLive}
              >
                <option value="all">{district.reports.allSectors}</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label={district.reports.searchLabel}>
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value)
                setSelectedCenterId(null)
              }}
              placeholder={district.reports.searchLabel}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={district.reports.dateFrom}>
              <TextInput
                type="date"
                value={dateFrom}
                max={today}
                onChange={(e) => applyRange(e.target.value, dateTo)}
              />
            </FormField>
            <FormField label={district.reports.dateTo}>
              <TextInput
                type="date"
                value={dateTo}
                max={today}
                onChange={(e) => applyRange(dateFrom, e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<Download size={18} />}
            onClick={() => requestDistrictExcel('attendance', district.reports.attendance)}
            loading={excelBusy}
          >
            {common.reportPreview.exportExcel}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={openAttendancePreview}
            disabled={excelBusy}
          >
            {district.reports.exportPreview}
          </Button>
          <p className="text-caption text-text-muted self-center">
            {env.isLive ? common.excelExport.clientSide : common.excelExport.mockDataNote}
          </p>
        </div>
      </Card>

      {isError ? (
        <LiveUnavailableState
          title={common.error}
          description="Ntibyashoboye kubona raporo y'ubwitabire kuri API. Ongera ugerageze."
          action={
            <Button type="button" variant="primary" onClick={() => void refetch?.()}>
              {common.reset}
            </Button>
          }
        />
      ) : isLoading ? (
        <SkeletonPage label={district.reports.title} stats={4} />
      ) : selectedRow && selectedSummary ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="tertiary"
              size="md"
              icon={<ArrowLeft size={16} />}
              onClick={() => setSelectedCenterId(null)}
            >
              {district.reports.backToList}
            </Button>
            <div className="min-w-0">
              <h2 className="text-subheading text-text">{selectedRow.centerName}</h2>
              <p className="text-body text-text-secondary">
                {selectedRow.sector} · {rangeLabel}
              </p>
            </div>
            <Link
              to={`/district/ibigo/${selectedRow.centerId}`}
              className="ml-auto inline-flex items-center gap-1.5 text-body font-semibold text-primary hover:underline"
            >
              <Building2 size={16} />
              {district.reports.viewCenter}
            </Link>
          </div>

          <AttendanceSummaryCards
            stats={selectedSummary}
            showLate={false}
            labels={{
              total: district.reports.totalRecords,
              present: district.reports.present,
              absent: district.reports.absent,
              rate: district.reports.rate,
            }}
          />

          {env.isLive ? (
            <LiveUnavailableState
              title={caretaker.report.historyTitle}
              description="Amateka y'ubwitabire ku mwana ntabwo aboneka kuri monitoring/report aggregates. Ntabwo dukoresha LocalStore."
            />
          ) : (
            <AttendanceHistoryTable
              records={centerRecords}
              childrenById={childrenById}
              showChildName
              title={caretaker.report.historyTitle}
              emptyMessage={district.reports.noCenterRecords}
              emptyDescription={district.reports.noCenterRecordsDesc}
              resetDeps={[selectedCenterId, dateFrom, dateTo]}
            />
          )}
        </div>
      ) : (
        <>
          <AttendanceSummaryCards
            stats={districtSummary}
            showLate={false}
            className="mb-8"
            labels={{
              total: district.reports.totalRecords,
              present: district.reports.present,
              absent: district.reports.absent,
              rate: district.reports.rate,
            }}
          />

          <Card padding="lg" className="mb-8">
            <h3 className="text-subheading text-text mb-1">{district.reports.centerComparison}</h3>
            <p className="text-body text-text-secondary mb-5">{rangeLabel}</p>

            {comparisonRows.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={48} className="text-text-muted" strokeWidth={1.5} />}
                title={district.reports.noCenters}
                description={district.reports.noCentersDesc}
              />
            ) : (
              <>
                <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-0 text-left responsive-table-cards">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {district.schools.tableSchool}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {district.schools.tableSector}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {district.schools.tableChildren}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {district.reports.rate}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {district.reports.present}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {district.reports.submittedToday}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3">
                          {common.labels.actions}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.items.map((row) => (
                        <tr key={row.centerId} className="border-b border-border last:border-0">
                          <td
                            className="py-3 pr-4 text-body font-medium text-text"
                            data-label={district.schools.tableSchool}
                          >
                            {row.centerName}
                          </td>
                          <td
                            className="py-3 pr-4 text-body text-text-secondary"
                            data-label={district.schools.tableSector}
                          >
                            {row.sector}
                          </td>
                          <td
                            className="py-3 pr-4 text-body text-text-secondary"
                            data-label={district.schools.tableChildren}
                          >
                            {row.enrolledChildren}
                          </td>
                          <td
                            className="py-3 pr-4 text-body font-semibold"
                            data-label={district.reports.rate}
                          >
                            <span className={row.rate < 70 ? 'text-warning' : 'text-success'}>
                              {row.rate}%
                            </span>
                          </td>
                          <td
                            className="py-3 pr-4 text-body text-text-secondary"
                            data-label={district.reports.present}
                          >
                            {row.present}/{row.totalRecords}
                          </td>
                          <td
                            className="py-3 pr-4 text-body text-text-secondary"
                            data-label={district.reports.submittedToday}
                          >
                            {row.submittedToday ? common.yes : common.no}
                          </td>
                          <td className="py-3 td-actions" data-label="">
                            <Button
                              variant="tertiary"
                              size="sm"
                              icon={<Eye size={16} />}
                              onClick={() => openCenterDetails(row.centerId)}
                            >
                              {district.reports.viewDetails}
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

      <section className="mt-10">
        <h3 className="text-subheading text-text mb-4">{district.reports.otherExports}</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {otherReports.map((report) => (
            <Card key={report.key} padding="lg" className="flex flex-col">
              <div className="flex items-start gap-4 mb-5">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${accentStyles[report.accent]}`}
                >
                  <FileText size={24} />
                </div>
                <div>
                  <h4 className="text-subheading text-text">{report.title}</h4>
                  <p className="text-body text-text-secondary mt-1">{report.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-auto pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  icon={<Download size={18} />}
                  onClick={() => requestDistrictExcel(report.key, report.title)}
                  loading={excelKind === report.key}
                  disabled={!districtExcelExportAvailable(report.key)}
                  title={
                    districtExcelExportAvailable(report.key)
                      ? undefined
                      : district.reports.sectorsUnavailable
                  }
                  className="flex-1 min-w-[9rem] sm:flex-none"
                >
                  {common.reportPreview.exportExcel}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() =>
                    setPreviewReport({
                      key: report.key,
                      title: report.title,
                      description: report.description,
                    })
                  }
                  disabled={excelBusy}
                  className="flex-1 min-w-[9rem] sm:flex-none"
                >
                  {district.reports.exportPreview}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <ReportPreviewModal
        open={!!previewReport}
        onClose={() => setPreviewReport(null)}
        reportTitle={previewReport?.title ?? ''}
        dateRangeLabel={rangeLabel}
        filters={previewFilters}
        summary={previewReport?.key === 'attendance' ? districtSummary : null}
        summaryLabels={
          previewReport?.key === 'attendance'
            ? {
                total: district.reports.totalRecords,
                present: district.reports.present,
                absent: district.reports.absent,
                rate: district.reports.rate,
              }
            : undefined
        }
        showLate={false}
        exportNote={
          previewReport?.key === 'sectors'
            ? district.reports.sectorsUnavailable
            : env.isLive
              ? common.excelExport.clientSide
              : common.excelExport.mockDataNote
        }
        pdfDisabled
        excelDisabled={!excelAvailable}
        excelLoading={exporting}
        onExportPdf={notifyPdfUnavailable}
        onExportExcel={handleExportExcel}
        tablePreview={
          previewReport?.key === 'attendance' ? (
            previewComparisonRows.length === 0 ? (
              <p className="text-body text-text-secondary">{common.reportPreview.emptyPreview}</p>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-0 text-left responsive-table-cards">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {district.schools.tableSchool}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {district.schools.tableSector}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {district.schools.tableChildren}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3">
                          {district.reports.rate}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewComparisonRows.map((row) => (
                        <tr key={row.centerId} className="border-b border-border last:border-0">
                          <td
                            className="py-3 pr-4 text-body font-medium text-text"
                            data-label={district.schools.tableSchool}
                          >
                            {row.centerName}
                          </td>
                          <td
                            className="py-3 pr-4 text-body text-text-secondary"
                            data-label={district.schools.tableSector}
                          >
                            {row.sector}
                          </td>
                          <td
                            className="py-3 pr-4 text-body text-text-secondary"
                            data-label={district.schools.tableChildren}
                          >
                            {row.enrolledChildren}
                          </td>
                          <td
                            className="py-3 text-body font-semibold"
                            data-label={district.reports.rate}
                          >
                            <span className={row.rate < 70 ? 'text-warning' : 'text-success'}>
                              {row.rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-caption text-text-muted">
                  {common.reportPreview.previewRows
                    .replace('{count}', String(previewComparisonRows.length))
                    .replace('{total}', String(comparisonRows.length))}
                </p>
              </div>
            )
          ) : (
            renderOtherPreview()
          )
        }
      />
        </PageContent>
      </PageContainer>
    </>
  )
}
