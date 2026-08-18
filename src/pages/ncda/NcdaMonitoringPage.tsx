import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrendingUp, Ruler } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { StatCard, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SelectInput } from '@/components/ui/FormField'
import {
  ChartPeriodFilter,
  ChartFullscreenPanel,
  EnhancedBarChart,
  EnhancedLineChart,
  EnhancedPieChart,
  formatCountTick,
  type ChartPeriodFilterValue,
} from '@/components/charts'
import { CHART_METRIC_COLORS, CHART_PALETTE } from '@/lib/chart-theme'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { NcdaDashboardSection } from '@/components/ncda/NcdaDashboardSection'
import { env } from '@/config/env'
import { effectiveRangeToMonitoringDates } from '@/features/monitoring'
import {
  useNcdaMonitoringAttendance,
  useNcdaMonitoringCenterOptions,
  useNcdaMonitoringCompliance,
  useNcdaMonitoringDistrictOptions,
  useNcdaMonitoringKpis,
  useNcdaMonitoringOverview,
  useNcdaMonitoringWash,
} from '@/features/ncda/monitoring/queries'
import { ncda } from '@/locales/rw/ncda'

const DEFAULT_PERIOD: ChartPeriodFilterValue = { period: 'month', month: '' }

function truncateCenterLabel(value: string | number): string {
  const label = String(value)
  return label.length > 20 ? `${label.slice(0, 18)}…` : label
}

