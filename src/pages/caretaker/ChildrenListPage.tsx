import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Baby } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { ListControlBar, type ListViewState } from '@/components/ui/ListControlBar'
import {
  SearchFiltersPanel,
  DEFAULT_CHILDREN_SEARCH,
  isChildrenSearchActive,
  type ChildrenSearchFilters,
} from '@/components/ui/SearchFiltersPanel'
import { FilterResultsBar } from '@/components/ui/FilterResultsBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ChildCard } from '@/components/caretaker/ChildCard'
import { useData } from '@/contexts/AppContext'
import { caretaker } from '@/locales/rw/caretaker'
import { filterAndSortChildren } from '@/lib/children-utils'
import { buildChildrenFilterSummary, hasActiveChildrenFilters } from '@/lib/filter-summary'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'

export function ChildrenListPage() {
  const { children, isPresentToday } = useData()
  const navigate = useNavigate()

  const [filters, setFilters] = useState<ChildrenSearchFilters>(DEFAULT_CHILDREN_SEARCH)
  const [viewState, setViewState] = useState<ListViewState>('waiting')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const attendanceFilter =
    viewState === 'waiting' ? ('absent' as const) : viewState === 'arrived' ? ('present' as const) : ('all' as const)

  const filtered = useMemo(
    () =>
      filterAndSortChildren({
        children,
        filters,
        attendanceFilter,
        isPresentToday,
      }),
    [children, filters, attendanceFilter, isPresentToday],
  )

  const pagination = usePagination(filtered, {
    resetDeps: [filters, viewState],
  })

  const filterSummary = useMemo(
    () => buildChildrenFilterSummary(filters, viewState),
    [filters, viewState],
  )

  const hasActiveConfig = hasActiveChildrenFilters(filters, viewState)

  const resetAll = () => {
    setFilters(DEFAULT_CHILDREN_SEARCH)
    setViewState('waiting')
  }

  return (
    <CaretakerLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="min-w-0">
          <h2 className="text-heading text-text">{caretaker.children.title}</h2>
          <p className="text-body text-text-secondary mt-1">{caretaker.children.subtitle}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-primary-light text-primary text-caption font-semibold">
            {children.length} abana
          </span>
          <Button variant="primary" size="md" onClick={() => navigate('/caretaker/kwiyandikisha')} className="w-full sm:w-auto">
            {caretaker.dashboard.registerChild}
          </Button>
        </div>
      </div>

      <ListControlBar
        childName={filters.childName}
        onChildNameChange={(childName) => setFilters((prev) => ({ ...prev, childName }))}
        viewState={viewState}
        onViewStateChange={(state) => {
          if (state !== 'arrived') setViewState(state)
        }}
        onOpenSearchFilters={() => setDrawerOpen(true)}
        hasActiveSearchFilters={isChildrenSearchActive(filters)}
      />

      {children.length > 0 && (
        <FilterResultsBar
          count={filtered.length}
          summary={hasActiveConfig ? filterSummary : null}
          onClear={resetAll}
          showClear={hasActiveConfig}
        />
      )}

      {children.length === 0 ? (
        <EmptyState
          icon={<Baby size={56} className="text-text-muted" strokeWidth={1.5} />}
          title={caretaker.children.noChildren}
          description={caretaker.children.noChildrenDesc}
          action={
            <Button variant="primary" size="lg" onClick={() => navigate('/caretaker/kwiyandikisha')}>
              {caretaker.dashboard.registerChild}
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Baby size={48} className="text-text-muted" strokeWidth={1.5} />}
          title={caretaker.children.noResults}
          description={caretaker.children.noResultsDesc}
          action={
            hasActiveConfig ? (
              <Button variant="tertiary" size="md" onClick={resetAll}>
                {caretaker.children.resetFilters}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pagination.items.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onView={() => navigate(`/caretaker/abana/${child.id}`)}
                onViewAttendance={() => navigate(`/caretaker/abana/${child.id}?tab=attendance`)}
              />
            ))}
          </div>
          <Pagination
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
          />
        </>
      )}

      <SearchFiltersPanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant="children"
        filters={filters}
        onApply={(f) => setFilters(f as ChildrenSearchFilters)}
      />
    </CaretakerLayout>
  )
}
