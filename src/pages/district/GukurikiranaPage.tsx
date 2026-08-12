import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { ActionAlertsList } from '@/components/district/ActionAlertCard'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { env } from '@/config/env'
import { ACTION_ALERTS } from '@/lib/mock-data'
import { useFollowUpAlerts } from '@/features/alerts'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import type { FollowUpAlertCategory, FollowUpAlertViewModel } from '@/models/alerts'

const mockCategories = [
  { id: 'all', label: district.followup.filterAll },
  { id: 'attendance', label: district.followup.filterAttendance },
  { id: 'enrollment', label: district.followup.filterEnrollment },
  { id: 'nutrition', label: district.followup.filterNutrition },
  { id: 'data_quality', label: district.followup.filterDataQuality },
  { id: 'operational', label: district.followup.filterOperational },
] as const

const liveCategories = [
  { id: 'all', label: district.followup.filterAll },
  { id: 'attendance', label: district.followup.filterAttendance },
  { id: 'nutrition', label: district.followup.filterNutrition },
  { id: 'referral', label: district.nav.referrals },
  { id: 'data_quality', label: district.followup.filterDataQuality },
] as const

type LiveCategoryFilter = (typeof liveCategories)[number]['id']
type MockCategoryFilter = (typeof mockCategories)[number]['id']

const priorityStyles = {
  high: { emoji: '🔴', badge: 'bg-error-light text-error border-error/30' },
  medium: { emoji: '🟡', badge: 'bg-warning-light text-warning border-warning/30' },
  low: { emoji: '🟢', badge: 'bg-success-light text-success border-success/30' },
} as const

function LiveFollowUpAlertCard({ alert }: { alert: FollowUpAlertViewModel }) {
  const style = priorityStyles[alert.priority]
  const body = (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0" aria-hidden>
            {style.emoji}
          </span>
          <h3 className="text-body font-bold text-text truncate">
            {alert.centerName ?? alert.title}
          </h3>
        </div>
        <span
          className={`text-caption font-semibold px-2.5 py-1 rounded-full border shrink-0 ${style.badge}`}
        >
          {alert.priority === 'high'
            ? district.followup.priorityHigh
            : alert.priority === 'medium'
              ? district.followup.priorityMedium
              : district.followup.priorityLow}
        </span>
      </div>
      <p className="text-caption text-text-secondary mb-3">{alert.title}</p>
      <p className="text-body text-text mb-4">{alert.description}</p>
      {alert.metrics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {alert.metrics.map((metric) => (
            <span
              key={`${metric.label}-${metric.value}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-subtle text-caption"
            >
              <span className="text-text-secondary">{metric.label}:</span>
              <span className="font-bold text-text">{metric.value}</span>
            </span>
          ))}
        </div>
      )}
      <p className="text-caption text-text-muted mt-3">
        Read-only — nta dismiss/acknowledge kuri API.
      </p>
    </div>
  )

  if (!alert.centerId) {
    return (
      <div className="rounded-xl border border-border bg-surface">{body}</div>
    )
  }

  return (
    <Link
      to={`/district/ibigo/${alert.centerId}`}
      className="block rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-md transition-all group"
    >
      {body}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-background-subtle/50 rounded-b-xl">
        <span className="text-caption font-semibold text-primary">{district.followup.viewCenter}</span>
        <ChevronRight
          size={16}
          className="text-primary opacity-60 group-hover:opacity-100"
          aria-hidden
        />
      </div>
    </Link>
  )
}

function GukurikiranaPageLive() {
  const [category, setCategory] = useState<LiveCategoryFilter>('all')
  const filters = useMemo(
    () => ({
      category: category === 'all' ? undefined : (category as FollowUpAlertCategory),
      limit: 100,
    }),
    [category],
  )
  const alertsQ = useFollowUpAlerts(filters)

  const items = alertsQ.data?.items ?? []
  const counts = alertsQ.data?.counts

  return (
    <DistrictLayout>
      <PageContainer>
        <PageHeader title={district.followup.title} subtitle={district.followup.subtitle} />
        <PageContent className="space-y-6">
          {alertsQ.isError ? (
            <LiveUnavailableState
              title={common.error}
              description="Ntibyashoboye kubona ibyitonderwa kuri API. Ongera ugerageze."
              action={
                <Button type="button" variant="primary" onClick={() => void alertsQ.refetch()}>
                  {common.reset}
                </Button>
              }
            />
          ) : alertsQ.isLoading ? (
            <SkeletonPage label={district.followup.title} stats={3} />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                <div className="h-full [&>div]:h-full">
                  <StatCard
                    compact
                    label={district.followup.totalAlerts}
                    value={alertsQ.data?.total ?? items.length}
                    variant="info"
                  />
                </div>
                <div className="h-full [&>div]:h-full">
                  <StatCard
                    compact
                    label={district.followup.highPriority}
                    value={counts?.high ?? 0}
                    variant="danger"
                  />
                </div>
                <div className="h-full [&>div]:h-full">
                  <StatCard
                    compact
                    label={district.followup.filterAttendance}
                    value={counts?.attendance ?? 0}
                  />
                </div>
              </div>

              <Card padding="lg">
                <SegmentedTabs
                  options={[...liveCategories]}
                  value={category}
                  onChange={setCategory}
                  aria-label={district.followup.title}
                  columns={3}
                />
              </Card>

              {items.length === 0 ? (
                <Card padding="lg" className="border-success/20 bg-success-light/20">
                  <p className="text-body font-semibold text-success">{district.followup.empty}</p>
                  <p className="text-caption text-text-secondary mt-1">
                    {district.followup.emptyDesc}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {items.map((alert) => (
                    <LiveFollowUpAlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              )}
            </>
          )}
        </PageContent>
      </PageContainer>
    </DistrictLayout>
  )
}

function GukurikiranaPageMock() {
  const [category, setCategory] = useState<MockCategoryFilter>('all')
  const highCount = ACTION_ALERTS.filter((a) => a.priority === 'high').length

  return (
    <DistrictLayout>
      <PageContainer>
        <PageHeader title={district.followup.title} subtitle={district.followup.subtitle} />
        <PageContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
            <div className="h-full [&>div]:h-full">
              <StatCard
                compact
                label={district.followup.totalAlerts}
                value={ACTION_ALERTS.length}
                variant="info"
              />
            </div>
            <div className="h-full [&>div]:h-full">
              <StatCard
                compact
                label={district.followup.highPriority}
                value={highCount}
                variant="danger"
              />
            </div>
            <div className="h-full [&>div]:h-full">
              <StatCard
                compact
                label={district.followup.filterAttendance}
                value={ACTION_ALERTS.filter((a) => a.category === 'attendance').length}
              />
            </div>
          </div>

          <Card padding="lg">
            <SegmentedTabs
              options={[...mockCategories]}
              value={category}
              onChange={setCategory}
              aria-label={district.followup.title}
              columns={3}
            />
          </Card>

          <ActionAlertsList category={category} />
        </PageContent>
      </PageContainer>
    </DistrictLayout>
  )
}

export function GukurikiranaPage() {
  if (env.isLive) return <GukurikiranaPageLive />
  return <GukurikiranaPageMock />
}
