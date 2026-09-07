import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SelectInput } from '@/components/ui/FormField'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { SkeletonPage } from '@/components/ui/Skeleton'
import {
  LiveFollowUpAlertCard,
  isOperationalFollowUpCategory,
  type FollowUpCopy,
} from '@/components/follow-up/FollowUpAlertCard'
import type { FollowUpSummaryNode } from '@/api/resources/alerts-summary'
import { useFollowUpAlerts, useFollowUpSummary } from '@/features/alerts'
import { common } from '@/locales/rw/common'

export type AlertHierarchyLevel = 'province' | 'district' | 'sector' | 'center' | 'child'

export type AlertHierarchyCrumb = {
  level: AlertHierarchyLevel
  id: string
  name: string
}

export type AlertHierarchyCopy = FollowUpCopy & {
  title: string
  subtitle: string
  hierarchyTitle: string
  hierarchySubtitle: string
  countryRoot?: string
  areasNeedingAttention: string
  issuesCount: string
  mainConcerns: string
  breadcrumbAria: string
  empty: string
  emptyDesc: string
  emptyLevel: string
  emptyLevelDesc: string
  filterAll: string
  filterAttendance: string
  filterNutrition: string
  filterDataQuality: string
  filterReferral: string
  filterPriority: string
  filterCategory: string
  childCasesTitle: string
  openLevel: string
  backLevel: string
  loadError: string
  totalAlerts: string
  highPriority: string
}

export type AlertHierarchyFilters = {
  category: 'all' | 'attendance' | 'nutrition' | 'data_quality' | 'referral'
  priority: 'all' | 'high' | 'medium' | 'low'
}

type Props = {
  /** Root grain for this portal (province for NCDA, sector for district). */
  rootLevel: 'province' | 'sector'
  /** Fixed district for district officers; omitted for NCDA national start. */
  lockedDistrictId?: string
  lockedDistrictName?: string
  crumbs: AlertHierarchyCrumb[]
  onNavigate: (crumbs: AlertHierarchyCrumb[]) => void
  filters: AlertHierarchyFilters
  onFiltersChange: (next: AlertHierarchyFilters) => void
  copy: AlertHierarchyCopy
  childrenBasePath: string
  centersBasePath: string
}

function nextLevel(current: AlertHierarchyLevel): AlertHierarchyLevel | null {
  switch (current) {
    case 'province':
      return 'district'
    case 'district':
      return 'sector'
    case 'sector':
      return 'center'
    case 'center':
      return 'child'
    default:
      return null
  }
}

function groupByForCrumbs(
  rootLevel: 'province' | 'sector',
  crumbs: AlertHierarchyCrumb[],
): 'province' | 'district' | 'sector' | 'center' | 'child' {
  if (crumbs.length === 0) return rootLevel
  const last = crumbs[crumbs.length - 1]!
  return nextLevel(last.level) ?? 'child'
}

function scopeFromCrumbs(crumbs: AlertHierarchyCrumb[], lockedDistrictId?: string) {
  const scope: {
    provinceId?: string
    districtId?: string
    sectorId?: string
    centerId?: string
  } = {}
  if (lockedDistrictId) scope.districtId = lockedDistrictId
  for (const crumb of crumbs) {
    if (crumb.level === 'province') scope.provinceId = crumb.id
    if (crumb.level === 'district') scope.districtId = crumb.id
    if (crumb.level === 'sector') scope.sectorId = crumb.id
    if (crumb.level === 'center') scope.centerId = crumb.id
  }
  return scope
}

