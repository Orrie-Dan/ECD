import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrendingUp, Ruler, Share2, ClipboardList } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { StatCard, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SelectInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  ChartPeriodFilter,
  EnhancedBarChart,
  EnhancedPieChart,
  type ChartPeriodFilterValue,
} from '@/components/charts'
import { CHART_METRIC_COLORS, CHART_PALETTE } from '@/lib/chart-theme'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { NcdaDashboardSection } from '@/components/ncda/NcdaDashboardSection'
import { env } from '@/config/env'
import { effectiveRangeToMonitoringDates } from '@/features/monitoring'
import { roundPct } from '@/features/monitoring'
import {
  useNcdaMonitoringCompliance,
  useNcdaMonitoringDistrictOptions,
  useNcdaMonitoringKpis,
  useNcdaMonitoringOverview,
  useNcdaMonitoringSted,
  useNcdaMonitoringWash,
} from '@/features/ncda/monitoring/queries'
import { ncda } from '@/locales/rw/ncda'
import { type PageSizeOption } from '@/types'

const DEFAULT_PERIOD: ChartPeriodFilterValue = { period: 'month', month: '' }
const STED_DEFAULT_PAGE_SIZE: PageSizeOption = 50

function formatRate(rate: number | null | undefined): string {
  if (rate == null) return ncda.monitoring.noRate
  return `${roundPct(rate)}%`
}

function labelFromMap(key: string, map: Record<string, string>): string {
  return map[key] ?? map[key.toLowerCase()] ?? key.replaceAll('_', '–')
}

