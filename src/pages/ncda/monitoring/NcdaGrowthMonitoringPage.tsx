import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { SkeletonPage } from '@/components/ui/Skeleton'
import {
  ChartFullscreenPanel,
  EnhancedPieChart,
  formatCountTick,
} from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import { env } from '@/config/env'
import {
  useNcdaMonitoringNutrition,
  useNcdaMonitoringOverview,
} from '@/features/ncda/monitoring/queries'
import {
  NcdaMonitoringScopeFilters,
  useNcdaMonitoringScope,
} from '@/features/ncda/monitoring/useNcdaMonitoringScope'
import { ncdaFollowUpPath } from '@/lib/ncda-drill-down'
import { NcdaMonitoringShell } from '@/pages/ncda/monitoring/NcdaMonitoringShell'
import { ncda } from '@/locales/rw/ncda'
import { common } from '@/locales/rw/common'

export function NcdaGrowthMonitoringPage() {
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

  return <NcdaGrowthLive />
}

function NcdaGrowthLive() {
  const scope = useNcdaMonitoringScope()
  const overview = useNcdaMonitoringOverview(scope.dateFilters)
  const nutrition = useNcdaMonitoringNutrition(scope.dateFilters)

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

  const isLoading = overview.isLoading || nutrition.isLoading
  const isError = overview.isError && nutrition.isError

  return (
    <NcdaMonitoringShell>
      <NcdaMonitoringScopeFilters scope={scope} />
      {isError ? (
        <LiveUnavailableState
          title={ncda.monitoringHub.growth}
          description={common.live.unavailableDesc}
          action={
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                void overview.refetch()
                void nutrition.refetch()
              }}
            >
              {common.reset}
            </Button>
          }
        />
      ) : isLoading ? (
        <SkeletonPage label={ncda.monitoringHub.growth} stats={3} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              compact
              label={ncda.monitoring.nutritionScreenings}
              value={
                nutrition.data?.summary.screenings ??
                overview.data?.nutrition.screenings ??
                '—'
              }
            />
            <StatCard
              compact
              label={ncda.monitoring.nutritionSevere}
              value={overview.data?.nutrition.severe ?? '—'}
              variant="danger"
            />
            <StatCard
              compact
              label={ncda.monitoring.nutritionAtRisk}
              value={overview.data?.nutrition.atRisk ?? '—'}
              variant="warning"
            />
          </div>

          <ChartFullscreenPanel
            title={ncda.monitoring.chartNutrition}
            renderChart={(height) => (
              <EnhancedPieChart
                data={nutritionPie}
                height={height}
                ariaLabel={ncda.monitoring.chartNutrition}
                centerValue={String(
                  nutrition.data?.summary.screenings ??
                    overview.data?.nutrition.screenings ??
                    0,
                )}
                centerLabel={ncda.monitoring.nutritionScreenings}
                emptyMessage={ncda.monitoring.chartEmpty}
                emptyDescription={ncda.monitoring.chartEmptyDesc}
                tone="white"
              />
            )}
          />

          <Card padding="md" className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-body font-semibold text-text">{ncda.followup.filterNutrition}</p>
              <p className="text-caption text-text-secondary">{ncda.followup.subtitle}</p>
            </div>
            <Link
              to={ncdaFollowUpPath('nutrition')}
              className="text-caption font-semibold text-primary hover:underline"
            >
              {ncda.nav.followUp} →
            </Link>
          </Card>
        </div>
      )}
    </NcdaMonitoringShell>
  )
}
