import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Baby } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { ListControlBar } from '@/components/ui/ListControlBar'
import {
  AdvancedFiltersDrawer,
  DEFAULT_CHILDREN_ADVANCED,
  isChildrenAdvancedActive,
  type ChildrenAdvancedFilters,
} from '@/components/ui/AdvancedFiltersDrawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ChildCard } from '@/components/caretaker/ChildCard'
import { useData } from '@/contexts/AppContext'
import { caretaker } from '@/locales/rw/caretaker'
import { filterAndSortChildren } from '@/lib/children-utils'

export function ChildrenListPage() {
  const { children, isPresentToday } = useData()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [viewState, setViewState] = useState<'all' | 'waiting'>('waiting')
  const [advanced, setAdvanced] = useState<ChildrenAdvancedFilters>(DEFAULT_CHILDREN_ADVANCED)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const attendanceFilter = viewState === 'waiting' ? 'absent' as const : 'all' as const

  const filtered = useMemo(
    () =>
      filterAndSortChildren({
        children,
        search,
        genderFilter: advanced.gender,
        ageFilter: advanced.age,
        attendanceFilter,
        sort: advanced.sort,
        isPresentToday,
      }),
    [children, search, advanced, attendanceFilter, isPresentToday]
  )

  const hasActiveConfig =
    search.trim() !== '' ||
    viewState !== 'waiting' ||
    isChildrenAdvancedActive(advanced)

  const resetAll = () => {
    setSearch('')
    setViewState('waiting')
    setAdvanced(DEFAULT_CHILDREN_ADVANCED)
  }

  return (
    <CaretakerLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-heading text-text">{caretaker.children.title}</h2>
          <p className="text-body text-text-secondary mt-1">{caretaker.children.subtitle}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary-light text-primary text-caption font-semibold">
            {children.length} abana
          </span>
          <Button variant="primary" size="md" onClick={() => navigate('/caretaker/kwiyandikisha')}>
            {caretaker.dashboard.registerChild}
          </Button>
        </div>
      </div>

      <ListControlBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={caretaker.children.searchPlaceholder}
        viewState={viewState}
        onViewStateChange={setViewState}
        onOpenAdvancedFilters={() => setDrawerOpen(true)}
        hasActiveAdvancedFilters={isChildrenAdvancedActive(advanced)}
      />

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              onView={() => navigate(`/caretaker/abana/${child.id}`)}
              onViewAttendance={() => navigate(`/caretaker/abana/${child.id}?tab=attendance`)}
            />
          ))}
        </div>
      )}

      <AdvancedFiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant="children"
        filters={advanced}
        onApply={(f) => setAdvanced(f as ChildrenAdvancedFilters)}
      />
    </CaretakerLayout>
  )
}
