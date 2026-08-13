import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, Ruler, Utensils, Accessibility } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import {
  ChartPeriodFilter,
  EnhancedBarChart,
  EnhancedLineChart,
  type ChartPeriodFilterValue,
} from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { DistrictWorkspaceNav } from '@/layouts/district/DistrictWorkspaceNav'
import { DISTRICT_MONITORING_TABS, DISTRICT_PATHS } from '@/layouts/district/navigation'
import { roundPct } from '@/features/monitoring'
import { useDistrictMonitoringHub } from '@/features/district/monitoring/useDistrictMonitoringHub'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'

const DEFAULT_PERIOD: ChartPeriodFilterValue = { period: 'month', month: '' }

export function DistrictMonitoringPage() {
  return (
    <PageContainer>
      <PageHeader
        title={district.monitoringHub.title}
        subtitle={district.monitoringHub.subtitle}
        size="compact"
      />
      <PageContent>
        <DistrictWorkspaceNav
          items={DISTRICT_MONITORING_TABS}
          ariaLabel={district.monitoringHub.title}
        />
        <DistrictMonitoringOverview />
      </PageContent>
    </PageContainer>
  )
}

function DistrictMonitoringOverview() {
  const [periodFilter, setPeriodFilter] = useState<ChartPeriodFilterValue>(DEFAULT_PERIOD)
  const range = useMemo(() => resolveEffectiveDateRange(periodFilter), [periodFilter])
  const hub = useDistrictMonitoringHub(range)

  const attendanceItems = hub.attendance?.items ?? []
  const ranked = useMemo(() => {
    return [...attendanceItems]
      .filter((row) => row.rate != null)
      .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))
  }, [attendanceItems])
  const best = ranked.slice(0, 5)
  const attention = [...ranked].reverse().slice(0, 5)

  const trend = (hub.attendance?.trend ?? []).map((point) => ({
    date: point.date,
    value: point.rate == null ? 0 : roundPct(point.rate),
  }))

  const domainCards = [
    {
      to: DISTRICT_PATHS.monitoringAttendance,
      label: district.nav.attendance,
      value:
        hub.attendance?.summary.attendanceRate == null
          ? '—'
          : `${roundPct(hub.attendance.summary.attendanceRate)}%`,
      icon: <CalendarCheck size={20} className="text-accent" />,
    },
    {
      to: DISTRICT_PATHS.monitoringGrowth,
      label: district.nav.growth,
      value:
        hub.nutrition?.summary.screeningCoverage == null
          ? '—'
          : `${roundPct(hub.nutrition.summary.screeningCoverage)}%`,
      icon: <Ruler size={20} className="text-secondary" />,
    },
    {
      to: DISTRICT_PATHS.monitoringFeeding,
      label: district.nav.imirire,
      value:
        hub.feeding?.summary.feedingCoverage == null
          ? '—'
          : `${roundPct(hub.feeding.summary.feedingCoverage)}%`,
      icon: <Utensils size={20} className="text-primary" />,
    },
    {
      to: DISTRICT_PATHS.monitoringSted,
      label: district.nav.sted,
      value:
        hub.sted?.summary.coverage == null ? '—' : `${roundPct(hub.sted.summary.coverage)}%`,
      icon: <Accessibility size={20} className="text-secondary" />,
    },
  ]

  if (hub.isError) {
    return (
      <LiveUnavailableState
        title={district.monitoringHub.title}
        description={common.live.unavailableDesc}
        action={
          <Button type="button" variant="primary" onClick={() => hub.refetch()}>
            {common.reset}
          </Button>
        }
      />
    )
  }

  if (hub.isLoading) {
    return <SkeletonPage label={district.monitoringHub.title} stats={4} />
  }

  return (
    <div className="space-y-6">
      <ChartPeriodFilter value={periodFilter} onChange={setPeriodFilter} className="max-w-xl" />

      <section aria-labelledby="monitoring-kpis">
        <h2 id="monitoring-kpis" className="text-subheading text-text mb-2">
          {district.monitoringHub.kpisTitle}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {domainCards.map((card) => (
            <Link key={card.to} to={card.to} className="block">
              <StatCard compact label={card.label} value={card.value} icon={card.icon} />
            </Link>
          ))}
        </div>
        <p className="text-caption text-text-muted mt-2">
          {district.monitoringHub.pendingReferrals}: {hub.referrals?.summary.pending ?? '—'}
        </p>
      </section>

      <section aria-labelledby="monitoring-trends">
        <h2 id="monitoring-trends" className="text-subheading text-text mb-2">
          {district.monitoringHub.trendsTitle}
        </h2>
        <Card padding="md">
          <h3 className="text-body font-semibold text-text mb-2">
            {district.monitoringHub.attendanceTrend}
          </h3>
          {trend.length === 0 ? (
            <p className="text-body text-text-secondary">{district.monitoringHub.noTrend}</p>
          ) : (
            <EnhancedLineChart
              data={trend}
              xDataKey="date"
              series={[
                {
                  dataKey: 'value',
                  label: district.nav.attendance,
                  color: CHART_METRIC_COLORS.attendance,
                },
              ]}
              ariaLabel={district.monitoringHub.attendanceTrend}
            />
          )}
        </Card>
      </section>

      <section aria-labelledby="monitoring-compare">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 id="monitoring-compare" className="text-subheading text-text">
            {district.monitoringHub.compareTitle}
          </h2>
          <Link
            to={DISTRICT_PATHS.monitoringAttendance}
            className="text-caption font-semibold text-primary hover:underline"
          >
            {district.monitoringHub.openDomain}
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <CenterRankCard
            title={district.monitoringHub.bestCenters}
            rows={best}
            empty={district.monitoringHub.noCenters}
            color={CHART_METRIC_COLORS.attendance}
          />
          <CenterRankCard
            title={district.monitoringHub.attentionCenters}
            rows={attention}
            empty={district.monitoringHub.noCenters}
            color={CHART_METRIC_COLORS.dropouts}
          />
        </div>
      </section>
    </div>
  )
}

function CenterRankCard({
  title,
  rows,
  empty,
  color,
}: {
  title: string
  rows: Array<{ centerId: string; centerName: string; rate: number | null }>
  empty: string
  color: string
}) {
  return (
    <Card padding="md">
      <h3 className="text-body font-semibold text-text mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-body text-text-secondary">{empty}</p>
      ) : (
        <EnhancedBarChart
          data={rows.map((row) => ({
            name: row.centerName,
            value: row.rate == null ? 0 : roundPct(row.rate),
          }))}
          ariaLabel={title}
          color={color}
        />
      )}
      {rows.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {rows.map((row) => (
            <li key={row.centerId} className="flex items-center justify-between gap-2 text-caption">
              <Link
                to={`${DISTRICT_PATHS.centers}/${row.centerId}`}
                className="text-primary hover:underline truncate"
              >
                {row.centerName}
              </Link>
              <span className="tabular-nums text-text font-semibold">
                {row.rate == null ? '—' : `${roundPct(row.rate)}%`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  )
}
