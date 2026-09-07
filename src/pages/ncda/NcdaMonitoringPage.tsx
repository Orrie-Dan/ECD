import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, Ruler, Utensils, Accessibility } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import {
  ChartFullscreenPanel,
  EnhancedBarChart,
  EnhancedLineChart,
  EnhancedPieChart,
  formatCountTick,
} from '@/components/charts'
import { CHART_METRIC_COLORS, CHART_PALETTE } from '@/lib/chart-theme'
import { NcdaDashboardSection } from '@/components/ncda/NcdaDashboardSection'
import { env } from '@/config/env'
import {
  useNcdaMonitoringAttendance,
  useNcdaMonitoringCompliance,
  useNcdaMonitoringFeeding,
  useNcdaMonitoringKpis,
  useNcdaMonitoringNutrition,
  useNcdaMonitoringOverview,
  useNcdaMonitoringSted,
  useNcdaMonitoringWash,
} from '@/features/ncda/monitoring/queries'
import {
  NcdaMonitoringScopeFilters,
  useNcdaMonitoringScope,
} from '@/features/ncda/monitoring/useNcdaMonitoringScope'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { NcdaMonitoringShell } from '@/pages/ncda/monitoring/NcdaMonitoringShell'
import { ncda } from '@/locales/rw/ncda'
import { common } from '@/locales/rw/common'

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
 * NCDA Gukurikirana hub — mirrors district Imikorere overview with national-safe filters.
 */
export function NcdaMonitoringPage() {
  if (!env.isLive) {
    return (
      <NcdaMonitoringShell>
        <LiveUnavailableState
          title={ncda.monitoring.mockOnlyTitle}
          description={ncda.monitoring.mockOnlyBody}
        />
      </NcdaMonitoringShell>
    )
  }

  return <NcdaMonitoringHubLive />
}

