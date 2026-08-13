import { useCallback, useMemo, useState } from 'react'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchFiltersPanel } from '@/components/ui/SearchFiltersPanel'
import { DistrictChildrenFilterBar } from '@/components/district/children/DistrictChildrenFilterBar'
import { DistrictChildrenAppliedFilters } from '@/components/district/children/DistrictChildrenAppliedFilters'
import { ChildrenTableSection } from '@/components/district/children/ChildrenTableSection'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { useDebounce } from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import {
  DEFAULT_CHILDREN_SEARCH,
  isChildrenSearchActive,
  type ChildrenSearchFilters,
} from '@/lib/child-filters'
import { filterDistrictChildren } from '@/lib/district-children-utils'
import { MOCK_CHILDREN } from '@/lib/mock-data'
import { env } from '@/config/env'
import { useData } from '@/contexts/AppContext'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import type { EnrollmentPeriod } from '@/types'
import { DEFAULT_PAGE_SIZE } from '@/types'
import { useDistrictChildrenList } from '@/features/district/children/queries'
import type { ChildrenListFilters } from '@/models/child'

const DEFAULT_PERIOD: EnrollmentPeriod = 'month'

export function DistrictChildrenPage() {
  return env.isLive ? <DistrictChildrenPageLive /> : <DistrictChildrenPageMock />
}

function sanitizeLiveChildrenFilters(filters: ChildrenSearchFilters): ChildrenSearchFilters {
  return {
    ...filters,
    // Children API only supports `centerId`, `status`, `search`, `page`, `pageSize`.
    // In LIVE mode we keep the UX but ignore unsupported filters functionally.
    guardianName: '',
    guardianRelation: '',
    gender: 'all',
    age: 'all',
    province: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
  }
}

