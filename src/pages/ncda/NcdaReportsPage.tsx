import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { StatCard, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SelectInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { ChartPeriodFilter, type ChartPeriodFilterValue } from '@/components/charts'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { NcdaDashboardSection } from '@/components/ncda/NcdaDashboardSection'
import { env } from '@/config/env'
import { effectiveRangeToMonitoringDates } from '@/features/monitoring'
import { roundPct } from '@/features/monitoring'
import {
  NCDA_REPORTING_UNAVAILABLE,
  useNcdaCentersReport,
  useNcdaDistrictReport,
  useNcdaDropoutsReport,
  useNcdaEnrollmentReport,
  useNcdaReportingDistrictOptions,
} from '@/features/ncda/reporting/queries'
import { ncda } from '@/locales/rw/ncda'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'

const DEFAULT_PERIOD: ChartPeriodFilterValue = { period: 'month', month: '' }

function formatRate(rate: number | null | undefined): string {
  if (rate == null) return ncda.reports.noRate
  return `${roundPct(rate)}%`
}

/**
 * NCDA Reports — JSON report contracts only.
 * Centers table requires districtId. Exports are a BACKEND CONTRACT GAP.
 */
export function NcdaReportsPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.reports.title}
          subtitle={ncda.reports.subtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={ncda.reports.mockOnlyTitle}
            description={ncda.reports.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <NcdaReportsLive />
}

type ReportId = 'national' | 'enrollment' | 'dropouts' | 'centers'

function NcdaReportsLive() {
  const [periodFilter, setPeriodFilter] = useState<ChartPeriodFilterValue>(DEFAULT_PERIOD)
  const [districtId, setDistrictId] = useState('all')
  const [reportId, setReportId] = useState<ReportId | null>(null)
  const [centersPage, setCentersPage] = useState(1)
  const [centersPageSize, setCentersPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [dropoutsPage, setDropoutsPage] = useState(1)
  const [dropoutsPageSize, setDropoutsPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const effectiveRange = useMemo(
    () => resolveEffectiveDateRange(periodFilter),
    [periodFilter],
  )
  const scope = useMemo(
    () => ({
      ...effectiveRangeToMonitoringDates(effectiveRange),
      districtId: districtId === 'all' ? undefined : districtId,
    }),
    [effectiveRange, districtId],
  )

  const districts = useNcdaReportingDistrictOptions()
  const districtReport = useNcdaDistrictReport(scope, reportId === 'national')
  const enrollment = useNcdaEnrollmentReport(scope, reportId === 'enrollment')
  const dropouts = useNcdaDropoutsReport(
    {
      ...scope,
      page: dropoutsPage,
      pageSize: dropoutsPageSize,
    },
    reportId === 'dropouts',
  )
  const centersReport = useNcdaCentersReport(
    {
      ...scope,
      page: centersPage,
      pageSize: centersPageSize,
    },
    reportId === 'centers',
  )

  const showDropoutsTable = districtId !== 'all'
  const centersItems = centersReport.data?.items ?? []
  const centersTotal = centersReport.data?.total ?? 0
  const centersTotalPages = centersReport.data?.totalPages ?? 1
  const centersStart = centersTotal === 0 ? 0 : (centersPage - 1) * centersPageSize + 1
  const centersEnd = centersTotal === 0 ? 0 : Math.min(centersPage * centersPageSize, centersTotal)

  const dropoutItems = showDropoutsTable ? (dropouts.data?.items ?? []) : []
  const dropoutsTotal = dropouts.data?.total ?? 0
  const dropoutsTotalPages = dropouts.data?.totalPages ?? 1
  const dropoutsStart = dropoutsTotal === 0 ? 0 : (dropoutsPage - 1) * dropoutsPageSize + 1
  const dropoutsEnd =
    dropoutsTotal === 0 ? 0 : Math.min(dropoutsPage * dropoutsPageSize, dropoutsTotal)

  return (
    <PageContainer>
      <PageHeader
        title={ncda.sections.reports.title}
        subtitle={ncda.reports.subtitle}
        size="compact"
      />
      <PageContent>
        <p className="mb-2 text-caption text-text-secondary">{ncda.reports.scopeLabel}</p>
        <p className="mb-4 text-caption text-text-muted">{ncda.reports.catalogHint}</p>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <ReportCatalogCard
            category={ncda.reports.catNational}
            title={ncda.reports.nationalPerformance}
            hint={ncda.reports.nationalPerformanceHint}
            selected={reportId === 'national'}
            onSelect={() => setReportId('national')}
          />
          <ReportCatalogCard
            category={ncda.reports.catNational}
            title={ncda.reports.enrollmentTitle}
            hint={ncda.reports.enrollmentHint}
            selected={reportId === 'enrollment'}
            onSelect={() => setReportId('enrollment')}
          />
          <ReportCatalogCard
            category={ncda.reports.catDistrict}
            title={ncda.reports.dropoutsTitle}
            hint={ncda.reports.dropoutsHint}
            selected={reportId === 'dropouts'}
            onSelect={() => setReportId('dropouts')}
          />
          <ReportCatalogCard
            category={ncda.reports.catDomain}
            title={ncda.reports.centersTitle}
            hint={ncda.reports.centersHint}
            selected={reportId === 'centers'}
            onSelect={() => setReportId('centers')}
          />
        </div>

        {!reportId ? (
          <p className="mb-4 text-body text-text-secondary">{ncda.reports.chooseReport}</p>
        ) : null}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3 flex-1">
            <ChartPeriodFilter
              value={periodFilter}
              onChange={setPeriodFilter}
              className="max-w-xl"
            />
            <div className="max-w-sm">
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.reports.districtFilter}
              </label>
              <SelectInput
                value={districtId}
                onChange={(e) => {
                  setDistrictId(e.target.value)
                  setCentersPage(1)
                  setDropoutsPage(1)
                }}
              >
                <option value="all">{ncda.reports.districtAll}</option>
                {(districts.data?.items ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </SelectInput>
            </div>
          </div>
          <div className="space-y-1">
            <Button type="button" variant="secondary" disabled title={ncda.reports.exportDisabledHint}>
              {ncda.reports.exportCsv}
            </Button>
            <p className="text-caption text-text-muted">{ncda.reports.exportUnavailable}</p>
          </div>
        </div>

        <div className="space-y-8">
          {reportId === 'national' ? (
          <NcdaDashboardSection
            title={ncda.reports.districtKpisTitle}
            isLoading={districtReport.isLoading && !districtReport.data && !districtReport.isError}
            isError={districtReport.isError && !districtReport.data}
            onRetry={() => void districtReport.refetch()}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <StatCard
                compact
                label={ncda.reports.centersInScope}
                value={districtReport.data?.kpis.centersInScope ?? '—'}
              />
              <StatCard
                compact
                label={ncda.reports.activeChildren}
                value={districtReport.data?.kpis.activeChildren ?? '—'}
              />
              <StatCard
                compact
                label={ncda.reports.attendanceRate}
                value={formatRate(districtReport.data?.kpis.attendanceRate)}
              />
              <StatCard
                compact
                label={ncda.reports.newRegistrations}
                value={districtReport.data?.kpis.newRegistrations ?? '—'}
              />
              <StatCard
                compact
                label={ncda.reports.dropouts}
                value={districtReport.data?.kpis.dropouts ?? '—'}
              />
              <StatCard
                compact
                label={ncda.reports.nutritionScreenings}
                value={districtReport.data?.kpis.nutritionScreenings ?? '—'}
              />
              <StatCard
                compact
                label={ncda.reports.stedAssessments}
                value={districtReport.data?.kpis.stedAssessments ?? '—'}
              />
            </div>
          </NcdaDashboardSection>
          ) : null}

          {reportId === 'enrollment' ? (
          <NcdaDashboardSection
            title={ncda.reports.enrollmentTitle}
            isLoading={enrollment.isLoading && !enrollment.data && !enrollment.isError}
            isError={enrollment.isError && !enrollment.data}
            onRetry={() => void enrollment.refetch()}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <StatCard
                compact
                label={ncda.reports.enrolledTotal}
                value={enrollment.data?.summary.totalEnrolled ?? '—'}
              />
              <StatCard
                compact
                label={ncda.reports.enrolledActive}
                value={enrollment.data?.summary.active ?? '—'}
              />
              <StatCard
                compact
                label={ncda.reports.enrolledArchived}
                value={enrollment.data?.summary.archived ?? '—'}
              />
              <StatCard
                compact
                label={ncda.reports.newRegistrations}
                value={enrollment.data?.summary.newRegistrations ?? '—'}
              />
            </div>
            <p className="mt-3 text-caption text-text-muted">{ncda.reports.trendUnavailable}</p>
          </NcdaDashboardSection>
          ) : null}

          {reportId === 'dropouts' ? (
          <NcdaDashboardSection
            title={ncda.reports.dropoutsTitle}
            isLoading={dropouts.isLoading && !dropouts.data && !dropouts.isError}
            isError={dropouts.isError && !dropouts.data}
            onRetry={() => void dropouts.refetch()}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-4">
              <StatCard
                compact
                label={ncda.reports.dropouts}
                value={dropouts.data?.summary.dropouts ?? '—'}
              />
            </div>
            {!showDropoutsTable ? (
              <p className="text-caption text-text-secondary">{ncda.reports.dropoutsNeedDistrict}</p>
            ) : dropouts.isLoading && !dropouts.data ? (
              <Skeleton height="6rem" className="w-full" rounded="md" />
            ) : dropoutItems.length === 0 ? (
              <p className="text-body text-text-secondary">{ncda.reports.dropoutsEmpty}</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-0 sm:min-w-[36rem] text-left text-body responsive-table-cards">
                    <thead>
                      <tr className="border-b border-border text-caption text-text-secondary">
                        <th className="py-2 pr-3 font-semibold">{ncda.reports.colChild}</th>
                        <th className="py-2 pr-3 font-semibold">{ncda.reports.colCenter}</th>
                        <th className="py-2 pr-3 font-semibold">{ncda.reports.colArchived}</th>
                        <th className="py-2 font-semibold">{ncda.reports.colReason}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dropoutItems.map((row) => (
                        <tr key={row.childId} className="border-b border-border/70">
                          <td className="py-2.5 pr-3" data-label={ncda.reports.colChild}>{row.childName}</td>
                          <td className="py-2.5 pr-3" data-label={ncda.reports.colCenter}>{row.centerName}</td>
                          <td className="py-2.5 pr-3" data-label={ncda.reports.colArchived}>
                            {row.archivedAt?.slice(0, 10) ?? '—'}
                          </td>
                          <td className="py-2.5" data-label={ncda.reports.colReason}>{row.archiveReason ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={dropoutsPage}
                  pageSize={dropoutsPageSize}
                  total={dropoutsTotal}
                  totalPages={dropoutsTotalPages}
                  startIndex={dropoutsStart}
                  endIndex={dropoutsEnd}
                  hasPrevious={dropoutsPage > 1}
                  hasNext={dropoutsPage < dropoutsTotalPages}
                  onPageChange={setDropoutsPage}
                  onPageSizeChange={(size) => {
                    setDropoutsPageSize(size as PageSizeOption)
                    setDropoutsPage(1)
                  }}
                  pageSizeSelectId="ncda-reports-dropouts-page-size"
                />
              </>
            )}
          </NcdaDashboardSection>
          ) : null}

          {reportId === 'centers' ? (
          <Card padding="md" className="border-border space-y-4">
            <h2 className="text-subheading font-semibold text-text">{ncda.reports.centersTitle}</h2>
            {centersReport.isError && !centersReport.data ? (
              <div className="space-y-3">
                <p className="text-body text-text-secondary">{ncda.reports.centersError}</p>
                <Button type="button" variant="primary" onClick={() => void centersReport.refetch()}>
                  {ncda.reports.retry}
                </Button>
              </div>
            ) : centersReport.isLoading && !centersReport.data ? (
              <Skeleton height="8rem" className="w-full" rounded="md" />
            ) : centersItems.length === 0 ? (
              <p className="text-body text-text-secondary">{ncda.reports.centersEmpty}</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-0 sm:min-w-[48rem] text-left text-body responsive-table-cards">
                    <thead>
                      <tr className="border-b border-border text-caption text-text-secondary">
                        <th className="py-2 pr-3 font-semibold">{ncda.reports.colCenter}</th>
                        <th className="py-2 pr-3 font-semibold">{ncda.reports.colStatus}</th>
                        <th className="py-2 pr-3 font-semibold">{ncda.reports.colEnrolled}</th>
                        <th className="py-2 pr-3 font-semibold">{ncda.reports.colAttendance}</th>
                        <th className="py-2 pr-3 font-semibold">{ncda.reports.colNutrition}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {centersItems.map((row) => (
                        <tr key={row.centerId} className="border-b border-border/70">
                          <td className="py-2.5 pr-3 font-medium" data-label={ncda.reports.colCenter}>{row.centerName}</td>
                          <td className="py-2.5 pr-3" data-label={ncda.reports.colStatus}>{row.status}</td>
                          <td className="py-2.5 pr-3" data-label={ncda.reports.colEnrolled}>{row.enrolledChildren}</td>
                          <td className="py-2.5 pr-3" data-label={ncda.reports.colAttendance}>{formatRate(row.attendance.rate)}</td>
                          <td className="py-2.5 pr-3" data-label={ncda.reports.colNutrition}>{row.nutritionSevereScreenings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={centersPage}
                  pageSize={centersPageSize}
                  total={centersTotal}
                  totalPages={centersTotalPages}
                  startIndex={centersStart}
                  endIndex={centersEnd}
                  hasPrevious={centersPage > 1}
                  hasNext={centersPage < centersTotalPages}
                  onPageChange={setCentersPage}
                  onPageSizeChange={(size) => {
                    setCentersPageSize(size as PageSizeOption)
                    setCentersPage(1)
                  }}
                  pageSizeSelectId="ncda-reports-centers-page-size"
                />
              </>
            )}
          </Card>
          ) : null}

          <Card padding="md" className="border-border space-y-2">
            <h2 className="text-subheading font-semibold text-text">
              {ncda.reports.unavailableTitle}
            </h2>
            <ul className="list-disc pl-5 text-body text-text-secondary space-y-1">
              {NCDA_REPORTING_UNAVAILABLE.map((item) => (
                <li key={item.id}>
                  <span className="font-medium">{item.id}</span>: {item.reason}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  )
}

function ReportCatalogCard({
  category,
  title,
  hint,
  selected,
  onSelect,
}: {
  category: string
  title: string
  hint: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg border p-4 text-left transition-colors ${
        selected
          ? 'border-primary bg-primary-light/40'
          : 'border-border bg-surface hover:border-primary/40'
      }`}
      aria-pressed={selected}
    >
      <p className="text-caption font-bold uppercase tracking-wide text-text-muted">{category}</p>
      <p className="mt-1 text-body font-semibold text-text">{title}</p>
      <p className="mt-1 text-caption text-text-secondary">{hint}</p>
    </button>
  )
}
