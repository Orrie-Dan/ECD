import { useMemo, useState } from 'react'
import { Users, UserCheck, Building2, TrendingUp, Baby, UserMinus } from 'lucide-react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/Card'
import { ChartPeriodFilter, type ChartPeriodFilterValue } from '@/components/charts'
import { AttendanceOverview } from '@/components/district/AttendanceOverview'
import { DashboardTrendCharts } from '@/components/district/DashboardTrendCharts'
import { DashboardFilterSummary } from '@/components/district/DashboardFilterSummary'
import { AlertsPanel } from '@/components/district/AlertsPanel'
import { RecentActivityFeed } from '@/components/district/RecentActivityFeed'
import { CenterPerformanceSummary } from '@/components/district/CenterPerformanceSummary'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { getDashboardStatsForRange } from '@/lib/dashboard-period-data'
import { district } from '@/locales/rw/district'

const DEFAULT_PERIOD_FILTER: ChartPeriodFilterValue = { period: 'month', month: '' }

export function DistrictDashboardPage() {
  const [periodFilter, setPeriodFilter] = useState<ChartPeriodFilterValue>(DEFAULT_PERIOD_FILTER)

  const effectiveRange = useMemo(
    () => resolveEffectiveDateRange(periodFilter),
    [periodFilter],
  )

  const stats = useMemo(
    () => getDashboardStatsForRange(effectiveRange),
    [effectiveRange],
  )

  return (
    <DistrictLayout>
      <PageHeader
        title={district.dashboard.title}
        subtitle={district.dashboard.subtitle}
        size="compact"
      />

      <div className="mb-3 space-y-3">
        <ChartPeriodFilter
          value={periodFilter}
          onChange={setPeriodFilter}
          className="max-w-xl"
        />
        <DashboardFilterSummary effectiveRange={effectiveRange} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 mb-3">
        <StatCard
          compact
          label={district.dashboard.ecdCenters}
          value={stats.ecdCenters}
          icon={<Building2 size={20} className="text-secondary" />}
          variant="info"
        />
        <StatCard
          compact
          label={district.dashboard.totalChildren}
          value={stats.totalChildren.toLocaleString()}
          icon={<Users size={20} className="text-primary" />}
        />
        <StatCard
          compact
          label={district.dashboard.presentToday}
          value={stats.presentToday.toLocaleString()}
          icon={<UserCheck size={20} className="text-success" />}
          variant="success"
        />
        <StatCard
          compact
          label={district.dashboard.attendanceRate}
          value={`${stats.attendanceRate}%`}
          icon={<TrendingUp size={20} className="text-accent" />}
          variant={stats.attendanceRate >= 70 ? 'success' : 'warning'}
        />
        <StatCard
          compact
          label={district.dashboard.newRegistrations}
          value={stats.newRegistrations}
          icon={<Baby size={20} className="text-primary" />}
        />
        <StatCard
          compact
          label={district.dashboard.dropouts}
          value={stats.dropouts}
          icon={<UserMinus size={20} className="text-warning" />}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-3">
        <div className="lg:col-span-2">
          <AlertsPanel compact limit={4} />
        </div>
        <div className="lg:col-span-3">
          <RecentActivityFeed compact limit={5} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <AttendanceOverview compact />
        <CenterPerformanceSummary limit={3} />
      </div>

      <DashboardTrendCharts compact effectiveRange={effectiveRange} />
    </DistrictLayout>
  )
}
