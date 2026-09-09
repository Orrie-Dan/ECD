import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  formatPercentTick,
  PERCENT_DOMAIN,
  type ChartPeriodFilterValue,
} from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { DistrictWorkspaceNav } from '@/layouts/district/DistrictWorkspaceNav'
import { DISTRICT_MONITORING_TABS, DISTRICT_PATHS } from '@/layouts/district/navigation'
import { useDistrictMonitoringHub } from '@/features/district/monitoring/useDistrictMonitoringHub'
import { buildSelfEvalCenterBarData } from '@/features/self-evaluation/center-bar-chart'
import { env } from '@/config/env'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { roundPct } from '@/features/monitoring'

const DEFAULT_PERIOD: ChartPeriodFilterValue = { period: 'month', month: '' }

function formatRate(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${roundPct(value)}%`
}

function formatChartDate(iso: string): string {
  if (!iso || iso.length < 10) return iso
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

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
  const navigate = useNavigate()
  const [periodFilter, setPeriodFilter] = useState<ChartPeriodFilterValue>(DEFAULT_PERIOD)
  const range = useMemo(() => resolveEffectiveDateRange(periodFilter), [periodFilter])
  const hub = useDistrictMonitoringHub(range)

  const selfEvalBars = useMemo(
    () => buildSelfEvalCenterBarData(hub.compliance?.items),
    [hub.compliance?.items],
  )

  const trend = (hub.attendance?.trend ?? [])
    .filter((point) => point.rate != null)
    .map((point) => ({
      date: formatChartDate(point.date),
      rate: roundPct(point.rate),
    }))

  const domainCards = [
    {
      to: DISTRICT_PATHS.monitoringAttendance,
      label: district.nav.attendance,
      value: formatRate(hub.attendance?.summary.attendanceRate),
      icon: <CalendarCheck size={20} className="text-accent" />,
    },
    {
      to: DISTRICT_PATHS.monitoringGrowth,
      label: district.nav.growth,
      value: hub.nutrition?.summary.screenings ?? '—',
      icon: <Ruler size={20} className="text-secondary" />,
    },
    {
      to: DISTRICT_PATHS.monitoringFeeding,
      label: district.nav.imirire,
      value: hub.feeding?.summary.daysRecorded ?? '—',
      icon: <Utensils size={20} className="text-primary" />,
    },
    {
      to: DISTRICT_PATHS.monitoringSted,
      label: district.nav.sted,
      value: hub.sted?.summary.assessmentsCompleted ?? '—',
      icon: <Accessibility size={20} className="text-secondary" />,
    },
  ]

  if (!env.isLive) {
    return (
      <LiveUnavailableState
        title={district.monitoringHub.mockOnlyTitle}
        description={district.monitoringHub.mockOnlyBody}
      />
    )
  }

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
      <ChartPeriodFilter value={periodFilter} onChange={setPeriodFilter} className="w-full md:max-w-xl" />

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
                  dataKey: 'rate',
                  label: district.charts.attendanceRate,
                  color: CHART_METRIC_COLORS.attendance,
                  valueFormatter: formatPercentTick,
                },
              ]}
              xAxisLabel={district.charts.axisDate}
              yAxisLabel={district.charts.axisPercent}
              yTickFormatter={formatPercentTick}
              yDomain={PERCENT_DOMAIN}
              ariaLabel={district.monitoringHub.attendanceTrend}
            />
          )}
        </Card>
      </section>

      <section aria-labelledby="monitoring-self-eval">
        <h2 id="monitoring-self-eval" className="text-subheading text-text mb-2">
          {district.monitoringHub.selfEvalTitle}
        </h2>
        <Card padding="md">
          <EnhancedBarChart
            data={selfEvalBars}
            dataKey="percent"
            nameKey="name"
            height={280}
            valueDomain={PERCENT_DOMAIN}
            showValueLabels
            valueLabelFormatter={formatPercentTick}
            xAxisLabel={district.charts.axisCenter}
            yAxisLabel={district.charts.axisPercent}
            yTickFormatter={formatPercentTick}
            tooltipLabelKey="centerName"
            series={[
              {
                dataKey: 'percent',
                label: district.monitoringHub.selfEvalAssessments,
                color: CHART_METRIC_COLORS.schools,
                valueFormatter: formatPercentTick,
              },
            ]}
            ariaLabel={district.monitoringHub.selfEvalTitle}
            emptyMessage={district.monitoringHub.selfEvalEmpty}
            emptyDescription={district.monitoringHub.selfEvalEmptyDesc}
            tone="white"
            onBarClick={(row) => {
              const centerId = String(row.centerId ?? '')
              if (!centerId) return
              const assessmentId = String(row.assessmentId ?? '')
              navigate(
                `${DISTRICT_PATHS.centers}/${centerId}${
                  assessmentId ? `?assessment=${assessmentId}` : ''
                }`,
              )
            }}
          />
        </Card>
      </section>
    </div>
  )
}
