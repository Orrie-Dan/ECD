import { useCallback, useEffect, useMemo, useState } from 'react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchFiltersPanel } from '@/components/ui/SearchFiltersPanel'
import { DistrictChildrenFilterBar } from '@/components/district/children/DistrictChildrenFilterBar'
import { DistrictChildrenAppliedFilters } from '@/components/district/children/DistrictChildrenAppliedFilters'
import { ChildrenSummaryCards } from '@/components/district/children/ChildrenSummaryCards'
import { EnrollmentTrendSection } from '@/components/district/children/EnrollmentTrendSection'
import { ChildrenDistribution } from '@/components/district/children/ChildrenDistribution'
import { ChildrenTableSection } from '@/components/district/children/ChildrenTableSection'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { useDebounce } from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import {
  DEFAULT_CHILDREN_SEARCH,
  isChildrenSearchActive,
  type ChildrenSearchFilters,
} from '@/lib/child-filters'
import {
  filterDistrictChildren,
  computeChildrenDistribution,
  getDistrictChildrenSummary,
  getDistrictEnrollmentTrend,
} from '@/lib/district-children-utils'
import { MOCK_CHILDREN, CHILDREN_DISTRIBUTION } from '@/lib/mock-data'
import { env } from '@/config/env'
import { useData } from '@/contexts/AppContext'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import type { EnrollmentPeriod } from '@/types'

const periodLabels: Record<EnrollmentPeriod, string> = {
  today: district.children.periodToday,
  week: district.children.periodWeek,
  month: district.children.periodMonth,
  year: district.children.periodYear,
}

const DEFAULT_PERIOD: EnrollmentPeriod = 'month'

export function DistrictChildrenPage() {
  const { children: liveChildren, childrenLoading, childrenError } = useData()
  // LIVE: never fall back to MOCK_CHILDREN when the API returns empty.
  const childrenSource = env.isLive ? liveChildren : liveChildren.length > 0 ? liveChildren : MOCK_CHILDREN
  const [period, setPeriod] = useState<EnrollmentPeriod>(DEFAULT_PERIOD)
  const [yearMonth, setYearMonth] = useState<string | null>(null)
  const [filters, setFilters] = useState<ChildrenSearchFilters>(DEFAULT_CHILDREN_SEARCH)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isSearchPending, setIsSearchPending] = useState(false)

  const debouncedChildName = useDebounce(filters.childName, 300)

  const effectiveFilters = useMemo(
    () => ({ ...filters, childName: debouncedChildName }),
    [filters, debouncedChildName],
  )

  useEffect(() => {
    setIsSearchPending(filters.childName !== debouncedChildName)
  }, [filters.childName, debouncedChildName])

  useEffect(() => {
    setYearMonth(null)
  }, [period])

  const filteredChildren = useMemo(
    () => filterDistrictChildren(childrenSource, effectiveFilters),
    [childrenSource, effectiveFilters],
  )

  const summary = useMemo(
    () =>
      getDistrictChildrenSummary(
        period,
        filteredChildren.length,
        childrenSource.length,
        effectiveFilters,
        yearMonth,
      ),
    [period, filteredChildren.length, childrenSource.length, effectiveFilters, yearMonth],
  )

  const trendData = useMemo(
    () =>
      getDistrictEnrollmentTrend(
        period,
        filteredChildren.length,
        childrenSource.length,
        effectiveFilters,
        yearMonth,
      ),
    [period, filteredChildren.length, childrenSource.length, effectiveFilters, yearMonth],
  )

  const hasActiveFilters = isChildrenSearchActive(effectiveFilters)

  const distribution = useMemo(() => {
    // LIVE: always compute from the loaded roster — never hardcode CHILDREN_DISTRIBUTION.
    if (env.isLive || hasActiveFilters) {
      return computeChildrenDistribution(filteredChildren)
    }
    return CHILDREN_DISTRIBUTION
  }, [filteredChildren, hasActiveFilters])

  const pagination = usePagination(filteredChildren, {
    resetDeps: [effectiveFilters, period, yearMonth],
  })

  const trendPeriodLabel =
    period === 'year' && yearMonth ? `${periodLabels.year} — ${yearMonth}` : periodLabels[period]

  const hasAdvancedFilters = isChildrenSearchActive(filters, {
    ...DEFAULT_CHILDREN_SEARCH,
    childName: '',
  })

  const showClearFilters =
    period !== DEFAULT_PERIOD ||
    yearMonth !== null ||
    hasActiveFilters ||
    filters.childName.trim().length > 0

  const resetAll = useCallback(() => {
    setFilters(DEFAULT_CHILDREN_SEARCH)
    setPeriod(DEFAULT_PERIOD)
    setYearMonth(null)
  }, [])

  const handleChildNameChange = useCallback((childName: string) => {
    setFilters((prev) => ({ ...prev, childName }))
  }, [])

  const handleSortChange = useCallback((sort: ChildrenSearchFilters['sort']) => {
    setFilters((prev) => ({ ...prev, sort }))
  }, [])

  return (
    <DistrictLayout>
      <PageContainer>
        <PageHeader title={district.children.title} subtitle={district.children.subtitle} />
        <PageContent>
          {env.isLive && childrenLoading ? (
            <SkeletonPage label={district.children.title} stats={4} />
          ) : null}

          {env.isLive && childrenError ? (
            <LiveUnavailableState
              title={common.error}
              description={common.live.unavailableDesc}
              className="mb-4"
            />
          ) : null}

          {env.isLive ? (
            <p className="text-caption text-text-muted mb-4">{common.live.enrollmentKpiLimited}</p>
          ) : null}

          <DistrictChildrenFilterBar
            childName={filters.childName}
            onChildNameChange={handleChildNameChange}
            sort={filters.sort}
            onSortChange={handleSortChange}
            period={period}
            onPeriodChange={setPeriod}
            yearMonth={yearMonth}
            onYearMonthChange={setYearMonth}
            onOpenAdvancedFilters={() => setDrawerOpen(true)}
            onClearFilters={resetAll}
            hasActiveAdvancedFilters={hasAdvancedFilters}
            showClearFilters={showClearFilters}
            searchLoading={isSearchPending}
          />

          <DistrictChildrenAppliedFilters
            period={period}
            yearMonth={yearMonth}
            resultCount={filteredChildren.length}
            searchQuery={debouncedChildName}
            hasAdvancedFilters={hasAdvancedFilters}
            onRemovePeriod={() => setPeriod(DEFAULT_PERIOD)}
            onRemoveMonth={() => setYearMonth(null)}
            onRemoveSearch={() => setFilters((prev) => ({ ...prev, childName: '' }))}
            onClearAll={resetAll}
          />

          {!(env.isLive && childrenLoading) ? (
            <>
              <ChildrenSummaryCards summary={summary} isLoading={isSearchPending} />

              <div className="mb-4">
                <EnrollmentTrendSection period={period} data={trendData} periodLabel={trendPeriodLabel} />
              </div>

              <ChildrenDistribution distribution={distribution} />

              <ChildrenTableSection
                children={pagination.items}
                searchQuery={debouncedChildName}
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                totalPages={pagination.totalPages}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                hasPrevious={pagination.hasPrevious}
                hasNext={pagination.hasNext}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                onResetFilters={resetAll}
                hasActiveFilters={hasActiveFilters}
              />
            </>
          ) : null}

          <SearchFiltersPanel
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            variant="children"
            filters={filters}
            onApply={(next) => setFilters(next as ChildrenSearchFilters)}
          />
        </PageContent>
      </PageContainer>
    </DistrictLayout>
  )
}