export function AlertHierarchyDrilldown({
  rootLevel,
  lockedDistrictId,
  lockedDistrictName,
  crumbs,
  onNavigate,
  filters,
  onFiltersChange,
  copy,
  childrenBasePath,
  centersBasePath,
}: Props) {
  const grain = groupByForCrumbs(rootLevel, crumbs)
  const scope = scopeFromCrumbs(crumbs, lockedDistrictId)
  const atChildLevel = grain === 'child'
  const centerCrumb = crumbs.find((c) => c.level === 'center')

  const summaryQ = useFollowUpSummary(
    {
      groupBy: atChildLevel ? 'center' : grain,
      ...scope,
      category: filters.category === 'all' ? undefined : filters.category,
      priority: filters.priority,
    },
    !atChildLevel,
  )

  const casesQ = useFollowUpAlerts(
    {
      centerId: centerCrumb?.id,
      districtId: lockedDistrictId ?? scope.districtId,
      category: filters.category === 'all' ? undefined : filters.category,
      limit: 200,
    },
    atChildLevel && Boolean(centerCrumb?.id),
  )

  const categoryOptions = [
    { id: 'all' as const, label: copy.filterAll },
    { id: 'attendance' as const, label: copy.filterAttendance },
    { id: 'nutrition' as const, label: copy.filterNutrition },
    { id: 'referral' as const, label: copy.filterReferral },
    { id: 'data_quality' as const, label: copy.filterDataQuality },
  ]

  const priorityOptions = [
    { id: 'all' as const, label: copy.filterAll },
    { id: 'high' as const, label: copy.priorityHigh },
    { id: 'medium' as const, label: copy.priorityMedium },
    { id: 'low' as const, label: copy.priorityLow },
  ]

  const breadcrumbItems = useMemo(() => {
    const rootName =
      rootLevel === 'province'
        ? (copy.countryRoot ?? copy.title)
        : (lockedDistrictName ?? copy.title)
    return [
      { level: rootLevel === 'province' ? ('country' as const) : ('district' as const), id: 'root', name: rootName },
      ...crumbs,
    ]
  }, [copy.countryRoot, copy.title, crumbs, lockedDistrictName, rootLevel])

  function handleCrumbClick(index: number) {
    if (index <= 0) {
      onNavigate([])
      return
    }
    onNavigate(crumbs.slice(0, index))
  }

  function handleNodeClick(node: FollowUpSummaryNode) {
    const level = node.level as AlertHierarchyLevel
    const next: AlertHierarchyCrumb = { level, id: node.id, name: node.name }
    if (level === 'province') onNavigate([next])
    else if (level === 'district') {
      const province = crumbs.find((c) => c.level === 'province')
      onNavigate(province ? [province, next] : [next])
    } else if (level === 'sector') {
      const keep = crumbs.filter((c) => c.level === 'province' || c.level === 'district')
      if (lockedDistrictId && !keep.some((c) => c.level === 'district')) {
        keep.push({
          level: 'district',
          id: lockedDistrictId,
          name: lockedDistrictName ?? lockedDistrictId,
        })
      }
      onNavigate([...keep, next])
    } else if (level === 'center') {
      const keep = crumbs.filter((c) => c.level !== 'center' && c.level !== 'child')
      onNavigate([...keep, next])
    }
  }

  const summaryItems = summaryQ.data?.items ?? []
  const childItems = useMemo(() => {
    const items = (casesQ.data?.items ?? []).filter(
      (item) =>
        isOperationalFollowUpCategory(item.category) || item.category === 'referral',
    )
    if (filters.priority === 'all') return items
    return items.filter((item) => item.priority === filters.priority)
  }, [casesQ.data?.items, filters.priority])

  const isLoading = atChildLevel ? casesQ.isLoading : summaryQ.isLoading
  const isError = atChildLevel ? casesQ.isError : summaryQ.isError
  const refetch = () => {
    if (atChildLevel) void casesQ.refetch()
    else void summaryQ.refetch()
  }

  const totalAlerts = atChildLevel
    ? childItems.length
    : (summaryQ.data?.totalAlerts ?? 0)
  const highPriority = atChildLevel
    ? childItems.filter((i) => i.priority === 'high').length
    : (summaryQ.data?.highPriority ?? 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-caption font-semibold text-text-secondary">
            {copy.filterCategory}
          </label>
          <SelectInput
            value={filters.category}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                category: e.target.value as AlertHierarchyFilters['category'],
              })
            }
          >
            {categoryOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </SelectInput>
        </div>
        <div>
          <label className="mb-1 block text-caption font-semibold text-text-secondary">
            {copy.filterPriority}
          </label>
          <SelectInput
            value={filters.priority}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                priority: e.target.value as AlertHierarchyFilters['priority'],
              })
            }
          >
            {priorityOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </SelectInput>
        </div>
      </div>

      <nav aria-label={copy.breadcrumbAria} className="flex flex-wrap items-center gap-1 text-caption">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1
          return (
            <span key={`${item.level}-${item.id}`} className="inline-flex items-center gap-1">
              {index > 0 ? <span className="text-text-muted">›</span> : null}
              {isLast ? (
                <span className="font-semibold text-text">{item.name}</span>
              ) : (
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => handleCrumbClick(index)}
                >
                  {item.name}
                </button>
              )}
            </span>
          )
        })}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard compact filled label={copy.totalAlerts} value={totalAlerts} variant="info" />
        <StatCard
          compact
          filled
          label={copy.highPriority}
          value={highPriority}
          variant="danger"
        />
      </div>

      {crumbs.length > 0 ? (
        <div>
          <Button type="button" variant="secondary" size="sm" onClick={() => handleCrumbClick(crumbs.length - 1)}>
            {copy.backLevel}
          </Button>
        </div>
      ) : null}

      {isError ? (
        <LiveUnavailableState
          title={common.error}
          description={copy.loadError}
          action={
            <Button type="button" variant="primary" onClick={() => void refetch()}>
              {common.reset}
            </Button>
          }
        />
      ) : isLoading ? (
        <SkeletonPage label={copy.title} stats={4} />
      ) : atChildLevel ? (
        childItems.length === 0 ? (
          <Card padding="lg" className="border-success/20 bg-success-light/20">
            <p className="text-body font-semibold text-success">{copy.emptyLevel}</p>
            <p className="text-caption text-text-secondary mt-1">{copy.emptyLevelDesc}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            <h2 className="text-subheading text-text">{copy.childCasesTitle}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {childItems.map((alert) => (
                <LiveFollowUpAlertCard
                  key={alert.id}
                  alert={alert}
                  copy={copy}
                  childrenBasePath={childrenBasePath}
                  centersBasePath={centersBasePath}
                />
              ))}
            </div>
          </div>
        )
      ) : summaryItems.length === 0 ? (
        <Card padding="lg" className="border-success/20 bg-success-light/20">
          <p className="text-body font-semibold text-success">{copy.empty}</p>
          <p className="text-caption text-text-secondary mt-1">{copy.emptyDesc}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          <div>
            <h2 className="text-subheading text-text">{copy.hierarchyTitle}</h2>
            <p className="text-caption text-text-secondary mt-1">{copy.areasNeedingAttention}</p>
          </div>
          <ul className="space-y-3">
            {summaryItems.map((node) => (
              <li key={node.id}>
                <HierarchyNodeCard
                  node={node}
                  copy={copy}
                  onOpen={() => handleNodeClick(node)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {!atChildLevel && summaryItems.length > 0 ? (
        <Card padding="md">
          <SegmentedTabs
            options={categoryOptions}
            value={filters.category}
            onChange={(value) => onFiltersChange({ ...filters, category: value })}
            aria-label={copy.filterCategory}
            columns={5}
          />
        </Card>
      ) : null}
    </div>
  )
}

function HierarchyNodeCard({
  node,
  copy,
  onOpen,
}: {
  node: FollowUpSummaryNode
  copy: AlertHierarchyCopy
  onOpen: () => void
}) {
  const concerns = [
    { key: 'nutrition', label: copy.filterNutrition, value: node.categoryCounts.nutrition },
    { key: 'attendance', label: copy.filterAttendance, value: node.categoryCounts.attendance },
    { key: 'referral', label: copy.filterReferral, value: node.categoryCounts.referral },
    {
      key: 'data_quality',
      label: copy.filterDataQuality,
      value: node.categoryCounts.data_quality,
    },
  ].filter((c) => c.value > 0)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-md transition-all group p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-body font-bold text-text truncate">{node.name}</h3>
          <p className="text-caption text-text-secondary mt-1">
            {node.total} {copy.issuesCount}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-caption font-semibold text-primary shrink-0">
          {copy.openLevel}
          <ChevronRight size={16} className="opacity-60 group-hover:opacity-100" />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {node.priorityCounts.high > 0 ? (
          <span className="px-2.5 py-1 rounded-full border bg-error !text-white border-error text-[0.875rem] font-semibold">
            {node.priorityCounts.high} {copy.priorityHigh}
          </span>
        ) : null}
        {node.priorityCounts.medium > 0 ? (
          <span className="px-2.5 py-1 rounded-full border bg-warning !text-white border-warning text-[0.875rem] font-semibold">
            {node.priorityCounts.medium} {copy.priorityMedium}
          </span>
        ) : null}
        {node.priorityCounts.low > 0 ? (
          <span className="px-2.5 py-1 rounded-full border bg-success !text-white border-success text-[0.875rem] font-semibold">
            {node.priorityCounts.low} {copy.priorityLow}
          </span>
        ) : null}
      </div>

      {concerns.length > 0 ? (
        <div className="mt-3">
          <p className="text-[0.875rem] font-semibold text-text-secondary mb-1">
            {copy.mainConcerns}
          </p>
          <div className="flex flex-wrap gap-2">
            {concerns.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-subtle text-caption"
              >
                <span className="text-text-secondary">{c.label}</span>
                <span className="font-bold text-text">{c.value}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </button>
  )
}

/** Optional deep-link helper kept for overview cards. */
export function AlertHierarchyExternalLink({
  to,
  label,
}: {
  to: string
  label: string
}) {
  return (
    <Link to={to} className="text-caption font-semibold text-primary hover:underline">
      {label}
    </Link>
  )
}
