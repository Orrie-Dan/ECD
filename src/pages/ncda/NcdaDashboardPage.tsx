import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  MapPinned,
  Baby,
  UserCheck,
  UserMinus,
  TrendingUp,
  Ruler,
  Utensils,
  Share2,
  ClipboardList,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { StatCard, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChartPeriodFilter, type ChartPeriodFilterValue } from '@/components/charts'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { env } from '@/config/env'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { NcdaDashboardSection } from '@/components/ncda/NcdaDashboardSection'
import { useNcdaDashboard, NCDA_UNSUPPORTED_METRICS } from '@/features/ncda'
import { roundPct } from '@/features/monitoring'
import { ncda } from '@/locales/rw/ncda'

const DEFAULT_PERIOD: ChartPeriodFilterValue = { period: 'month', month: '' }

function formatRate(rate: number | null | undefined): string {
  if (rate == null) return ncda.dashboard.noRate
  return `${roundPct(rate)}%`
}

function formatIsoRange(from?: string, to?: string): string {
  if (!from || !to) return '—'
  return `${from.slice(0, 10)} → ${to.slice(0, 10)} (UTC)`
}

/**
 * NCDA National Dashboard — server-side aggregates only.
 * Distinct information architecture from the district portal dashboard.
 * Does not call monitoring list endpoints at national scope.
 */
