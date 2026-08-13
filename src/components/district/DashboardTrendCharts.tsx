import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { EnhancedLineChart, formatCountTick } from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import { toEnrollmentChartData, toSingleSeriesChartData } from '@/lib/chart-data'
import { formatDashboardChartTitle, type EffectiveDateRange } from '@/lib/chart-period'
import {
  getDistrictAttendanceTrendForRange,
  getDistrictEnrollmentTrendForRange,
  getDistrictSchoolsTrendForRange,
  getDistrictTeachersTrendForRange,
  hasDashboardDataForRange,
} from '@/lib/dashboard-period-data'
import { DISTRICT_STATS } from '@/lib/mock-data'
import { env } from '@/config/env'
import { effectiveRangeToMonitoringDates, useMonitoringAttendance } from '@/features/monitoring'
import { useEnrollmentReport } from '@/features/reporting/queries'
import { district } from '@/locales/rw/district'

interface DashboardTrendChartsProps {
  compact?: boolean
  effectiveRange: EffectiveDateRange
}

function formatChartDate(iso: string): string {
  if (!iso || iso.length < 10) return iso
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

export function DashboardTrendCharts({ compact = false, effectiveRange }: DashboardTrendChartsProps) {
  const dateFilters = useMemo(() => effectiveRangeToMonitoringDates(effectiveRange), [effectiveRange])
  const attendanceQ = useMonitoringAttendance({ ...dateFilters, page: 1, pageSize: 1 }, env.isLive)
  const enrollmentQ = useEnrollmentReport(dateFilters, env.isLive)

  const hasMockData = !env.isLive && hasDashboardDataForRange(effectiveRange)

  const liveEnrollment = useMemo(
    () =>
      (enrollmentQ.data?.trend ?? []).map((point) => ({
        label: formatChartDate(point.date),
        newRegistrations: point.newRegistrations,
        dropouts: 0,
      })),
    [enrollmentQ.data?.trend],
  )

  const liveAttendance = useMemo(
    () =>
      (attendanceQ.data?.trend ?? []).map((point) => ({
        date: formatChartDate(point.date),
        present: point.present,
        absent: point.absent,
      })),
    [attendanceQ.data?.trend],
  )

  const enrollmentData = useMemo(() => {
    if (!hasMockData) return []
    return toEnrollmentChartData(getDistrictEnrollmentTrendForRange(effectiveRange))
  }, [effectiveRange, hasMockData])

  const attendanceData = useMemo(() => {
    if (!hasMockData) return []
    return getDistrictAttendanceTrendForRange(effectiveRange).map((point) => ({
      label: point.label,
      present: Math.round((point.rate / 100) * DISTRICT_STATS.totalChildren),
      absent: Math.max(
        0,
        DISTRICT_STATS.totalChildren - Math.round((point.rate / 100) * DISTRICT_STATS.totalChildren),
      ),
    }))
  }, [effectiveRange, hasMockData])

  const schoolsData = useMemo(() => {
    if (!hasMockData) return []
    return toSingleSeriesChartData(getDistrictSchoolsTrendForRange(effectiveRange))
  }, [effectiveRange, hasMockData])

  const teachersData = useMemo(() => {
    if (!hasMockData) return []
    return toSingleSeriesChartData(getDistrictTeachersTrendForRange(effectiveRange))
  }, [effectiveRange, hasMockData])

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
        dataKey: 'present',
        label: district.charts.present,
        color: CHART_METRIC_COLORS.present,
      },
      {
        dataKey: 'absent',
        label: district.charts.absent,
        color: CHART_METRIC_COLORS.absent,
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

  if (env.isLive && attendanceQ.isError && enrollmentQ.isError) {
    return (
      <LiveUnavailableState
        compact={compact}
        title={district.charts.dashboardTrendsTitle}
        description={district.charts.emptyPeriodDesc}
      />
    )
  }

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
        <div className="min-w-0">
          <h4 className="text-body font-semibold text-text mb-2">{enrollmentTitle}</h4>
          <EnhancedLineChart
            data={env.isLive ? liveEnrollment : enrollmentData}
            series={
              env.isLive
                ? enrollmentSeries.filter((s) => s.dataKey === 'newRegistrations')
                : enrollmentSeries
            }
            xDataKey="label"
            height={compact ? 220 : 260}
            xAxisLabel={district.charts.axisDate}
            yAxisLabel={district.charts.axisCount}
            yTickFormatter={formatCountTick}
            ariaLabel={enrollmentTitle}
            emptyMessage={emptyMessage}
            emptyDescription={emptyDescription}
          />
        </div>

        <div className="min-w-0">
          <h4 className="text-body font-semibold text-text mb-2">{attendanceTitle}</h4>
          <EnhancedLineChart
            data={env.isLive ? liveAttendance : attendanceData}
            series={attendanceSeries}
            xDataKey={env.isLive ? 'date' : 'label'}
            height={compact ? 220 : 260}
            xAxisLabel={district.charts.axisDate}
            yAxisLabel={district.charts.axisCount}
            yTickFormatter={formatCountTick}
            ariaLabel={attendanceTitle}
            emptyMessage={emptyMessage}
            emptyDescription={emptyDescription}
          />
        </div>

        {env.isLive ? null : (
          <>
            <div className="min-w-0">
              <h4 className="text-body font-semibold text-text mb-2">{schoolsTitle}</h4>
              <EnhancedLineChart
                data={schoolsData}
                series={schoolsSeries}
                xDataKey="label"
                height={compact ? 200 : 240}
                showLegend={false}
                xAxisLabel={district.charts.axisDate}
                yAxisLabel={district.charts.axisCount}
                yTickFormatter={formatCountTick}
                ariaLabel={schoolsTitle}
                emptyMessage={emptyMessage}
                emptyDescription={emptyDescription}
              />
            </div>

            <div className="min-w-0">
              <h4 className="text-body font-semibold text-text mb-2">{teachersTitle}</h4>
              <EnhancedLineChart
                data={teachersData}
                series={teachersSeries}
                xDataKey="label"
                height={compact ? 200 : 240}
                showLegend={false}
                xAxisLabel={district.charts.axisDate}
                yAxisLabel={district.charts.axisCount}
                yTickFormatter={formatCountTick}
                ariaLabel={teachersTitle}
                emptyMessage={emptyMessage}
                emptyDescription={emptyDescription}
              />
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
