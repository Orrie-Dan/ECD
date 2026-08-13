import { EnhancedLineChart } from '@/components/charts/EnhancedLineChart'
import { caretaker } from '@/locales/rw/caretaker'
import { buildTrendPoints } from '@/lib/nutrition-utils'
import type { GrowthMeasurement } from '@/types'
import { formatDate } from '@/lib/mock-data'

interface GrowthTrendChartProps {
  measurements: GrowthMeasurement[]
  height?: number
  className?: string
}

/** Form VII charts: weight trend (required) and MUAC history (retained). */
export function GrowthTrendChart({
  measurements,
  height = 260,
  className = '',
}: GrowthTrendChartProps) {
  const points = buildTrendPoints(measurements).map((p) => ({
    date: p.date,
    weightKg: p.weightKg,
    muacCm: p.muacCm,
    label: formatDate(p.date),
  }))

  return (
    <EnhancedLineChart
      data={points}
      xDataKey="label"
      series={[
        {
          dataKey: 'weightKg',
          label: caretaker.growth.trendWeight,
          color: 'var(--color-primary, #1a6b52)',
        },
        {
          dataKey: 'muacCm',
          label: caretaker.growth.trendMuac,
          color: 'var(--color-warning, #b45309)',
        },
      ]}
      height={height}
      xAxisLabel={caretaker.growth.axisDate}
      yAxisLabel={caretaker.growth.axisValue}
      emptyMessage={caretaker.growth.noMeasurements}
      emptyDescription={caretaker.growth.noMeasurementsDesc}
      ariaLabel={caretaker.growth.trendTitle}
      className={className}
      showLegend
    />
  )
}
