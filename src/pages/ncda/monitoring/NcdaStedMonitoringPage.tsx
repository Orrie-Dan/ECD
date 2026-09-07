import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/Card'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { ChartFullscreenPanel, EnhancedBarChart, formatCountTick } from '@/components/charts'
import { CHART_PALETTE } from '@/lib/chart-theme'
import { env } from '@/config/env'
import { useNcdaMonitoringSted } from '@/features/ncda/monitoring/queries'
import {
  NcdaMonitoringScopeFilters,
  useNcdaMonitoringScope,
} from '@/features/ncda/monitoring/useNcdaMonitoringScope'
import { NcdaMonitoringShell } from '@/pages/ncda/monitoring/NcdaMonitoringShell'
import { ncda } from '@/locales/rw/ncda'
import { common } from '@/locales/rw/common'

export function NcdaStedMonitoringPage() {
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

  return <NcdaStedLive />
}

function NcdaStedLive() {
  const scope = useNcdaMonitoringScope()
  const sted = useNcdaMonitoringSted(scope.dateFilters)
  const summary = sted.data?.summary

  const outcomeBars = useMemo(() => {
    const dist = summary?.outcomeDistribution
    if (!dist) return []
    return Object.entries(dist).map(([key, value], index) => ({
      name: key.replaceAll('_', ' '),
      value: Number(value) || 0,
      color: CHART_PALETTE[index % CHART_PALETTE.length],
    }))
  }, [summary?.outcomeDistribution])

  return (
    <NcdaMonitoringShell>
      <NcdaMonitoringScopeFilters scope={scope} />
      {sted.isError ? (
        <LiveUnavailableState
          title={ncda.monitoringHub.sted}
          description={common.live.unavailableDesc}
          action={
            <Button type="button" variant="primary" onClick={() => void sted.refetch()}>
              {common.reset}
            </Button>
          }
        />
      ) : sted.isLoading ? (
        <SkeletonPage label={ncda.monitoringHub.sted} stats={3} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              compact
              label={ncda.monitoring.stedAssessments}
              value={summary?.assessmentsCompleted ?? '—'}
            />
            <StatCard
              compact
              label={ncda.monitoring.stedCoverage}
              value={
                summary?.coverage != null ? `${Math.round(summary.coverage * 100)}%` : '—'
              }
            />
            <StatCard
              compact
              label={ncda.monitoring.centersReporting}
              value={summary?.centersWithAssessments ?? '—'}
            />
          </div>

          <ChartFullscreenPanel
            title={ncda.monitoringHub.sted}
            renderChart={(height) => (
              <EnhancedBarChart
                data={outcomeBars}
                height={height}
                ariaLabel={ncda.monitoringHub.sted}
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
