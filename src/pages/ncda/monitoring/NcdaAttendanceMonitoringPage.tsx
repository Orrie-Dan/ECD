import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { SkeletonPage } from '@/components/ui/Skeleton'
import {
  ChartFullscreenPanel,
  EnhancedBarChart,
  EnhancedLineChart,
  formatCountTick,
} from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import { env } from '@/config/env'
import { useNcdaMonitoringAttendance } from '@/features/ncda/monitoring/queries'
import {
  NcdaMonitoringScopeFilters,
  useNcdaMonitoringScope,
} from '@/features/ncda/monitoring/useNcdaMonitoringScope'
import { NcdaMonitoringShell } from '@/pages/ncda/monitoring/NcdaMonitoringShell'
import { ncda } from '@/locales/rw/ncda'
import { common } from '@/locales/rw/common'

export function NcdaAttendanceMonitoringPage() {
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

  return <NcdaAttendanceLive />
}

function NcdaAttendanceLive() {
  const scope = useNcdaMonitoringScope()
  const attendance = useNcdaMonitoringAttendance(scope.dateFilters)

  const trend = useMemo(
    () =>
      (attendance.data?.trend ?? []).map((point) => ({
        date:
          point.date.length >= 10
            ? `${point.date.slice(8, 10)}/${point.date.slice(5, 7)}`
            : point.date,
        present: point.present,
        absent: point.absent,
      })),
    [attendance.data?.trend],
  )

  const ranked = useMemo(() => {
    const items = attendance.data?.items ?? []
    return [...items].sort((a, b) => b.present - a.present).slice(0, 10)
  }, [attendance.data?.items])

  return (
    <NcdaMonitoringShell>
      <NcdaMonitoringScopeFilters scope={scope} />
      {attendance.isError ? (
        <LiveUnavailableState
          title={ncda.monitoringHub.attendance}
          description={common.live.unavailableDesc}
          action={
            <Button type="button" variant="primary" onClick={() => void attendance.refetch()}>
              {common.reset}
            </Button>
          }
        />
      ) : attendance.isLoading ? (
        <SkeletonPage label={ncda.monitoringHub.attendance} stats={3} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              compact
              label={ncda.monitoring.present}
              value={attendance.data?.summary.present ?? '—'}
              variant="success"
            />
            <StatCard
              compact
              label={ncda.monitoring.absent}
              value={attendance.data?.summary.absent ?? '—'}
              variant="danger"
            />
            <StatCard
              compact
              label={ncda.monitoring.centersReporting}
              value={attendance.data?.items.length ?? '—'}
            />
          </div>

          <Card padding="md">
            <h2 className="text-body font-semibold text-text mb-2">
              {ncda.monitoringHub.attendanceTrend}
            </h2>
            {trend.length === 0 ? (
              <p className="text-body text-text-secondary">{ncda.monitoringHub.noTrend}</p>
            ) : (
              <EnhancedLineChart
                data={trend}
                xDataKey="date"
                series={[
                  {
                    dataKey: 'present',
                    label: ncda.monitoring.present,
                    color: CHART_METRIC_COLORS.present,
                  },
                  {
                    dataKey: 'absent',
                    label: ncda.monitoring.absent,
                    color: CHART_METRIC_COLORS.absent,
                  },
                ]}
                xAxisLabel={ncda.monitoring.axisDate}
                yAxisLabel={ncda.monitoring.axisCount}
                yTickFormatter={formatCountTick}
                ariaLabel={ncda.monitoringHub.attendanceTrend}
              />
            )}
          </Card>

          <ChartFullscreenPanel
            title={ncda.monitoringHub.compareTitle}
            renderChart={(height) => (
              <EnhancedBarChart
                data={ranked.map((row) => ({
                  name: row.centerName,
                  present: row.present,
                  absent: row.absent,
                }))}
                height={height}
                layout="vertical"
                series={[
                  {
                    dataKey: 'present',
                    label: ncda.monitoring.present,
                    color: CHART_METRIC_COLORS.present,
                  },
                  {
                    dataKey: 'absent',
                    label: ncda.monitoring.absent,
                    color: CHART_METRIC_COLORS.absent,
                  },
                ]}
                xAxisLabel={ncda.monitoring.axisCount}
                yAxisLabel={ncda.monitoring.axisCenter}
                yTickFormatter={formatCountTick}
                ariaLabel={ncda.monitoringHub.compareTitle}
                emptyMessage={ncda.monitoringHub.noCenters}
                emptyDescription={ncda.monitoringHub.nationalSafeNote}
                tone="white"
              />
            )}
          />
        </div>
      )}
    </NcdaMonitoringShell>
  )
}