function recordToBars(
  record: Record<string, number> | undefined,
  labels: Record<string, string>,
): Array<{ name: string; value: number; color: string }> {
  if (!record) return []
  return Object.entries(record).map(([key, value], index) => ({
    name: labelFromMap(key, labels),
    value: Number(value) || 0,
    color: CHART_PALETTE[index % CHART_PALETTE.length],
  }))
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
  const [params] = useSearchParams()
  const [periodFilter, setPeriodFilter] = useState<ChartPeriodFilterValue>(DEFAULT_PERIOD)
  const [districtId, setDistrictId] = useState(() => params.get('district')?.trim() || 'all')
  const [stedPage, setStedPage] = useState(1)
  const [stedPageSize, setStedPageSize] = useState<PageSizeOption>(STED_DEFAULT_PAGE_SIZE)
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

  const emptyChart = {
    emptyMessage: ncda.monitoring.chartEmpty,
    emptyDescription: ncda.monitoring.chartEmptyDesc,
  }

  const attendancePie = useMemo(
    () => [
      {
        name: ncda.monitoring.present,
        value: overview.data?.attendance.present ?? 0,
        color: CHART_METRIC_COLORS.present,
      },
      {
        name: ncda.monitoring.absent,
        value: overview.data?.attendance.absent ?? 0,
        color: CHART_METRIC_COLORS.absent,
      },
    ],
    [overview.data?.attendance.absent, overview.data?.attendance.present],
  )

  const nutritionPie = useMemo(
    () => [
      {
        name: ncda.monitoring.nutritionNormal,
        value: overview.data?.nutrition.normal ?? 0,
        color: CHART_METRIC_COLORS.nutritionNormal,
      },
      {
        name: ncda.monitoring.nutritionAtRisk,
        value: overview.data?.nutrition.atRisk ?? 0,
        color: CHART_METRIC_COLORS.nutritionAtRisk,
      },
      {
        name: ncda.monitoring.nutritionModerate,
        value: overview.data?.nutrition.moderate ?? 0,
        color: CHART_METRIC_COLORS.nutritionModerate,
      },
      {
        name: ncda.monitoring.nutritionSevere,
        value: overview.data?.nutrition.severe ?? 0,
        color: CHART_METRIC_COLORS.nutritionSevere,
      },
    ],
    [overview.data?.nutrition],
  )

  const referralsPie = useMemo(
    () => [
      {
        name: ncda.monitoring.referralsPending,
        value: overview.data?.referrals.pending ?? 0,
        color: CHART_METRIC_COLORS.referralPending,
      },
      {
        name: ncda.monitoring.referralsCompleted,
        value: overview.data?.referrals.completed ?? 0,
        color: CHART_METRIC_COLORS.referralCompleted,
      },
      {
        name: ncda.monitoring.referralsCancelled,
        value: overview.data?.referrals.cancelled ?? 0,
        color: CHART_METRIC_COLORS.referralCancelled,
      },
    ],
    [overview.data?.referrals],
  )

  const feedingBars = useMemo(
    () => [
      {
        name: ncda.monitoring.feedingMilk,
        value: overview.data?.feeding.daysWithMilk ?? 0,
        color: CHART_METRIC_COLORS.feedingMilk,
      },
      {
        name: ncda.monitoring.feedingPorridge,
        value: overview.data?.feeding.daysWithPorridge ?? 0,
        color: CHART_METRIC_COLORS.feedingPorridge,
      },
      {
        name: ncda.monitoring.feedingBalanced,
        value: overview.data?.feeding.daysWithBalancedMeal ?? 0,
        color: CHART_METRIC_COLORS.feedingBalanced,
      },
    ],
    [overview.data?.feeding],
  )

  const childrenPie = useMemo(
    () => [
      {
        name: ncda.monitoring.activeChildren,
        value: overview.data?.children.active ?? 0,
        color: CHART_METRIC_COLORS.childrenActive,
      },
      {
        name: ncda.monitoring.childrenArchived,
        value: overview.data?.children.archived ?? 0,
        color: CHART_METRIC_COLORS.childrenArchived,
      },
      {
        name: ncda.monitoring.childrenTransferred,
        value: overview.data?.children.transferred ?? 0,
        color: CHART_METRIC_COLORS.childrenTransferred,
      },
    ],
    [overview.data?.children],
  )

  const programBars = useMemo(
    () => [
      {
        name: ncda.monitoring.newRegistrations,
        value: kpis.data?.kpis.newRegistrations ?? 0,
        color: CHART_METRIC_COLORS.newRegistrations,
      },
      {
        name: ncda.monitoring.dropouts,
        value: kpis.data?.kpis.dropouts ?? 0,
        color: CHART_METRIC_COLORS.dropouts,
      },
      {
        name: ncda.monitoring.stedAssessments,
        value: kpis.data?.kpis.stedAssessments ?? 0,
        color: CHART_METRIC_COLORS.schools,
      },
      {
        name: ncda.monitoring.complianceAssessments,
        value: compliance.data?.summary.totalAssessments ?? 0,
        color: CHART_METRIC_COLORS.alerts,
      },
    ],
    [compliance.data?.summary.totalAssessments, kpis.data?.kpis],
  )

  const stedCompareBars = useMemo(
    () =>
      [...stedItems]
        .sort(compareStedDesc)
        .map((row) => ({
          name: stedIsDistrict
            ? (row.districtName ?? row.districtId ?? '—')
            : (row.centerName ?? row.centerId ?? '—'),
          value: row.childrenAssessed
            ? roundPct(stedCoverage(row))
            : Number(row.averageScore ?? 0),
        })),
    [stedIsDistrict, stedItems],
  )

  const stedAgeBars = useMemo(
    () =>
      recordToBars(sted.data?.summary.ageBandDistribution, {
        '1_3': ncda.monitoring.stedAge1_3,
        '4_6': ncda.monitoring.stedAge4_6,
      }),
    [sted.data?.summary.ageBandDistribution],
  )

  const stedOutcomePie = useMemo(
    () =>
      recordToBars(sted.data?.summary.outcomeDistribution, {
        normal: ncda.monitoring.stedNormal,
        referred: ncda.monitoring.stedReferred,
        NORMAL: ncda.monitoring.stedNormal,
        REFERRED: ncda.monitoring.stedReferred,
      }),
    [sted.data?.summary.outcomeDistribution],
  )

  const compliancePie = useMemo(
    () =>
      recordToBars(compliance.data?.summary.byStatus, {
        draft: ncda.monitoring.statusDraft,
        submitted: ncda.monitoring.statusSubmitted,
        verified: ncda.monitoring.statusVerified,
        rejected: ncda.monitoring.statusRejected,
        DRAFT: ncda.monitoring.statusDraft,
        SUBMITTED: ncda.monitoring.statusSubmitted,
        VERIFIED: ncda.monitoring.statusVerified,
        REJECTED: ncda.monitoring.statusRejected,
      }),
    [compliance.data?.summary.byStatus],
  )

  const washSnapshot = wash.data?.summary.latestSnapshot
  const washBars = useMemo(
    () => [
      {
        name: ncda.monitoring.washWater,
        value: washSnapshot?.waterSourceAvailable ?? 0,
        color: CHART_METRIC_COLORS.washWater,
      },
      {
        name: ncda.monitoring.washSanitation,
        value: washSnapshot?.sanitationFacilityAvailable ?? 0,
        color: CHART_METRIC_COLORS.washSanitation,
      },
      {
        name: ncda.monitoring.washHandwashing,
        value: washSnapshot?.handwashingFacilityAvailable ?? 0,
        color: CHART_METRIC_COLORS.washHandwashing,
      },
      {
        name: ncda.monitoring.washWaste,
        value: washSnapshot?.wasteManagementAvailable ?? 0,
        color: CHART_METRIC_COLORS.washWaste,
      },
    ],
    [washSnapshot],
  )

  const washCentersReporting = wash.data?.summary.reporting.centersReporting

  return (
    <PageContainer>
      <PageHeader
        title={ncda.sections.monitoring.title}
        subtitle={ncda.monitoring.subtitle}
        size="compact"
      />
      <PageContent>
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
              onChange={(e) => {
                setDistrictId(e.target.value)
                setStedPage(1)
              }}
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
            isLoading={
              (overview.isLoading && !overview.data && !overview.isError) ||
              (sted.isLoading && !sted.data && !sted.isError)
            }
            isError={
              overview.isError && !overview.data && sted.isError && !sted.data
            }
            onRetry={() => {
              void overview.refetch()
              void sted.refetch()
            }}
          >
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
                label={ncda.monitoring.nutritionSevere}
                value={overview.data?.nutrition.severe ?? '—'}
                icon={<Ruler size={20} className="text-secondary" />}
                variant="danger"
              />
              <StatCard
                compact
                label={ncda.monitoring.referralsPending}
                value={overview.data?.referrals.pending ?? '—'}
                icon={<Share2 size={20} className="text-secondary" />}
                variant="warning"
              />
              <StatCard
                compact
                label={ncda.monitoring.stedCoverage}
                value={formatRate(sted.data?.summary.coverage)}
                icon={<ClipboardList size={20} className="text-secondary" />}
              />
            </div>
          </NcdaDashboardSection>

          <NcdaDashboardSection
            title={ncda.monitoring.analyticsTitle}
            variant="charts"
            isLoading={
              (overview.isLoading && !overview.data && !overview.isError) ||
              (kpis.isLoading && !kpis.data && !kpis.isError)
            }
            isError={overview.isError && !overview.data && kpis.isError && !kpis.data}
            onRetry={() => {
              void overview.refetch()
              void kpis.refetch()
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartPanel title={ncda.monitoring.chartAttendance}>
                <EnhancedPieChart
                  data={attendancePie}
                  ariaLabel={ncda.monitoring.chartAttendance}
                  centerValue={formatRate(overview.data?.attendance.rate)}
                  centerLabel={ncda.monitoring.attendanceRate}
                  {...emptyChart}
                />
              </ChartPanel>
              <ChartPanel title={ncda.monitoring.chartNutrition}>
                <EnhancedPieChart
                  data={nutritionPie}
                  ariaLabel={ncda.monitoring.chartNutrition}
                  centerValue={String(overview.data?.nutrition.screenings ?? 0)}
                  centerLabel={ncda.monitoring.nutritionScreenings}
                  {...emptyChart}
                />
              </ChartPanel>
              <ChartPanel title={ncda.monitoring.chartReferrals}>
                <EnhancedPieChart
                  data={referralsPie}
                  ariaLabel={ncda.monitoring.chartReferrals}
                  centerValue={String(overview.data?.referrals.pending ?? 0)}
                  centerLabel={ncda.monitoring.referralsPending}
                  {...emptyChart}
                />
              </ChartPanel>
              <ChartPanel title={ncda.monitoring.chartFeeding}>
                <EnhancedBarChart
                  data={feedingBars}
                  ariaLabel={ncda.monitoring.chartFeeding}
                  {...emptyChart}
                />
              </ChartPanel>
            </div>
          </NcdaDashboardSection>

          <NcdaDashboardSection
            title={ncda.monitoring.secondarySnapshot}
            variant="charts"
            isLoading={
              (overview.isLoading && !overview.data && !overview.isError) ||
              (kpis.isLoading && !kpis.data && !kpis.isError)
            }
            isError={overview.isError && !overview.data}
            onRetry={() => void overview.refetch()}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartPanel title={ncda.monitoring.chartChildren}>
                <EnhancedPieChart
                  data={childrenPie}
                  ariaLabel={ncda.monitoring.chartChildren}
                  centerValue={String(overview.data?.children.total ?? 0)}
                  centerLabel={ncda.monitoring.childrenTotal}
                  {...emptyChart}
                />
              </ChartPanel>
              <ChartPanel title={ncda.monitoring.performanceTitle}>
                <EnhancedBarChart
                  data={programBars}
                  ariaLabel={ncda.monitoring.performanceTitle}
                  {...emptyChart}
                />
              </ChartPanel>
            </div>
          </NcdaDashboardSection>

          <Card padding="md" className="border-border space-y-4">
            <h2 className="text-subheading font-semibold text-text">{ncda.monitoring.stedTitle}</h2>
            {sted.isError && !sted.data ? (
              <div className="space-y-3">
                <p className="text-body text-text-secondary">{ncda.monitoring.stedError}</p>
                <Button type="button" variant="primary" onClick={() => void sted.refetch()}>
                  {ncda.monitoring.retry}
                </Button>
              </div>
            ) : sted.isLoading && !sted.data ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Skeleton height="16rem" className="w-full" rounded="lg" />
                <Skeleton height="16rem" className="w-full" rounded="lg" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartPanel title={ncda.monitoring.stedAgeTitle}>
                    <EnhancedPieChart
                      data={stedAgeBars}
                      ariaLabel={ncda.monitoring.stedAgeTitle}
                      centerValue={String(sted.data?.summary.childrenAssessed ?? 0)}
                      centerLabel={ncda.monitoring.stedChildrenAssessed}
                      {...emptyChart}
                    />
                  </ChartPanel>
                  <ChartPanel title={ncda.monitoring.stedOutcomeTitle}>
                    <EnhancedPieChart
                      data={stedOutcomePie}
                      ariaLabel={ncda.monitoring.stedOutcomeTitle}
                      centerValue={String(sted.data?.summary.assessmentsCompleted ?? 0)}
                      centerLabel={ncda.monitoring.stedCompleted}
                      {...emptyChart}
                    />
                  </ChartPanel>
                </div>
                <ChartPanel title={ncda.monitoring.comparisonsTitle}>
                  <EnhancedBarChart
                    data={stedCompareBars}
                    layout="vertical"
                    height={Math.max(240, Math.min(stedCompareBars.length, 12) * 28 + 48)}
                    ariaLabel={ncda.monitoring.comparisonsTitle}
                    yTickFormatter={(v) => `${v}%`}
                    {...emptyChart}
                  />
                </ChartPanel>
                {stedItems.length > 0 && stedTotalPages > 1 ? (
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
                ) : null}
              </>
            )}
          </Card>

          <NcdaDashboardSection
            title={ncda.monitoring.chartCompliance}
            variant="charts"
            isLoading={
              (compliance.isLoading && !compliance.data && !compliance.isError) ||
              (wash.isLoading && !wash.data && !wash.isError)
            }
            isError={
              compliance.isError && !compliance.data && wash.isError && !wash.data
            }
            onRetry={() => {
              void compliance.refetch()
              void wash.refetch()
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartPanel title={ncda.monitoring.chartCompliance}>
                <EnhancedPieChart
                  data={compliancePie}
                  ariaLabel={ncda.monitoring.chartCompliance}
                  centerValue={String(compliance.data?.summary.totalAssessments ?? 0)}
                  centerLabel={ncda.monitoring.complianceAssessments}
                  {...emptyChart}
                />
              </ChartPanel>
              <ChartPanel
                title={ncda.monitoring.chartWash}
                hint={
                  washCentersReporting != null
                    ? `${ncda.monitoring.washCentersReporting}: ${washCentersReporting}`
                    : undefined
                }
              >
                <EnhancedBarChart
                  data={washBars}
                  ariaLabel={ncda.monitoring.chartWash}
                  {...emptyChart}
                />
              </ChartPanel>
            </div>
          </NcdaDashboardSection>

          {(overview.isError || kpis.isError) && (overview.data || kpis.data) ? (
            <Card padding="md" className="border-border space-y-2">
              <h2 className="text-subheading font-semibold text-text">
                {ncda.monitoring.unavailableTitle}
              </h2>
              <p className="text-caption text-text-secondary">{ncda.monitoring.unavailableIntro}</p>
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
            </Card>
          ) : null}
        </div>
      </PageContent>
    </PageContainer>
  )
}

function ChartPanel({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-body font-semibold text-text">{title}</h3>
        {hint ? <p className="text-caption text-text-muted">{hint}</p> : null}
      </div>
      {children}
    </div>
  )
}

function stedCoverage(row: {
  assessmentsCompleted: number
  childrenAssessed?: number
  averageScore: number | null
}): number {
  if (row.childrenAssessed && row.childrenAssessed > 0) {
    return row.assessmentsCompleted / row.childrenAssessed
  }
  return row.averageScore ?? 0
}

function compareStedDesc(
  a: { assessmentsCompleted: number; childrenAssessed?: number; averageScore: number | null },
  b: { assessmentsCompleted: number; childrenAssessed?: number; averageScore: number | null },
) {
  return stedCoverage(b) - stedCoverage(a)
}
