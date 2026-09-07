import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/Card'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { ChartFullscreenPanel, EnhancedBarChart, formatCountTick } from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import { env } from '@/config/env'
import { useNcdaMonitoringFeeding } from '@/features/ncda/monitoring/queries'
import {
  NcdaMonitoringScopeFilters,
  useNcdaMonitoringScope,
} from '@/features/ncda/monitoring/useNcdaMonitoringScope'
import { NcdaMonitoringShell } from '@/pages/ncda/monitoring/NcdaMonitoringShell'
import { ncda } from '@/locales/rw/ncda'
import { common } from '@/locales/rw/common'

export function NcdaFeedingMonitoringPage() {
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

  return <NcdaFeedingLive />
}

function NcdaFeedingLive() {
  const scope = useNcdaMonitoringScope()
  const feeding = useNcdaMonitoringFeeding(scope.dateFilters)
  const summary = feeding.data?.summary
  const bars = [
    {
      name: ncda.monitoring.feedingMilk,
      value: summary?.daysWithMilk ?? 0,
      color: CHART_METRIC_COLORS.feedingMilk,
    },
    {
      name: ncda.monitoring.feedingPorridge,
      value: summary?.daysWithPorridge ?? 0,
      color: CHART_METRIC_COLORS.feedingPorridge,
    },
    {
      name: ncda.monitoring.feedingBalanced,
      value: summary?.daysWithBalancedMeal ?? 0,
      color: CHART_METRIC_COLORS.feedingBalanced,
    },
  ]

  return (
    <NcdaMonitoringShell>
      <NcdaMonitoringScopeFilters scope={scope} />
      {feeding.isError ? (
        <LiveUnavailableState
          title={ncda.monitoringHub.feeding}
          description={common.live.unavailableDesc}
          action={
            <Button type="button" variant="primary" onClick={() => void feeding.refetch()}>
              {common.reset}
            </Button>
          }
        />
      ) : feeding.isLoading ? (
        <SkeletonPage label={ncda.monitoringHub.feeding} stats={3} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              compact
              label={ncda.monitoring.feedingDays}
              value={summary?.daysRecorded ?? '—'}
            />
            <StatCard
              compact
              label={ncda.monitoring.centersReporting}
              value={summary?.reportingCenters ?? '—'}
            />
            <StatCard
              compact
              label={ncda.monitoring.feedingBalanced}
              value={summary?.daysWithBalancedMeal ?? '—'}
              variant="success"
            />
          </div>

          <ChartFullscreenPanel
            title={ncda.monitoring.chartFeeding}
            renderChart={(height) => (
              <EnhancedBarChart
                data={bars}
                height={height}
                ariaLabel={ncda.monitoring.chartFeeding}
                xAxisLabel={ncda.monitoring.axisCategory}
                yAxisLabel={ncda.monitoring.axisCount}
                yTickFormatter={formatCountTick}
                emptyMessage={ncda.monitoring.chartEmpty}
                emptyDescription={ncda.monitoring.chartEmptyDesc}
                tone="white"
              />
            )}
          />
        </div>
      )}
    </NcdaMonitoringShell>
  )
}