export function NcdaDashboardPage() {
  const [periodFilter, setPeriodFilter] = useState<ChartPeriodFilterValue>(DEFAULT_PERIOD)
  const effectiveRange = useMemo(
    () => resolveEffectiveDateRange(periodFilter),
    [periodFilter],
  )

  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.dashboard.title}
          subtitle={ncda.dashboard.subtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={ncda.dashboard.mockOnlyTitle}
            description={ncda.dashboard.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <NcdaDashboardLive range={effectiveRange} periodFilter={periodFilter} onPeriodChange={setPeriodFilter} />
}

function NcdaDashboardLive({
  range,
  periodFilter,
  onPeriodChange,
}: {
  range: ReturnType<typeof resolveEffectiveDateRange>
  periodFilter: ChartPeriodFilterValue
  onPeriodChange: (v: ChartPeriodFilterValue) => void
}) {
  const { overview, kpis, network, dateFilters } = useNcdaDashboard(range)

  const periodLabel = formatIsoRange(
    overview.data?.from ?? kpis.data?.from ?? dateFilters.from,
    overview.data?.to ?? kpis.data?.to ?? dateFilters.to,
  )

  return (
    <PageContainer>
      <PageHeader
        title={ncda.sections.dashboard.title}
        subtitle={ncda.dashboard.subtitle}
        size="compact"
      />

      <PageContent>
        <div className="mb-4 space-y-2">
          <ChartPeriodFilter
            value={periodFilter}
            onChange={onPeriodChange}
            className="max-w-xl"
          />
          <p className="text-caption text-text-secondary">
            {ncda.dashboard.scopeLabel} · {ncda.dashboard.periodHint}: {range.timeLabel}
            {periodLabel !== '—' ? ` · ${periodLabel}` : ''}
          </p>
        </div>

        <div className="space-y-8">
          {/* ── National overview (network + enrollment snapshot) ── */}
          <NcdaDashboardSection
            title={ncda.dashboard.overviewTitle}
            isLoading={
              (network.isLoading && !network.data && !network.isError) ||
              (overview.isLoading && !overview.data && !overview.isError)
            }
            isError={
              (network.isError && !network.data) &&
              (overview.isError && !overview.data)
            }
            onRetry={() => {
              void network.refetch()
              void overview.refetch()
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3">
              <StatCard
                compact
                label={ncda.dashboard.districts}
                value={network.isError && !network.data ? '—' : (network.data?.districts ?? '—')}
                icon={<MapPinned size={20} className="text-secondary" />}
                variant="info"
              />
              <StatCard
                compact
                label={ncda.dashboard.centers}
                value={
                  overview.isError && !overview.data
                    ? '—'
                    : (overview.data?.centersInScope ?? '—')
                }
                icon={<Building2 size={20} className="text-secondary" />}
                variant="info"
              />
              <StatCard
                compact
                label={ncda.dashboard.activeCenters}
                value={
                  network.isError && !network.data ? '—' : (network.data?.activeCenters ?? '—')
                }
                icon={<Building2 size={20} className="text-secondary" />}
                variant="success"
              />
              <StatCard
                compact
                label={ncda.dashboard.activeChildren}
                value={
                  overview.isError && !overview.data
                    ? '—'
                    : (overview.data?.children.active ?? '—')
                }
                icon={<Baby size={20} className="text-secondary" />}
                variant="default"
              />
              <StatCard
                compact
                label={ncda.dashboard.childrenTotal}
                value={
                  overview.isError && !overview.data
                    ? '—'
                    : (overview.data?.children.total ?? '—')
                }
                icon={<UserCheck size={20} className="text-secondary" />}
                variant="default"
              />
            </div>
            {(network.isError || overview.isError) && (network.data || overview.data) ? (
              <div className="mt-2 flex items-center gap-3">
                <p className="text-caption text-text-secondary">{ncda.dashboard.sectionError}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (network.isError) void network.refetch()
                    if (overview.isError) void overview.refetch()
                  }}
                >
                  {ncda.dashboard.retry}
                </Button>
              </div>
            ) : null}
          </NcdaDashboardSection>

          {/* ── Program performance (period-bound) ── */}
          <NcdaDashboardSection
            title={ncda.dashboard.performanceTitle}
            isLoading={
              (overview.isLoading && !overview.data && !overview.isError) ||
              (kpis.isLoading && !kpis.data && !kpis.isError)
            }
            isError={
              (overview.isError && !overview.data) && (kpis.isError && !kpis.data)
            }
            onRetry={() => {
              void overview.refetch()
              void kpis.refetch()
            }}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <StatCard
                  compact
                  label={ncda.dashboard.attendanceRate}
                  value={formatRate(overview.data?.attendance.rate)}
                  icon={<TrendingUp size={20} className="text-secondary" />}
                  variant="success"
                />
                <StatCard
                  compact
                  label={ncda.dashboard.present}
                  value={overview.data?.attendance.present ?? '—'}
                  icon={<UserCheck size={20} className="text-secondary" />}
                />
                <StatCard
                  compact
                  label={ncda.dashboard.absent}
                  value={overview.data?.attendance.absent ?? '—'}
                  icon={<UserMinus size={20} className="text-secondary" />}
                  variant="warning"
                />
                <StatCard
                  compact
                  label={ncda.dashboard.centersReportingAttendance}
                  value={overview.data?.attendance.centersReporting ?? '—'}
                  icon={<Building2 size={20} className="text-secondary" />}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <StatCard
                  compact
                  label={ncda.dashboard.nutritionScreenings}
                  value={overview.data?.nutrition.screenings ?? '—'}
                  icon={<Ruler size={20} className="text-secondary" />}
                  variant="info"
                />
                <StatCard
                  compact
                  label={ncda.dashboard.nutritionSevere}
                  value={overview.data?.nutrition.severe ?? '—'}
                  variant="danger"
                />
                <StatCard
                  compact
                  label={ncda.dashboard.nutritionAtRisk}
                  value={overview.data?.nutrition.atRisk ?? '—'}
                  variant="warning"
                />
                <StatCard
                  compact
                  label={ncda.dashboard.nutritionNormal}
                  value={overview.data?.nutrition.normal ?? '—'}
                  variant="success"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <StatCard
                  compact
                  label={ncda.dashboard.feedingDays}
                  value={overview.data?.feeding.daysRecorded ?? '—'}
                  icon={<Utensils size={20} className="text-secondary" />}
                />
                <StatCard
                  compact
                  label={ncda.dashboard.feedingMilk}
                  value={overview.data?.feeding.daysWithMilk ?? '—'}
                />
                <StatCard
                  compact
                  label={ncda.dashboard.feedingPorridge}
                  value={overview.data?.feeding.daysWithPorridge ?? '—'}
                />
                <StatCard
                  compact
                  label={ncda.dashboard.feedingCenters}
                  value={overview.data?.feeding.centersReporting ?? '—'}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <StatCard
                  compact
                  label={ncda.dashboard.referralsCreated}
                  value={overview.data?.referrals.created ?? '—'}
                  icon={<Share2 size={20} className="text-secondary" />}
                />
                <StatCard
                  compact
                  label={ncda.dashboard.referralsPending}
                  value={overview.data?.referrals.pending ?? '—'}
                  variant="warning"
                />
                <StatCard
                  compact
                  label={ncda.dashboard.referralsCompleted}
                  value={overview.data?.referrals.completed ?? '—'}
                  variant="success"
                />
                <StatCard
                  compact
                  label={ncda.dashboard.stedAssessments}
                  value={kpis.data?.kpis.stedAssessments ?? '—'}
                  icon={<ClipboardList size={20} className="text-secondary" />}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <StatCard
                  compact
                  label={ncda.dashboard.newRegistrations}
                  value={kpis.data?.kpis.newRegistrations ?? '—'}
                  icon={<Baby size={20} className="text-secondary" />}
                  variant="info"
                />
                <StatCard
                  compact
                  label={ncda.dashboard.dropouts}
                  value={kpis.data?.kpis.dropouts ?? '—'}
                  icon={<UserMinus size={20} className="text-secondary" />}
                  variant="warning"
                />
              </div>
            </div>
          </NcdaDashboardSection>

          {/* ── Attention (authoritative counts only) ── */}
          <NcdaDashboardSection
            title={ncda.dashboard.attentionTitle}
            isLoading={overview.isLoading && !overview.data}
            isError={Boolean(overview.isError)}
            onRetry={() => void overview.refetch()}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <StatCard
                compact
                label={ncda.dashboard.pendingReferralsAttention}
                value={overview.data?.referrals.pending ?? '—'}
                icon={<AlertTriangle size={20} className="text-warning" />}
                variant="warning"
              />
              <StatCard
                compact
                label={ncda.dashboard.severeNutritionAttention}
                value={overview.data?.nutrition.severe ?? '—'}
                icon={<AlertTriangle size={20} className="text-warning" />}
                variant="danger"
              />
              <StatCard
                compact
                label={ncda.dashboard.requiresReferralAttention}
                value={overview.data?.nutrition.requiresReferral ?? '—'}
                icon={<AlertTriangle size={20} className="text-warning" />}
                variant="warning"
              />
            </div>
          </NcdaDashboardSection>

          {/* ── Trends: honest unavailable ── */}
          <section className="space-y-3" aria-labelledby="ncda-trends">
            <h2 id="ncda-trends" className="text-subheading font-semibold text-text">
              {ncda.dashboard.trendsTitle}
            </h2>
            <LiveUnavailableState
              compact
              title={ncda.dashboard.trendsTitle}
              description={ncda.dashboard.trendsUnavailable}
            />
          </section>

          {/* ── Unsupported contracts ── */}
          <section className="space-y-3" aria-labelledby="ncda-unavailable">
            <h2 id="ncda-unavailable" className="text-subheading font-semibold text-text">
              {ncda.dashboard.unavailableTitle}
            </h2>
            <p className="text-caption text-text-secondary">{ncda.dashboard.unavailableIntro}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {NCDA_UNSUPPORTED_METRICS.map((metric) => (
                <Card key={metric.id} padding="md" className="border-border bg-background-subtle/30">
                  <p className="text-body font-medium text-text">{metric.name}</p>
                  <p className="text-caption text-text-secondary mt-1">
                    {ncda.dashboard.metricSource}: {metric.source}
                  </p>
                  <p className="text-caption text-text-secondary mt-1">
                    {metric.unavailableReason}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </PageContent>
    </PageContainer>
  )
}
