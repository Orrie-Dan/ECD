import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { EnhancedBarChart, formatCountTick } from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import { BarChart3 } from 'lucide-react'
import { district } from '@/locales/rw/district'
import type { CoverageByCenterPoint, NutritionStatusCounts } from '@/lib/nutrition-utils'
import { buildStatusDistributionSeries } from '@/lib/nutrition-utils'

interface DistrictGrowthTrendSectionProps {
  coverageSeries: CoverageByCenterPoint[]
  statusCounts: NutritionStatusCounts
  isLoading?: boolean
}

const STATUS_LABEL: Record<string, string> = {
  normal: district.growth.statusNormal,
  at_risk: district.growth.statusAtRisk,
  moderate: district.growth.statusModerate,
  severe: district.growth.statusSevere,
}

const STATUS_COLOR: Record<string, string> = {
  normal: CHART_METRIC_COLORS.nutritionNormal,
  at_risk: CHART_METRIC_COLORS.nutritionAtRisk,
  moderate: CHART_METRIC_COLORS.nutritionModerate,
  severe: CHART_METRIC_COLORS.nutritionSevere,
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-4 w-40 rounded bg-background-subtle" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-28 rounded bg-background-subtle" />
            <div className="h-3 rounded-full bg-background-subtle" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DistrictGrowthTrendSection({
  coverageSeries,
  statusCounts,
  isLoading = false,
}: DistrictGrowthTrendSectionProps) {
  const statusSeries = buildStatusDistributionSeries(statusCounts)
  const statusTotal = statusSeries.reduce((sum, s) => sum + s.count, 0)
  const statusBars = statusSeries.map((item) => ({
    name: STATUS_LABEL[item.key],
    value: item.count,
    color: STATUS_COLOR[item.key],
  }))
  const centerBars = coverageSeries.map((row) => ({
    name: row.centerName,
    assessed: row.totalChildren,
    atRisk: row.atRisk,
  }))

  return (
    <Card padding="lg" className="transition-shadow duration-200 hover:shadow-md">
      <h2 className="text-subheading text-text mb-1">{district.growth.trendTitle}</h2>
      <p className="text-body text-text-secondary mb-5">{district.growth.trendSubtitle}</p>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" aria-busy="true" aria-label={district.growth.loading}>
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : statusTotal === 0 && coverageSeries.length === 0 ? (
        <EmptyState
          icon={<BarChart3 size={48} className="text-text-muted" strokeWidth={1.5} />}
          title={district.growth.noCenters}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-body font-semibold text-text mb-4">
              {district.growth.statusDistribution}
            </h3>
            {statusTotal === 0 ? (
              <p className="text-body text-text-secondary">{district.growth.notAssessed}</p>
            ) : (
              <EnhancedBarChart
                data={statusBars}
                ariaLabel={district.growth.statusDistribution}
                xAxisLabel={district.charts.axisCategory}
                yAxisLabel={district.charts.axisCount}
                yTickFormatter={formatCountTick}
              />
            )}
          </div>

          <div>
            <h3 className="text-body font-semibold text-text mb-4">
              {district.growth.coverageChart}
            </h3>
            {coverageSeries.length === 0 ? (
              <p className="text-body text-text-secondary">{district.growth.noCenters}</p>
            ) : (
              <EnhancedBarChart
                data={centerBars}
                series={[
                  {
                    dataKey: 'assessed',
                    label: district.growth.assessed,
                    color: CHART_METRIC_COLORS.schools,
                  },
                  {
                    dataKey: 'atRisk',
                    label: district.growth.atRisk,
                    color: CHART_METRIC_COLORS.nutritionAtRisk,
                  },
                ]}
                layout="vertical"
                height={Math.max(240, Math.min(centerBars.length, 8) * 32 + 48)}
                ariaLabel={district.growth.coverageChart}
                xAxisLabel={district.charts.axisCount}
                yAxisLabel={district.charts.axisCenter}
                yTickFormatter={formatCountTick}
              />
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