function centerRankChartHeight(rowCount: number, base = 260): number {
  return Math.max(base, Math.min(rowCount, 8) * 36 + 72)
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
  const [centerId, setCenterId] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const effectiveRange = useMemo(
    () => resolveEffectiveDateRange(periodFilter),
    [periodFilter],
  )
  const dateFilters = useMemo(
    () => ({
      ...effectiveRangeToMonitoringDates(effectiveRange),
      districtId: districtId === 'all' ? undefined : districtId,
      centerId: centerId === 'all' ? undefined : centerId,
    }),
    [effectiveRange, districtId, centerId],
  )

  const districts = useNcdaMonitoringDistrictOptions()
  const centers = useNcdaMonitoringCenterOptions(districtId)
  const overview = useNcdaMonitoringOverview(dateFilters)
  const kpis = useNcdaMonitoringKpis(dateFilters)
  const compliance = useNcdaMonitoringCompliance(dateFilters)
  const wash = useNcdaMonitoringWash(dateFilters)
  const attendance = useNcdaMonitoringAttendance(dateFilters)

  const emptyChart = {
    emptyMessage: ncda.monitoring.chartEmpty,
    emptyDescription: ncda.monitoring.chartEmptyDesc,
    tone: 'white' as const,
  }

  const attendanceTrend = useMemo(
    () =>
      (attendance.data?.trend ?? []).map((point) => ({
        date: point.date.length >= 10 ? `${point.date.slice(8, 10)}/${point.date.slice(5, 7)}` : point.date,
        present: point.present,
        absent: point.absent,
      })),
    [attendance.data?.trend],
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

  const attendanceItems = attendance.data?.items ?? []
  const ranked = useMemo(
    () => [...attendanceItems].sort((a, b) => b.present - a.present),
    [attendanceItems],
  )
  const bestCenters = ranked.slice(0, 5)
  const attentionCenters = useMemo(
    () => [...attendanceItems].sort((a, b) => a.present - b.present).slice(0, 5),
    [attendanceItems],
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.monitoring.districtFilter}
              </label>
              <SelectInput
                value={districtId}
                onChange={(e) => {
                  setDistrictId(e.target.value)
                  setCenterId('all')
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
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.monitoring.centerFilter}
              </label>
              <SelectInput
                value={centerId}
                onChange={(e) => setCenterId(e.target.value)}
              >
                <option value="all">{ncda.monitoring.centerAll}</option>
                {(centers.data?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.monitoring.statusFilter}
              </label>
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">{ncda.monitoring.statusAll}</option>
                <option value="active">{ncda.monitoring.statusActive}</option>
                <option value="archived">{ncda.monitoring.statusArchived}</option>
              </SelectInput>
            </div>
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
              <StatCard
                compact
                label={ncda.monitoring.present}
                value={overview.data?.attendance.present ?? '—'}
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
                label={ncda.monitoring.centersReporting}
                value={overview.data?.attendance.centersReporting ?? '—'}
                icon={<TrendingUp size={20} className="text-secondary" />}
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
            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
              <ChartFullscreenPanel
                title={ncda.monitoring.chartAttendance}
                renderChart={(height) => (
                  <EnhancedLineChart
                    data={attendanceTrend}
                    xDataKey="date"
                    height={height}
                    series={[
                      {
                        dataKey: 'present',
                        label: ncda.monitoring.present,
                        color: CHART_METRIC_COLORS.present,
                      },
                      {
                        dataKey: 'absent',
                        label: ncda.monitoring.absent,
                        color: CHART_METRIC_COLORS.absent,
                      },
                    ]}
                    xAxisLabel={ncda.monitoring.axisDate}
                    yAxisLabel={ncda.monitoring.axisCount}
                    yTickFormatter={formatCountTick}
                    ariaLabel={ncda.monitoring.chartAttendance}
                    {...emptyChart}
                  />
                )}
              />
              <ChartFullscreenPanel
                title={ncda.monitoring.chartNutrition}
                renderChart={(height) => (
                  <EnhancedPieChart
                    data={nutritionPie}
                    height={height}
                    ariaLabel={ncda.monitoring.chartNutrition}
                    centerValue={String(overview.data?.nutrition.screenings ?? 0)}
                    centerLabel={ncda.monitoring.nutritionScreenings}
                    {...emptyChart}
                  />
                )}
              />
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
            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
              <ChartFullscreenPanel
                title={ncda.monitoring.chartChildren}
                renderChart={(height) => (
                  <EnhancedPieChart
                    data={childrenPie}
                    height={height}
                    ariaLabel={ncda.monitoring.chartChildren}
                    centerValue={String(overview.data?.children.total ?? 0)}
                    centerLabel={ncda.monitoring.childrenTotal}
                    {...emptyChart}
                  />
                )}
              />
              <ChartFullscreenPanel
                title={ncda.monitoring.performanceTitle}
                renderChart={(height) => (
                  <EnhancedBarChart
                    data={programBars}
                    height={height}
                    ariaLabel={ncda.monitoring.performanceTitle}
                    xAxisLabel={ncda.monitoring.axisCategory}
                    yAxisLabel={ncda.monitoring.axisCount}
                    yTickFormatter={formatCountTick}
                    xTickFormatter={truncateCenterLabel}
                    {...emptyChart}
                  />
                )}
              />
            </div>
          </NcdaDashboardSection>

          <NcdaDashboardSection
            title={ncda.monitoring.centerPerformanceTitle}
            isLoading={attendance.isLoading && !attendance.data && !attendance.isError}
            isError={attendance.isError && !attendance.data}
            onRetry={() => void attendance.refetch()}
          >
            {attendanceItems.length === 0 ? (
              <p className="text-body text-text-secondary">{ncda.monitoring.noCenters}</p>
            ) : (
              <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
                <CenterRankCard
                  title={ncda.monitoring.bestCenters}
                  rows={bestCenters}
                  empty={ncda.monitoring.noCenters}
                />
                <CenterRankCard
                  title={ncda.monitoring.attentionCenters}
                  rows={attentionCenters}
                  empty={ncda.monitoring.noCenters}
                />
              </div>
            )}
          </NcdaDashboardSection>

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
            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
              <ChartFullscreenPanel
                title={ncda.monitoring.chartCompliance}
                renderChart={(height) => (
                  <EnhancedPieChart
                    data={compliancePie}
                    height={height}
                    ariaLabel={ncda.monitoring.chartCompliance}
                    centerValue={String(compliance.data?.summary.totalAssessments ?? 0)}
                    centerLabel={ncda.monitoring.complianceAssessments}
                    {...emptyChart}
                  />
                )}
              />
              <ChartFullscreenPanel
                title={ncda.monitoring.chartWash}
                hint={
                  washCentersReporting != null
                    ? `${ncda.monitoring.washCentersReporting}: ${washCentersReporting}`
                    : undefined
                }
                renderChart={(height) => (
                  <EnhancedBarChart
                    data={washBars}
                    height={height}
                    ariaLabel={ncda.monitoring.chartWash}
                    xAxisLabel={ncda.monitoring.axisCategory}
                    yAxisLabel={ncda.monitoring.axisCount}
                    yTickFormatter={formatCountTick}
                    xTickFormatter={truncateCenterLabel}
                    {...emptyChart}
                  />
                )}
              />
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

function CenterRankCard({
  title,
  rows,
  empty,
}: {
  title: string
  rows: Array<{
    centerId: string
    centerName: string
    present: number
    absent: number
    enrolledChildren: number
  }>
  empty: string
}) {
  const chartData = rows.map((row) => ({
    name: row.centerName,
    present: row.present,
    absent: row.absent,
  }))
  const listFooter = (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {rows.map((row) => (
        <li
          key={row.centerId}
          className="flex items-center justify-between gap-3 px-3 py-2 text-caption"
        >
          <span className="min-w-0 truncate text-text" title={row.centerName}>
            {row.centerName}
          </span>
          <span className="shrink-0 tabular-nums font-semibold text-text">
            {row.present} / {row.enrolledChildren}
          </span>
        </li>
      ))}
    </ul>
  )

  if (rows.length === 0) {
    return (
      <Card padding="md" className="h-full border-border">
        <h3 className="mb-3 text-body font-semibold text-text">{title}</h3>
        <p className="text-body text-text-secondary">{empty}</p>
      </Card>
    )
  }

  return (
    <ChartFullscreenPanel
      title={title}
      chartHeight={centerRankChartHeight(rows.length)}
      fullscreenChartHeight={centerRankChartHeight(rows.length, 480)}
      footer={listFooter}
      renderChart={(height) => (
        <EnhancedBarChart
          data={chartData}
          height={height}
          layout="vertical"
          series={[
            {
              dataKey: 'present',
              label: ncda.monitoring.present,
              color: CHART_METRIC_COLORS.present,
            },
            {
              dataKey: 'absent',
              label: ncda.monitoring.absent,
              color: CHART_METRIC_COLORS.absent,
            },
          ]}
          xAxisLabel={ncda.monitoring.axisCount}
          yAxisLabel={ncda.monitoring.axisCenter}
          yTickFormatter={formatCountTick}
          xTickFormatter={truncateCenterLabel}
          ariaLabel={title}
        />
      )}
    />
  )
}
