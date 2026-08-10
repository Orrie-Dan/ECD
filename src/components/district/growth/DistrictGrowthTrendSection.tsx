import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
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

const STATUS_BAR: Record<string, string> = {
  normal: 'bg-success',
  at_risk: 'bg-warning',
  moderate: 'bg-accent',
  severe: 'bg-error',
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
  const maxCoverage = Math.max(...coverageSeries.map((c) => c.coverageRate), 1)

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
              <ul className="space-y-3 list-none m-0 p-0">
                {statusSeries.map((item) => {
                  const percent = Math.round((item.count / statusTotal) * 100)
                  return (
                    <li
                      key={item.key}
                      className="rounded-lg p-2 -mx-2 transition-colors duration-150 hover:bg-background-subtle/80"
                    >
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="text-body text-text">{STATUS_LABEL[item.key]}</span>
                        <span className="text-body font-bold text-text shrink-0 tabular-nums">
                          {item.count.toLocaleString()}{' '}
                          <span className="text-caption font-medium text-text-muted">
                            ({percent}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-background-subtle overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${STATUS_BAR[item.key]}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-body font-semibold text-text mb-4">
              {district.growth.coverageChart}
            </h3>
            {coverageSeries.length === 0 ? (
              <p className="text-body text-text-secondary">{district.growth.noCenters}</p>
            ) : (
              <ul className="space-y-3 list-none m-0 p-0">
                {coverageSeries.map((row) => (
                  <li
                    key={row.centerId}
                    className="rounded-lg p-2 -mx-2 transition-colors duration-150 hover:bg-background-subtle/80"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-body text-text truncate">{row.centerName}</span>
                      <span className="text-body font-bold text-text shrink-0 tabular-nums">
                        {row.coverageRate}%
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-background-subtle overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${(row.coverageRate / maxCoverage) * 100}%` }}
                      />
                    </div>
                    <p className="text-caption text-text-muted mt-1">
                      {district.growth.atRisk}: {row.atRisk} · {district.growth.totalChildren}:{' '}
                      {row.totalChildren}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