function DistrictChildrenPageLive() {
  const [period, setPeriod] = useState<EnrollmentPeriod>(DEFAULT_PERIOD)
  const [yearMonth, setYearMonth] = useState<string | null>(null)
  const [filters, setFilters] = useState<ChildrenSearchFilters>(DEFAULT_CHILDREN_SEARCH)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const debouncedChildName = useDebounce(filters.childName, 300)

  const effectiveFilters = useMemo(
    () => ({ ...filters, childName: debouncedChildName }),
    [filters, debouncedChildName],
  )

  const liveFilters = useMemo(() => sanitizeLiveChildrenFilters(effectiveFilters), [effectiveFilters])

  const isSearchPending = filters.childName !== debouncedChildName

  const apiFilters = useMemo(() => {
    const status: ChildrenListFilters['status'] =
      liveFilters.status === 'active'
        ? 'active'
        : liveFilters.status === 'archived'
          ? 'archived'
          : undefined
    const search = liveFilters.childName.trim().length > 0 ? liveFilters.childName.trim() : undefined
    return {
      page,
      pageSize,
      status,
      search,
    }
  }, [liveFilters.childName, liveFilters.status, page, pageSize])

  const childrenQuery = useDistrictChildrenList(apiFilters, true)
  const total = childrenQuery.data?.total ?? 0
  const totalPages = childrenQuery.data?.totalPages ?? 0
  const serverPage = childrenQuery.data?.page ?? page
  const serverPageSize = childrenQuery.data?.pageSize ?? pageSize

  const sortedChildren = useMemo(() => {
    const items = childrenQuery.data?.items ?? []
    return [...items].sort((a, b) => {
      switch (liveFilters.sort) {
        case 'name-desc':
          return b.fullName.localeCompare(a.fullName, 'rw')
        case 'registered-desc':
          return b.registeredAt.localeCompare(a.registeredAt)
        case 'name-asc':
        default:
          return a.fullName.localeCompare(b.fullName, 'rw')
      }
    })
  }, [childrenQuery.data?.items, liveFilters.sort])

  const hasActiveFilters = isChildrenSearchActive(liveFilters)

  const hasAdvancedFilters = isChildrenSearchActive(liveFilters, {
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
    setPage(1)
  }, [])

  const handleChildNameChange = useCallback((childName: string) => {
    setFilters((prev) => ({ ...prev, childName }))
    setPage(1)
  }, [])

  const handleSortChange = useCallback((sort: ChildrenSearchFilters['sort']) => {
    setFilters((prev) => ({ ...prev, sort }))
  }, [])

  const handlePeriodChange = useCallback((next: EnrollmentPeriod) => {
    setPeriod(next)
    setYearMonth(null)
    setPage(1)
  }, [])

  const startIndex = total === 0 ? 0 : (serverPage - 1) * serverPageSize + 1
  const endIndex = Math.min(serverPage * serverPageSize, total)
  const hasPrevious = serverPage > 1
  const hasNext = serverPage < totalPages

  return (
    <>
      <PageContainer>
        <PageHeader title={district.children.title} subtitle={district.children.subtitle} />
        <PageContent>
          {childrenQuery.isLoading ? <SkeletonPage label={district.children.title} stats={4} /> : null}

          {childrenQuery.isError ? (
            <LiveUnavailableState
              title={common.error}
              description={common.live.unavailableDesc}
              className="mb-4"
              action={
                <Button type="button" variant="primary" onClick={() => void childrenQuery.refetch()}>
                  {common.reset}
                </Button>
              }
            />
          ) : null}

          <p className="text-caption text-text-muted mb-4">{common.live.enrollmentKpiLimited}</p>

          <p className="text-caption text-text-muted mb-4">
            LIVE: Gushakisha (amazina) na `status` bigakurikizwa kuri API.
            Izindi filter (umubyeyi/igitsina/imyaka/ahantu) ziboneka muri MOCK gusa.
          </p>

          <DistrictChildrenFilterBar
            childName={filters.childName}
            onChildNameChange={handleChildNameChange}
            sort={filters.sort}
            onSortChange={handleSortChange}
            period={period}
            onPeriodChange={handlePeriodChange}
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
            resultCount={total}
            searchQuery={debouncedChildName}
            hasAdvancedFilters={hasAdvancedFilters}
            onRemovePeriod={() => {
              setPeriod(DEFAULT_PERIOD)
              setYearMonth(null)
              setPage(1)
            }}
            onRemoveMonth={() => setYearMonth(null)}
            onRemoveSearch={() => {
              setPage(1)
              setFilters((prev) => ({ ...prev, childName: '' }))
            }}
            onClearAll={resetAll}
          />

          {!childrenQuery.isLoading ? (
            <>
              <ChildrenTableSection
                children={sortedChildren}
                searchQuery={debouncedChildName}
                page={serverPage}
                pageSize={serverPageSize}
                total={total}
                totalPages={totalPages}
                startIndex={startIndex}
                endIndex={endIndex}
                hasPrevious={hasPrevious}
                hasNext={hasNext}
                onPageChange={(next) => setPage(next)}
                onPageSizeChange={(next) => {
                  setPageSize(next)
                  setPage(1)
                }}
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
            onApply={(next) => {
              setPage(1)
              setFilters(sanitizeLiveChildrenFilters(next as ChildrenSearchFilters))
            }}
          />
        </PageContent>
      </PageContainer>
    </>
  )
}

function DistrictChildrenPageMock() {
  const { children: liveChildren, childrenLoading, childrenError } = useData()
  // MOCK: keep the existing offline-first behavior and mock fallback.
  const childrenSource = liveChildren.length > 0 ? liveChildren : MOCK_CHILDREN
  const [period, setPeriod] = useState<EnrollmentPeriod>(DEFAULT_PERIOD)
  const [yearMonth, setYearMonth] = useState<string | null>(null)
  const [filters, setFilters] = useState<ChildrenSearchFilters>(DEFAULT_CHILDREN_SEARCH)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const debouncedChildName = useDebounce(filters.childName, 300)

  const effectiveFilters = useMemo(
    () => ({ ...filters, childName: debouncedChildName }),
    [filters, debouncedChildName],
  )

  const isSearchPending = filters.childName !== debouncedChildName

  const filteredChildren = useMemo(
    () => filterDistrictChildren(childrenSource, effectiveFilters),
    [childrenSource, effectiveFilters],
  )

  const hasActiveFilters = isChildrenSearchActive(effectiveFilters)

  const pagination = usePagination(filteredChildren, {
    resetDeps: [effectiveFilters, period, yearMonth],
  })

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

  const handlePeriodChange = useCallback((next: EnrollmentPeriod) => {
    setPeriod(next)
    setYearMonth(null)
  }, [])

  return (
    <>
      <PageContainer>
        <PageHeader title={district.children.title} subtitle={district.children.subtitle} />
        <PageContent>
          {childrenLoading ? <SkeletonPage label={district.children.title} stats={4} /> : null}

          {childrenError ? (
            <LiveUnavailableState
              title={common.error}
              description={common.live.unavailableDesc}
              className="mb-4"
            />
          ) : null}

          <DistrictChildrenFilterBar
            childName={filters.childName}
            onChildNameChange={handleChildNameChange}
            sort={filters.sort}
            onSortChange={handleSortChange}
            period={period}
            onPeriodChange={handlePeriodChange}
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
            onRemovePeriod={() => {
              setPeriod(DEFAULT_PERIOD)
              setYearMonth(null)
            }}
            onRemoveMonth={() => setYearMonth(null)}
            onRemoveSearch={() => setFilters((prev) => ({ ...prev, childName: '' }))}
            onClearAll={resetAll}
          />

          {!childrenLoading ? (
            <>
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
    </>
  )
}
