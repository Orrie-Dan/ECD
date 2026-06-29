import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { EnhancedLineChart } from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import { toEnrollmentChartData } from '@/lib/chart-data'
import { district } from '@/locales/rw/district'
import type { EnrollmentPeriod, EnrollmentTrendPoint } from '@/types'

interface EnrollmentTrendSectionProps {
  period: EnrollmentPeriod
  data: EnrollmentTrendPoint[]
  periodLabel: string
}

export function EnrollmentTrendSection({ data, periodLabel }: EnrollmentTrendSectionProps) {
  const chartData = useMemo(() => toEnrollmentChartData(data), [data])

  const series = useMemo(
    () => [
      {
        dataKey: 'newRegistrations',
        label: district.children.trendNew,
        color: CHART_METRIC_COLORS.newRegistrations,
      },
      {
        dataKey: 'dropouts',
        label: district.children.trendDropouts,
        color: CHART_METRIC_COLORS.dropouts,
      },
    ],
    [],
  )

  return (
    <Card padding="lg" className="h-full transition-shadow duration-200 hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
        <h3 className="text-subheading text-text">{district.children.enrollmentTrend}</h3>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-light text-primary text-caption font-semibold w-fit">
          {periodLabel}
        </span>
      </div>

      <EnhancedLineChart
        data={chartData}
        series={series}
        xDataKey="label"
        height={280}
        ariaLabel={district.children.enrollmentTrend}
      />
    </Card>
  )
}
