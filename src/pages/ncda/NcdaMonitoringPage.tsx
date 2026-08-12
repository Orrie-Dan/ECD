import { useMemo, useState } from 'react'
import {
  Building2,
  Baby,
  UserCheck,
  UserMinus,
  TrendingUp,
  Ruler,
  Utensils,
  Share2,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react'
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
  NCDA_MONITORING_UNAVAILABLE,
  useNcdaMonitoringCompliance,
  useNcdaMonitoringDistrictOptions,
  useNcdaMonitoringKpis,
  useNcdaMonitoringOverview,
  useNcdaMonitoringSted,
  useNcdaMonitoringWash,
} from '@/features/ncda/monitoring/queries'
import { ncda } from '@/locales/rw/ncda'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'

const DEFAULT_PERIOD: ChartPeriodFilterValue = { period: 'month', month: '' }

function formatRate(rate: number | null | undefined): string {
  if (rate == null) return ncda.monitoring.noRate
  return `${roundPct(rate)}%`
}

/**
 * NCDA Monitoring — national-safe aggregates + SQL-backed STED/compliance/WASH.
 */
export function NcdaMonitoringPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.monitoring.title}
          subtitle={ncda.monitoring.subtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={ncda.monitoring.mockOnlyTitle}
            description={ncda.monitoring.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <NcdaMonitoringLive />
}

function NcdaMonitoringLive() {
  const [periodFilter, setPeriodFilter] = useState<ChartPeriodFilterValue>(DEFAULT_PERIOD)
  const [districtId, setDistrictId] = useState('all')
  const [stedPage, setStedPage] = useState(1)
  const [stedPageSize, setStedPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const effectiveRange = useMemo(
    () => resolveEffectiveDateRange(periodFilter),
    [periodFilter],
  )
  const dateFilters = useMemo(
    () => ({
      ...effectiveRangeToMonitoringDates(effectiveRange),
      districtId: districtId === 'all' ? undefined : districtId,
    }),
    [effectiveRange, districtId],
  )
  const stedFilters = useMemo(
    () => ({
      ...dateFilters,
      page: stedPage,
      pageSize: stedPageSize,
    }),
    [dateFilters, stedPage, stedPageSize],
  )

  const districts = useNcdaMonitoringDistrictOptions()
  const overview = useNcdaMonitoringOverview(dateFilters)
  const kpis = useNcdaMonitoringKpis(dateFilters)
  const compliance = useNcdaMonitoringCompliance(dateFilters)
  const wash = useNcdaMonitoringWash(dateFilters)
  const sted = useNcdaMonitoringSted(stedFilters)

  const stedItems = sted.data?.items ?? []
  const stedTotal = sted.data?.total ?? 0
  const stedTotalPages = sted.data?.totalPages ?? 1
  const stedStart = stedTotal === 0 ? 0 : (stedPage - 1) * stedPageSize + 1
  const stedEnd = stedTotal === 0 ? 0 : Math.min(stedPage * stedPageSize, stedTotal)
  const stedIsDistrict = sted.data?.granularity === 'district'

  return (
    <PageContainer>
      <PageHeader
        title={ncda.sections.monitoring.title}
        subtitle={ncda.monitoring.subtitle}
        size="compact"
      />
      <PageContent>
        <p className="mb-2 text-caption text-text-secondary">{ncda.monitoring.scopeLabel}</p>
        <p className="mb-4 text-caption text-text-muted">{ncda.monitoring.nationalNote}</p>

        <div className="mb-4 space-y-3">
          <ChartPeriodFilter
            value={periodFilter}
            onChange={setPeriodFilter}
            className="max-w-xl"
          />
          <div className="max-w-sm">
            <label className="mb-1 block text-caption font-semibold text-text-secondary">
              {ncda.monitoring.districtFilter}
            </label>
            <SelectInput
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
            >
              <option value="all">{ncda.monitoring.districtAll}</option>
              {(districts.data?.items ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </SelectInput>
          </div>
          <p className="text-caption text-text-secondary">
            {ncda.monitoring.periodHint}: {effectiveRange.timeLabel}
          </p>
        </div>

        <div className="space-y-8">
          <NcdaDashboardSection
            title={ncda.monitoring.overviewTitle}
            isLoading={overview.isLoading && !overview.data && !overview.isError}
            isError={overview.isError && !overview.data}
            onRetry={() => void overview.refetch()}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <StatCard
                compact
                label={ncda.monitoring.centers}
                value={overview.data?.centersInScope ?? '—'}
                icon={<Building2 size={20} className="text-secondary" />}
              />
              <StatCard
                compact
                label={ncda.monitoring.activeChildren}
                value={overview.data?.children.active ?? '—'}
                icon={<Baby size={20} className="text-secondary" />}
              />
              <StatCard
                compact
                label={ncda.monitoring.childrenTotal}
                value={overview.data?.children.total ?? '—'}
                icon={<UserCheck size={20} className="text-secondary" />}
              />
              <StatCard
                compact
                label={ncda.monitoring.newRegistrations}
                value={kpis.data?.kpis.newRegistrations ?? '—'}
              />
            </div>
          </NcdaDashboardSection>

          <NcdaDashboardSection
            title={ncda.monitoring.performanceTitle}
            isLoading={
              (overview.isLoading && !overview.data && !overview.isError) ||
              (kpis.isLoading && !kpis.data && !kpis.isError)
            }
            isError={
              (overview.isError && !overview.data) && (kpis.isError && !kpis.data)
            }
            onRetry={() => {
              void overview.refetch()
              void kpis.refetch()
            }}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <StatCard
                  compact
                  label={ncda.monitoring.attendanceRate}
                  value={formatRate(overview.data?.attendance.rate)}
                  icon={<TrendingUp size={20} className="text-secondary" />}
                  variant="success"
                />
                <StatCard
                  compact
                  label={ncda.monitoring.present}
                  value={overview.data?.attendance.present ?? '—'}
                />
                <StatCard
                  compact
                  label={ncda.monitoring.absent}
                  value={overview.data?.attendance.absent ?? '—'}
                  icon={<UserMinus size={20} className="text-secondary" />}
                  variant="warning"
                />
                <StatCard
                  compact
                  label={ncda.monitoring.centersReporting}
                  value={overview.data?.attendance.centersReporting ?? '—'}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <StatCard
                  compact
                  label={ncda.monitoring.nutritionScreenings}
                  value={overview.data?.nutrition.screenings ?? '—'}
                  icon={<Ruler size={20} className="text-secondary" />}
                />
                <StatCard
                  compact
                  label={ncda.monitoring.nutritionSevere}
                  value={overview.data?.nutrition.severe ?? '—'}
                  variant="danger"
                />
                <StatCard
                  compact
                  label={ncda.monitoring.feedingDays}
                  value={overview.data?.feeding.daysRecorded ?? '—'}
                  icon={<Utensils size={20} className="text-secondary" />}
                />
                <StatCard
                  compact
                  label={ncda.monitoring.referralsPending}
                  value={overview.data?.referrals.pending ?? '—'}
                  icon={<Share2 size={20} className="text-secondary" />}
                  variant="warning"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <StatCard
                  compact
                  label={ncda.monitoring.stedAssessments}
                  value={kpis.data?.kpis.stedAssessments ?? '—'}
                  icon={<ClipboardList size={20} className="text-secondary" />}
                />
                <StatCard
                  compact
                  label={ncda.monitoring.dropouts}
                  value={kpis.data?.kpis.dropouts ?? '—'}
                />
                <StatCard
                  compact
                  label={ncda.monitoring.complianceAssessments}
                  value={compliance.data?.summary.totalAssessments ?? '—'}
                  icon={<AlertTriangle size={20} className="text-secondary" />}
                />
                <StatCard
                  compact
                  label={ncda.monitoring.washCentersReporting}
                  value={wash.data?.summary.reporting.centersReporting ?? '—'}
                />
              </div>
            </div>
          </NcdaDashboardSection>

          <Card padding="md" className="border-border space-y-4">
            <h2 className="text-subheading font-semibold text-text">{ncda.monitoring.stedTitle}</h2>
            <p className="text-caption text-text-muted">{ncda.monitoring.stedHint}</p>
            {sted.isError && !sted.data ? (
              <div className="space-y-3">
                <p className="text-body text-text-secondary">{ncda.monitoring.stedError}</p>
                <Button type="button" variant="primary" onClick={() => void sted.refetch()}>
                  {ncda.monitoring.retry}
                </Button>
              </div>
            ) : sted.isLoading && !sted.data ? (
              <Skeleton height="6rem" className="w-full" rounded="md" />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  <StatCard
                    compact
                    label={ncda.monitoring.stedCompleted}
                    value={sted.data?.summary.assessmentsCompleted ?? '—'}
                  />
                  <StatCard
                    compact
                    label={ncda.monitoring.stedChildrenAssessed}
                    value={sted.data?.summary.childrenAssessed ?? '—'}
                  />
                  <StatCard
                    compact
                    label={ncda.monitoring.stedCoverage}
                    value={formatRate(sted.data?.summary.coverage)}
                  />
                  <StatCard
                    compact
                    label={ncda.monitoring.stedAvgScore}
                    value={sted.data?.summary.averageScore ?? '—'}
                  />
                </div>
                {stedItems.length === 0 ? (
                  <p className="text-body text-text-secondary">{ncda.monitoring.stedEmpty}</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[36rem] text-left text-body">
                        <thead>
                          <tr className="border-b border-border text-caption text-text-secondary">
                            <th className="py-2 pr-3 font-semibold">
                              {stedIsDistrict
                                ? ncda.monitoring.colDistrict
                                : ncda.monitoring.colCenter}
                            </th>
                            <th className="py-2 pr-3 font-semibold">
                              {ncda.monitoring.stedCompleted}
                            </th>
                            {stedIsDistrict ? (
                              <th className="py-2 pr-3 font-semibold">
                                {ncda.monitoring.stedChildrenAssessed}
                              </th>
                            ) : null}
                            <th className="py-2 font-semibold">{ncda.monitoring.stedAvgScore}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stedItems.map((row) => (
                            <tr
                              key={row.districtId ?? row.centerId ?? row.assessmentsCompleted}
                              className="border-b border-border/70"
                            >
                              <td className="py-2.5 pr-3 font-medium">
                                {stedIsDistrict
                                  ? row.districtName ?? row.districtId
                                  : row.centerName ?? row.centerId}
                              </td>
                              <td className="py-2.5 pr-3">{row.assessmentsCompleted}</td>
                              {stedIsDistrict ? (
                                <td className="py-2.5 pr-3">{row.childrenAssessed ?? '—'}</td>
                              ) : null}
                              <td className="py-2.5">{row.averageScore ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      page={stedPage}
                      pageSize={stedPageSize}
                      total={stedTotal}
                      totalPages={stedTotalPages}
                      startIndex={stedStart}
                      endIndex={stedEnd}
                      hasPrevious={stedPage > 1}
                      hasNext={stedPage < stedTotalPages}
                      onPageChange={setStedPage}
                      onPageSizeChange={(size) => {
                        setStedPageSize(size as PageSizeOption)
                        setStedPage(1)
                      }}
                      pageSizeSelectId="ncda-monitoring-sted-page-size"
                    />
                  </>
                )}
              </>
            )}
          </Card>

          <Card padding="md" className="border-border space-y-2">
            <h2 className="text-subheading font-semibold text-text">
              {ncda.monitoring.unavailableTitle}
            </h2>
            <p className="text-caption text-text-secondary">{ncda.monitoring.unavailableIntro}</p>
            <ul className="list-disc pl-5 text-body text-text-secondary space-y-1">
              {NCDA_MONITORING_UNAVAILABLE.map((item) => (
                <li key={item.id}>
                  <span className="font-medium">{item.id}</span>: {item.reason}
                </li>
              ))}
            </ul>
            {(overview.isError || kpis.isError) && (overview.data || kpis.data) ? (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (overview.isError) void overview.refetch()
                    if (kpis.isError) void kpis.refetch()
                  }}
                >
                  {ncda.monitoring.retry}
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  )
}
