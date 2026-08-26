import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { ActionAlertsList } from '@/components/district/ActionAlertCard'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { EnhancedPieChart } from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import { env } from '@/config/env'
import { ACTION_ALERTS } from '@/lib/mock-data'
import { useFollowUpAlerts } from '@/features/alerts'
import { buildChildDetailPath } from '@/lib/child-routes'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { DISTRICT_PATHS } from '@/layouts/district/navigation'
import type { FollowUpAlertCategory, FollowUpAlertViewModel } from '@/models/alerts'

const OPERATIONAL_CATEGORIES = ['attendance', 'nutrition', 'data_quality'] as const

const liveCategories = [
  { id: 'all', label: district.followup.filterAll },
  { id: 'attendance', label: district.followup.filterAttendance },
  { id: 'nutrition', label: district.followup.filterNutrition },
  { id: 'data_quality', label: district.followup.filterDataQuality },
] as const

const mockCategories = [
  { id: 'all', label: district.followup.filterAll },
  { id: 'attendance', label: district.followup.filterAttendance },
  { id: 'nutrition', label: district.followup.filterNutrition },
  { id: 'data_quality', label: district.followup.filterDataQuality },
] as const

type LiveCategoryFilter = (typeof liveCategories)[number]['id']
type MockCategoryFilter = (typeof mockCategories)[number]['id']

const liveCategoryLabels: Record<(typeof OPERATIONAL_CATEGORIES)[number], string> = {
  attendance: district.followup.filterAttendance,
  nutrition: district.followup.filterNutrition,
  data_quality: district.followup.filterDataQuality,
}

const priorityStyles = {
  high: { emoji: '🔴', badge: 'bg-error !text-white border-error' },
  medium: { emoji: '🟡', badge: 'bg-warning !text-white border-warning' },
  low: { emoji: '🟢', badge: 'bg-success !text-white border-success' },
} as const

function isOperationalCategory(
  category: FollowUpAlertCategory,
): category is (typeof OPERATIONAL_CATEGORIES)[number] {
  return (OPERATIONAL_CATEGORIES as readonly string[]).includes(category)
}

function suggestedActionFor(alert: FollowUpAlertViewModel): string {
  if (alert.category === 'attendance') return district.followup.contactCenter
  if (alert.category === 'nutrition') return district.followup.reviewNutrition
  if (alert.category === 'data_quality') return district.followup.verifyRecords
  return district.followup.supportCaretaker
}

function formatDetectedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('rw-RW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function LiveFollowUpAlertCard({ alert }: { alert: FollowUpAlertViewModel }) {
  const style = priorityStyles[alert.priority]
  const categoryLabel = isOperationalCategory(alert.category)
    ? liveCategoryLabels[alert.category]
    : alert.category
  const childHref =
    alert.childId && alert.childName
      ? buildChildDetailPath(DISTRICT_PATHS.children, {
          id: alert.childId,
          fullName: alert.childName,
        })
      : null
  const centerHref = alert.centerId ? `${DISTRICT_PATHS.centers}/${alert.centerId}` : null

  const body = (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-body font-bold text-text truncate">
            {alert.centerName ?? alert.title}
          </h3>
          <p className="text-caption text-text-secondary mt-1">
            {categoryLabel}
            {alert.detectedAt ? ` · ${district.followup.detectedAt} ${formatDetectedAt(alert.detectedAt)}` : ''}
          </p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full border shrink-0 text-[0.875rem] font-semibold ${style.badge}`}
        >
          <span aria-hidden>{style.emoji} </span>
          {alert.priority === 'high'
            ? district.followup.priorityHigh
            : alert.priority === 'medium'
              ? district.followup.priorityMedium
              : district.followup.priorityLow}
        </span>
      </div>

      <p className="text-body text-text mb-3">{alert.description || alert.title}</p>

      {alert.childName ? (
        <p className="text-caption text-text-secondary mb-3">
          {district.followup.childLabel}:{' '}
          <span className="font-semibold text-text">{alert.childName}</span>
        </p>
      ) : null}

      {alert.metrics.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
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
      ) : null}

      <div className="rounded-lg border border-primary bg-primary px-4 py-3">
        <p className="text-[0.875rem] font-semibold !text-white mb-1">
          {district.followup.suggestedAction}
        </p>
        <p className="text-body !text-white">{suggestedActionFor(alert)}</p>
      </div>
    </div>
  )

  const footer = (label: string) => (
    <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-background-subtle/50 rounded-b-xl">
      <span className="text-caption font-semibold text-primary">{label}</span>
      <ChevronRight
        size={16}
        className="text-primary opacity-60 group-hover:opacity-100"
        aria-hidden
      />
    </div>
  )

  if (childHref) {
    return (
      <Link
        to={childHref}
        className="block rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-md transition-all group"
      >
        {body}
        {footer(district.followup.viewChild)}
      </Link>
    )
  }

  if (centerHref) {
    return (
      <Link
        to={centerHref}
        className="block rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-md transition-all group"
      >
        {body}
        {footer(district.followup.viewCenter)}
      </Link>
    )
  }

  return <div className="rounded-xl border border-border bg-surface">{body}</div>
}

function GukurikiranaPageLive() {
  const [category, setCategory] = useState<LiveCategoryFilter>('all')
  const filters = useMemo(
    () => ({
      category: category === 'all' ? undefined : category,
      limit: 100,
    }),
    [category],
  )
  const alertsQ = useFollowUpAlerts(filters)

  const items = useMemo(
    () => (alertsQ.data?.items ?? []).filter((item) => isOperationalCategory(item.category)),
    [alertsQ.data?.items],
  )
  const counts = alertsQ.data?.counts
  const operationalTotal =
    (counts?.attendance ?? 0) + (counts?.nutrition ?? 0) + (counts?.data_quality ?? 0)

  return (
    <PageContainer>
      <PageHeader title={district.followup.title} subtitle={district.followup.subtitle} />
      <PageContent className="space-y-6">
        {alertsQ.isError ? (
          <LiveUnavailableState
            title={common.error}
            description={district.followup.loadError}
            action={
              <Button type="button" variant="primary" onClick={() => void alertsQ.refetch()}>
                {common.reset}
              </Button>
            }
          />
        ) : alertsQ.isLoading ? (
          <SkeletonPage label={district.followup.title} stats={4} />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
              <StatCard
                compact
                filled
                label={district.followup.totalAlerts}
                value={operationalTotal || items.length}
                variant="info"
              />
              <StatCard
                compact
                filled
                label={district.followup.highPriority}
                value={items.filter((item) => item.priority === 'high').length}
                variant="danger"
              />
              <StatCard
                compact
                filled
                label={district.followup.filterAttendance}
                value={counts?.attendance ?? 0}
              />
              <StatCard
                compact
                filled
                label={district.followup.filterNutrition}
                value={counts?.nutrition ?? 0}
                variant="warning"
              />
            </div>

            <FollowUpCharts
              categorySlices={[
                {
                  name: district.followup.filterAttendance,
                  value: counts?.attendance ?? 0,
                  color: CHART_METRIC_COLORS.attendance,
                },
                {
                  name: district.followup.filterNutrition,
                  value: counts?.nutrition ?? 0,
                  color: CHART_METRIC_COLORS.nutritionSevere,
                },
                {
                  name: district.followup.filterDataQuality,
                  value: counts?.data_quality ?? 0,
                  color: CHART_METRIC_COLORS.teachers,
                },
              ]}
              items={items}
            />

            <Card padding="lg">
              <SegmentedTabs
                options={[...liveCategories]}
                value={category}
                onChange={setCategory}
                aria-label={district.followup.title}
                columns={4}
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
  )
}

function GukurikiranaPageMock() {
  const [category, setCategory] = useState<MockCategoryFilter>('all')
  const operationalAlerts = ACTION_ALERTS.filter(
    (alert) =>
      alert.type !== 'referral_required' &&
      alert.category !== 'enrollment' &&
      alert.category !== 'operational',
  )
  const visible =
    category === 'all'
      ? operationalAlerts
      : operationalAlerts.filter((alert) => alert.category === category)
  const highCount = operationalAlerts.filter((a) => a.priority === 'high').length

  return (
    <PageContainer>
      <PageHeader title={district.followup.title} subtitle={district.followup.subtitle} />
      <PageContent className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
          <StatCard
            compact
            filled
            label={district.followup.totalAlerts}
            value={operationalAlerts.length}
            variant="info"
          />
          <StatCard
            compact
            filled
            label={district.followup.highPriority}
            value={highCount}
            variant="danger"
          />
          <StatCard
            compact
            filled
            label={district.followup.filterAttendance}
            value={operationalAlerts.filter((a) => a.category === 'attendance').length}
          />
          <StatCard
            compact
            filled
            label={district.followup.filterNutrition}
            value={operationalAlerts.filter((a) => a.category === 'nutrition').length}
            variant="warning"
          />
        </div>

        <FollowUpCharts
          categorySlices={mockCategories
            .filter((c) => c.id !== 'all')
            .map((c) => ({
              name: c.label,
              value: operationalAlerts.filter((a) => a.category === c.id).length,
            }))}
          items={visible}
        />

        <Card padding="lg">
          <SegmentedTabs
            options={[...mockCategories]}
            value={category}
            onChange={setCategory}
            aria-label={district.followup.title}
            columns={4}
          />
        </Card>

        <ActionAlertsList category={category} />
      </PageContent>
    </PageContainer>
  )
}

function FollowUpCharts({
  categorySlices,
  items,
}: {
  categorySlices: Array<{ name: string; value: number; color?: string }>
  items: Array<{ priority: 'high' | 'medium' | 'low' }>
}) {
  const prioritySlices = [
    {
      name: district.followup.priorityHigh,
      value: items.filter((item) => item.priority === 'high').length,
      color: CHART_METRIC_COLORS.dropouts,
    },
    {
      name: district.followup.priorityMedium,
      value: items.filter((item) => item.priority === 'medium').length,
      color: CHART_METRIC_COLORS.alerts,
    },
    {
      name: district.followup.priorityLow,
      value: items.filter((item) => item.priority === 'low').length,
      color: CHART_METRIC_COLORS.attendance,
    },
  ]
  const emptyChart = {
    emptyMessage: district.followup.chartEmpty,
    emptyDescription: district.followup.chartEmptyDesc,
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card padding="md" className="space-y-2 bg-white">
        <h2 className="text-body font-semibold text-text">{district.followup.chartByCategory}</h2>
        <EnhancedPieChart
          data={categorySlices}
          ariaLabel={district.followup.chartByCategory}
          centerValue={String(categorySlices.reduce((sum, slice) => sum + slice.value, 0))}
          centerLabel={district.followup.totalAlerts}
          tone="white"
          {...emptyChart}
        />
      </Card>
      <Card padding="md" className="space-y-2 bg-white">
        <h2 className="text-body font-semibold text-text">{district.followup.chartByPriority}</h2>
        <EnhancedPieChart
          data={prioritySlices}
          ariaLabel={district.followup.chartByPriority}
          centerValue={String(prioritySlices[0]?.value ?? 0)}
          centerLabel={district.followup.highPriority}
          tone="white"
          {...emptyChart}
        />
      </Card>
    </div>
  )
}

export function GukurikiranaPage() {
  if (env.isLive) return <GukurikiranaPageLive />
  return <GukurikiranaPageMock />
}