function NcdaMonitoringHubLive() {
  const scope = useNcdaMonitoringScope()
  const overview = useNcdaMonitoringOverview(scope.dateFilters)
  const kpis = useNcdaMonitoringKpis(scope.dateFilters)
  const attendance = useNcdaMonitoringAttendance(scope.dateFilters)
  const nutrition = useNcdaMonitoringNutrition(scope.dateFilters)
  const feeding = useNcdaMonitoringFeeding(scope.dateFilters)
  const sted = useNcdaMonitoringSted(scope.dateFilters)
  const compliance = useNcdaMonitoringCompliance(scope.dateFilters)
  const wash = useNcdaMonitoringWash(scope.dateFilters)

  const emptyChart = {
    emptyMessage: ncda.monitoring.chartEmpty,
    emptyDescription: ncda.monitoring.chartEmptyDesc,
    tone: 'white' as const,
  }

  const attendanceTrend = useMemo(
    () =>
      (attendance.data?.trend ?? []).map((point) => ({
        date:
          point.date.length >= 10
            ? `${point.date.slice(8, 10)}/${point.date.slice(5, 7)}`
            : point.date,
        present: point.present,
        absent: point.absent,
      })),
    [attendance.data?.trend],
  )

  const attendanceItems = attendance.data?.items ?? []
  const bestCenters = useMemo(
    () => [...attendanceItems].sort((a, b) => b.present - a.present).slice(0, 5),
    [attendanceItems],
  )
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

  const domainCards = [
    {
      to: NCDA_PATHS.monitoringAttendance,
      label: ncda.monitoringHub.attendance,
      value: attendance.data?.summary.present ?? overview.data?.attendance.present ?? '—',
      icon: <CalendarCheck size={20} className="text-accent" />,
    },
    {
      to: NCDA_PATHS.monitoringGrowth,
      label: ncda.monitoringHub.growth,
      value: nutrition.data?.summary.screenings ?? overview.data?.nutrition.screenings ?? '—',
      icon: <Ruler size={20} className="text-secondary" />,
    },
    {
      to: NCDA_PATHS.monitoringFeeding,
      label: ncda.monitoringHub.feeding,
      value: feeding.data?.summary.daysRecorded ?? kpis.data?.kpis.feedingDays ?? '—',
      icon: <Utensils size={20} className="text-primary" />,
    },
    {
      to: NCDA_PATHS.monitoringSted,
      label: ncda.monitoringHub.sted,
      value:
        sted.data?.summary.assessmentsCompleted ?? kpis.data?.kpis.stedAssessments ?? '—',
      icon: <Accessibility size={20} className="text-secondary" />,
    },
  ]

  const isLoading =
    attendance.isLoading ||
    nutrition.isLoading ||
    feeding.isLoading ||
    sted.isLoading ||
    overview.isLoading
  const isError =
    attendance.isError &&
    nutrition.isError &&
    feeding.isError &&
    sted.isError &&
    overview.isError

  if (isError) {
    return (
      <NcdaMonitoringShell>
        <LiveUnavailableState
          title={ncda.monitoringHub.title}
          description={common.live.unavailableDesc}
          action={
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                void attendance.refetch()
                void nutrition.refetch()
                void feeding.refetch()
                void sted.refetch()
                void overview.refetch()
              }}
            >
              {common.reset}
            </Button>
          }
        />
      </NcdaMonitoringShell>
    )
  }

  return (
    <NcdaMonitoringShell>
      <NcdaMonitoringScopeFilters scope={scope} />
      {isLoading && !overview.data && !attendance.data ? (
        <SkeletonPage label={ncda.monitoringHub.title} stats={4} />
      ) : (
        <div className="space-y-6">
          <section aria-labelledby="ncda-monitoring-kpis">
            <h2 id="ncda-monitoring-kpis" className="text-subheading text-text mb-2">
              {ncda.monitoringHub.kpisTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {domainCards.map((card) => (
                <Link key={card.to} to={card.to} className="block">
                  <StatCard compact label={card.label} value={card.value} icon={card.icon} />
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="ncda-monitoring-trends">
            <h2 id="ncda-monitoring-trends" className="text-subheading text-text mb-2">
              {ncda.monitoringHub.trendsTitle}
            </h2>
            <Card padding="md">
              <h3 className="text-body font-semibold text-text mb-2">
                {ncda.monitoringHub.attendanceTrend}
              </h3>
              {attendanceTrend.length === 0 ? (
                <p className="text-body text-text-secondary">{ncda.monitoringHub.noTrend}</p>
              ) : (
                <EnhancedLineChart
                  data={attendanceTrend}
                  xDataKey="date"
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
                  ariaLabel={ncda.monitoringHub.attendanceTrend}
                />
              )}
            </Card>
          </section>

          <section aria-labelledby="ncda-monitoring-compare">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 id="ncda-monitoring-compare" className="text-subheading text-text">
                {ncda.monitoringHub.compareTitle}
              </h2>
              <Link
                to={NCDA_PATHS.monitoringAttendance}
                className="text-caption font-semibold text-primary hover:underline"
              >
                {ncda.monitoringHub.openDomain}
              </Link>
            </div>
            {attendanceItems.length === 0 ? (
              <p className="text-body text-text-secondary">{ncda.monitoringHub.noCenters}</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <CenterRankCard
                  title={ncda.monitoringHub.bestCenters}
                  rows={bestCenters}
                  empty={ncda.monitoringHub.noCenters}
                />
                <CenterRankCard
                  title={ncda.monitoringHub.attentionCenters}
                  rows={attentionCenters}
                  empty={ncda.monitoringHub.noCenters}
                />
              </div>
            )}
          </section>

          <NcdaDashboardSection
            title={ncda.monitoring.chartCompliance}
            variant="charts"
            isLoading={
              (compliance.isLoading && !compliance.data && !compliance.isError) ||
              (wash.isLoading && !wash.data && !wash.isError)
            }
            isError={compliance.isError && !compliance.data && wash.isError && !wash.data}
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
                  wash.data?.summary.reporting.centersReporting != null
                    ? `${ncda.monitoring.washCentersReporting}: ${wash.data.summary.reporting.centersReporting}`
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
      )}
    </NcdaMonitoringShell>
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
          <Link
            to={`${NCDA_PATHS.centers}/${row.centerId}`}
            className="min-w-0 truncate text-primary hover:underline"
            title={row.centerName}
          >
            {row.centerName}
          </Link>
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
