import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { EnhancedLineChart } from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import {
  toEnrollmentChartData,
  toSingleSeriesChartData,
  toDistrictAttendanceChartData,
} from '@/lib/chart-data'
import { formatDashboardChartTitle, type EffectiveDateRange } from '@/lib/chart-period'
import {
  getDistrictAttendanceTrendForRange,
  getDistrictEnrollmentTrendForRange,
  getDistrictSchoolsTrendForRange,
  getDistrictTeachersTrendForRange,
  hasDashboardDataForRange,
} from '@/lib/dashboard-period-data'
import { district } from '@/locales/rw/district'

interface DashboardTrendChartsProps {
  compact?: boolean
  effectiveRange: EffectiveDateRange
}

export function DashboardTrendCharts({ compact = false, effectiveRange }: DashboardTrendChartsProps) {
  const hasData = hasDashboardDataForRange(effectiveRange)

  const enrollmentData = useMemo(() => {
    if (!hasData) return []
    return toEnrollmentChartData(getDistrictEnrollmentTrendForRange(effectiveRange))
  }, [effectiveRange, hasData])

  const attendanceData = useMemo(() => {
    if (!hasData) return []
    return toDistrictAttendanceChartData(getDistrictAttendanceTrendForRange(effectiveRange))
  }, [effectiveRange, hasData])

  const schoolsData = useMemo(() => {
    if (!hasData) return []
    return toSingleSeriesChartData(getDistrictSchoolsTrendForRange(effectiveRange))
  }, [effectiveRange, hasData])

  const teachersData = useMemo(() => {
    if (!hasData) return []
    return toSingleSeriesChartData(getDistrictTeachersTrendForRange(effectiveRange))
  }, [effectiveRange, hasData])

  const enrollmentTitle = formatDashboardChartTitle(
    district.charts.enrollmentTrendTitle,
    effectiveRange,
  )
  const attendanceTitle = formatDashboardChartTitle(
    district.charts.attendanceTrendTitle,
    effectiveRange,
  )
  const schoolsTitle = formatDashboardChartTitle(district.charts.schoolsTrendTitle, effectiveRange)
  const teachersTitle = formatDashboardChartTitle(district.charts.teachersTrendTitle, effectiveRange)

  const emptyMessage = district.charts.emptyPeriodTitle
  const emptyDescription = district.charts.emptyPeriodDesc

  const enrollmentSeries = useMemo(
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

  const attendanceSeries = useMemo(
    () => [
      {
        dataKey: 'attendance',
        label: district.charts.attendanceRate,
        color: CHART_METRIC_COLORS.attendance,
        valueFormatter: (v: number) => `${v}%`,
      },
    ],
    [],
  )

  const schoolsSeries = useMemo(
    () => [
      {
        dataKey: 'value',
        label: district.charts.schoolsTrendTitle,
        color: CHART_METRIC_COLORS.schools,
      },
    ],
    [],
  )

  const teachersSeries = useMemo(
    () => [
      {
        dataKey: 'value',
        label: district.charts.teachersTrendTitle,
        color: CHART_METRIC_COLORS.teachers,
      },
    ],
    [],
  )

  return (
    <Card padding={compact ? 'md' : 'lg'} className="mb-3">
      <div className={`flex flex-col gap-1 ${compact ? 'mb-3' : 'mb-5'}`}>
        <h3 className={`font-semibold text-text ${compact ? 'text-body' : 'text-subheading'}`}>
          {district.charts.dashboardTrendsTitle}
        </h3>
        <p className={`text-text-secondary ${compact ? 'text-caption' : 'text-body'}`}>
          {district.charts.dashboardTrendsSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h4 className="text-body font-semibold text-text mb-2">{enrollmentTitle}</h4>
          <EnhancedLineChart
            data={enrollmentData}
            series={enrollmentSeries}
            xDataKey="label"
            height={compact ? 220 : 260}
            ariaLabel={enrollmentTitle}
            emptyMessage={emptyMessage}
            emptyDescription={emptyDescription}
          />
        </div>

        <div>
          <h4 className="text-body font-semibold text-text mb-2">{attendanceTitle}</h4>
          <EnhancedLineChart
            data={attendanceData}
            series={attendanceSeries}
            xDataKey="label"
            tooltipLabelKey="tooltipLabel"
            yDomain={[0, 100]}
            yTickFormatter={(v) => `${v}%`}
            height={compact ? 220 : 260}
            ariaLabel={attendanceTitle}
            emptyMessage={emptyMessage}
            emptyDescription={emptyDescription}
          />
        </div>

        <div>
          <h4 className="text-body font-semibold text-text mb-2">{schoolsTitle}</h4>
          <EnhancedLineChart
            data={schoolsData}
            series={schoolsSeries}
            xDataKey="label"
            height={compact ? 200 : 240}
            showLegend={false}
            ariaLabel={schoolsTitle}
            emptyMessage={emptyMessage}
            emptyDescription={emptyDescription}
          />
        </div>

        <div>
          <h4 className="text-body font-semibold text-text mb-2">{teachersTitle}</h4>
          <EnhancedLineChart
            data={teachersData}
            series={teachersSeries}
            xDataKey="label"
            height={compact ? 200 : 240}
            showLegend={false}
            ariaLabel={teachersTitle}
            emptyMessage={emptyMessage}
            emptyDescription={emptyDescription}
          />
        </div>
      </div>
    </Card>
  )
}
