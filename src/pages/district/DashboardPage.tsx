import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserCheck, Building2, TrendingUp, Baby, UserMinus, Ruler, AlertTriangle, Clock } from 'lucide-react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChartPeriodFilter, type ChartPeriodFilterValue } from '@/components/charts'
import { AttendanceOverview } from '@/components/district/AttendanceOverview'
import { AttendanceSummaryCards } from '@/components/attendance/AttendanceSummaryCards'
import { DashboardTrendCharts } from '@/components/district/DashboardTrendCharts'
import { DashboardFilterSummary } from '@/components/district/DashboardFilterSummary'
import { AlertsPanel } from '@/components/district/AlertsPanel'
import { RecentActivityFeed } from '@/components/district/RecentActivityFeed'
import { CenterPerformanceSummary } from '@/components/district/CenterPerformanceSummary'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { useData } from '@/contexts/AppContext'
import { useDashboardMonitoring } from '@/features/monitoring'
import { roundPct } from '@/features/monitoring'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { env } from '@/config/env'
import type { Child, GrowthMeasurement, NutritionAssessment } from '@/types'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'

const DEFAULT_PERIOD_FILTER: ChartPeriodFilterValue = { period: 'month', month: '' }

export function DistrictDashboardPage() {
  if (env.isLive) {
    return (
      <DistrictDashboardPageShared
        children={[] as Child[]}
        growthMeasurements={[] as GrowthMeasurement[]}
        nutritionAssessments={[] as NutritionAssessment[]}
      />
    )
  }

  return <DistrictDashboardPageMock />
}

function DistrictDashboardPageMock() {
  const { children, growthMeasurements, nutritionAssessments } = useData()
  return (
    <DistrictDashboardPageShared
      children={children}
      growthMeasurements={growthMeasurements}
      nutritionAssessments={nutritionAssessments}
    />
  )
}

function DistrictDashboardPageShared({
  children,
  growthMeasurements,
  nutritionAssessments,
}: {
  children: Child[]
  growthMeasurements: GrowthMeasurement[]
  nutritionAssessments: NutritionAssessment[]
}) {
  const navigate = useNavigate()
  const [periodFilter, setPeriodFilter] = useState<ChartPeriodFilterValue>(DEFAULT_PERIOD_FILTER)

  const effectiveRange = useMemo(
    () => resolveEffectiveDateRange(periodFilter),
    [periodFilter],
  )

  const {
    dashboard,
    newRegistrations,
    dropouts,
    growthCoverage,
    growthOverdue,
    growthAtRisk,
    isLoading,
    isError,
    refetch,
  } = useDashboardMonitoring({
    range: effectiveRange,
    children,
    growthMeasurements,
    nutritionAssessments,
  })

  const attendanceRate = roundPct(dashboard?.attendance.rate)
  const totalChildren = dashboard?.children.active ?? dashboard?.children.total ?? 0
  const present = dashboard?.attendance.present ?? 0

  const attendanceSummary = useMemo(
    () => ({
      total: totalChildren,
      present,
      absent: dashboard?.attendance.absent ?? Math.max(0, totalChildren - present),
      unrecorded: 0,
      rate: attendanceRate,
      lateArrivals: null as number | null,
    }),
    [attendanceRate, dashboard?.attendance.absent, present, totalChildren],
  )

  return (
    <DistrictLayout>
      <PageContainer>
      <PageHeader
        title={district.dashboard.title}
        subtitle={district.dashboard.subtitle}
        size="compact"
      />

      <PageContent>
      <div className="mb-3 space-y-3">
        <ChartPeriodFilter
          value={periodFilter}
          onChange={setPeriodFilter}
          className="max-w-xl"
        />
        <DashboardFilterSummary effectiveRange={effectiveRange} />
      </div>

      {isError ? (
        <LiveUnavailableState
          title={district.dashboard.title}
          description="Ntibyashoboye kubona amakuru ya dashboard kuri API. Ongera ugerageze."
          action={
            <Button type="button" variant="primary" onClick={() => void refetch?.()}>
              {common.reset}
            </Button>
          }
        />
      ) : isLoading || !dashboard ? (
        <SkeletonPage label={district.dashboard.title} stats={6} />
      ) : (
        <>
      <div className="mb-3">
        <AttendanceSummaryCards stats={attendanceSummary} compact showLate />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 mb-3">
        <StatCard
          compact
          label={district.dashboard.ecdCenters}
          value={dashboard.centersInScope}
          icon={<Building2 size={20} className="text-secondary" />}
          variant="info"
        />
        <StatCard
          compact
          label={district.dashboard.totalChildren}
          value={totalChildren.toLocaleString()}
          icon={<Users size={20} className="text-primary" />}
        />
        <StatCard
          compact
          label={district.dashboard.presentToday}
          value={present.toLocaleString()}
          icon={<UserCheck size={20} className="text-success" />}
          variant="success"
        />
        <StatCard
          compact
          label={district.dashboard.attendanceRate}
          value={`${attendanceRate}%`}
          icon={<TrendingUp size={20} className="text-accent" />}
          variant={attendanceRate >= 70 ? 'success' : 'warning'}
        />
        <StatCard
          compact
          label={district.dashboard.newRegistrations}
          value={newRegistrations ?? '—'}
          icon={<Baby size={20} className="text-primary" />}
        />
        <StatCard
          compact
          label={district.dashboard.dropouts}
          value={dropouts ?? '—'}
          icon={<UserMinus size={20} className="text-warning" />}
          variant="warning"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <h2 className="text-subheading text-text">{district.growth.title}</h2>
        <Button variant="tertiary" size="sm" onClick={() => navigate('/district/imikurire')}>
          {district.dashboard.viewGrowth}
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
        <StatCard
          compact
          label={district.dashboard.growthCoverage}
          value={`${growthCoverage ?? 0}%`}
          icon={<Ruler size={20} className="text-secondary" />}
          variant={(growthCoverage ?? 0) >= 70 ? 'success' : 'warning'}
        />
        <StatCard
          compact
          label={district.dashboard.growthOverdue}
          value={growthOverdue ?? 0}
          icon={<Clock size={20} className="text-warning" />}
          variant="warning"
        />
        <StatCard
          compact
          label={district.dashboard.growthAtRisk}
          value={growthAtRisk ?? 0}
          icon={<AlertTriangle size={20} className="text-error" />}
          variant="warning"
        />
      </div>
        </>
      )}

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
      </PageContent>
      </PageContainer>
    </DistrictLayout>
  )
}
