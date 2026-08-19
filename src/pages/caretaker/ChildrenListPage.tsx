import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Baby } from 'lucide-react'
import { ClassroomCards } from '@/components/classrooms/ClassroomCards'
import { ClassroomBackLink } from '@/components/classrooms/ClassroomBackLink'
import { useClassroomGateway } from '@/hooks/useClassroomGateway'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import {
  ListControlBar,
  CHILDREN_VIEW_OPTIONS,
  type ListViewState,
} from '@/components/ui/ListControlBar'
import {
  SearchFiltersPanel,
  DEFAULT_CHILDREN_SEARCH,
  isChildrenSearchActive,
  type ChildrenSearchFilters,
} from '@/components/ui/SearchFiltersPanel'
import { FilterResultsBar } from '@/components/ui/FilterResultsBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { OfflineEmptyState } from '@/components/offline/OfflineEmptyState'
import { Button } from '@/components/ui/Button'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { ChildCard } from '@/components/caretaker/ChildCard'
import {
  MeasurementDialog,
  type MeasurementDialogResult,
} from '@/components/growth/MeasurementDialog'
import { ArchiveDialog } from '@/components/children/ArchiveDialog'
import { ReactivateChildDialog } from '@/components/children/ReactivateChildDialog'
import { useAuth, useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { caretaker } from '@/locales/rw/caretaker'
import { filterAndSortChildren } from '@/lib/children-utils'
import { buildChildDetailPath, buildChildEditPath } from '@/lib/child-routes'
import { buildChildrenFilterSummary, hasActiveChildrenFilters } from '@/lib/filter-summary'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { FormField, SelectInput } from '@/components/ui/FormField'
import {
  getAssessmentDueStatus,
  getLatestAssessment,
  getLatestMeasurement,
} from '@/lib/nutrition-utils'
import type { Child } from '@/types'
import type { ChildStatusFilter } from '@/lib/child-filters'

function ChildrenListSkeleton() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      aria-busy="true"
      aria-label={caretaker.children.loading}
      role="status"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} lines={3} />
      ))}
    </div>
  )
}

export function ChildrenListPage() {
  const { user } = useAuth()
  const {
    children,
    childrenLoading,
    childrenError,
    childrenNeedOnlineBootstrap,
    isPresentToday,
    growthMeasurements,
    nutritionAssessments,
    recordMeasurement,
  } = useData()
  const navigate = useNavigate()
  const { showSuccess } = useToast()

  const [filters, setFilters] = useState<ChildrenSearchFilters>(DEFAULT_CHILDREN_SEARCH)
  const [viewState, setViewState] = useState<ListViewState>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mockLoading, setMockLoading] = useState(true)
  const [archiveChild, setArchiveChild] = useState<Child | null>(null)
  const [reactivateChild, setReactivateChild] = useState<Child | null>(null)
  const [measureChild, setMeasureChild] = useState<Child | null>(null)

  const { selectedGrade, setSelectedGrade, gradeChildren, goBack, isGradeSelected } =
    useClassroomGateway(children)

  useEffect(() => {
    const timer = window.setTimeout(() => setMockLoading(false), 280)
    return () => window.clearTimeout(timer)
  }, [])

  const isLoading = childrenLoading || (env.isMock && mockLoading)

  const attendanceFilter =
    viewState === 'waiting'
      ? ('absent' as const)
      : viewState === 'arrived'
        ? ('present' as const)
        : ('all' as const)

  const filtered = useMemo(
    () =>
      filterAndSortChildren({
        children: gradeChildren,
        filters,
        attendanceFilter,
        isPresentToday,
      }),
    [gradeChildren, filters, attendanceFilter, isPresentToday],
  )

  const pagination = usePagination(filtered, {
    resetDeps: [filters, viewState],
  })

  const filterSummary = useMemo(
    () => buildChildrenFilterSummary(filters, viewState),
    [filters, viewState],
  )

  const hasActiveConfig = hasActiveChildrenFilters(filters, viewState)

  const activeCount = children.filter((c) => c.status === 'active').length

  const resetAll = () => {
    setFilters(DEFAULT_CHILDREN_SEARCH)
    setViewState('all')
  }

  const goBackToClassrooms = () => {
    goBack()
    resetAll()
  }

  return (
    <CaretakerLayout>
      <PageContainer>
        {isGradeSelected && <ClassroomBackLink onClick={goBackToClassrooms} />}

        <PageHeader
          title={caretaker.children.title}
          description={caretaker.children.subtitle}
          badge={`${activeCount} / ${children.length} abana`}
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/caretaker/kwiyandikisha')}
              className="w-full sm:w-auto"
            >
              {caretaker.dashboard.registerChild}
            </Button>
          }
        />

        <PageContent>
      {!isGradeSelected ? (
        <ClassroomCards
          children={children}
          onSelect={setSelectedGrade}
        />
      ) : (
      <>
      <ListControlBar
        childName={filters.childName}
        onChildNameChange={(childName) => setFilters((prev) => ({ ...prev, childName }))}
        viewState={viewState}
        onViewStateChange={(state) => setViewState(state as ListViewState)}
        viewOptions={CHILDREN_VIEW_OPTIONS}
        onOpenSearchFilters={() => setDrawerOpen(true)}
        hasActiveSearchFilters={isChildrenSearchActive(filters)}
      />

      <div className="mb-4 w-full sm:w-56">
        <FormField label={caretaker.children.statusFilterLabel}>
          <SelectInput
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: e.target.value as ChildStatusFilter,
              }))
            }
            aria-label={caretaker.children.statusFilterLabel}
            className="!min-h-11 sm:!min-h-12 text-body font-semibold"
          >
            <option value="active">{caretaker.children.filterActive}</option>
            <option value="archived">{caretaker.children.filterArchived}</option>
            <option value="all">{caretaker.children.filterAllStatus}</option>
          </SelectInput>
        </FormField>
      </div>

      {children.length > 0 && !isLoading && (
        <FilterResultsBar
          count={filtered.length}
          summary={hasActiveConfig ? filterSummary : null}
          onClear={resetAll}
          showClear={hasActiveConfig}
        />
      )}

      {isLoading ? (
        <ChildrenListSkeleton />
      ) : childrenError ? (
        <EmptyState
          icon={<Baby size={56} className="text-text-muted" strokeWidth={1.5} />}
          title={caretaker.children.noResults}
          description={caretaker.children.noResultsDesc}
        />
      ) : childrenNeedOnlineBootstrap ? (
        <OfflineEmptyState />
      ) : children.length === 0 ? (
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
            {pagination.items.map((child) => {
              const latest = getLatestMeasurement(growthMeasurements, child.id)
              const assessment = getLatestAssessment(nutritionAssessments, child.id)
              return (
              <ChildCard
                key={child.id}
                child={child}
                assessmentDueStatus={getAssessmentDueStatus(latest?.date)}
                nutritionStatus={assessment?.status}
                onView={() => navigate(buildChildDetailPath('/caretaker/abana', child))}
                onEdit={() => navigate(buildChildEditPath('/caretaker/abana', child))}
                onArchive={() => setArchiveChild(child)}
                onReactivate={() => setReactivateChild(child)}
                onRecordMeasurement={() => setMeasureChild(child)}
              />
              )
            })}
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
      </>
      )}

      {archiveChild && (
        <ArchiveDialog
          open={!!archiveChild}
          onClose={() => setArchiveChild(null)}
          child={archiveChild}
        />
      )}
      {reactivateChild && (
        <ReactivateChildDialog
          open={!!reactivateChild}
          onClose={() => setReactivateChild(null)}
          child={reactivateChild}
        />
      )}
      <MeasurementDialog
        open={!!measureChild}
        child={measureChild}
        fallbackHeightCm={
          measureChild
            ? getLatestMeasurement(growthMeasurements, measureChild.id)?.heightCm ?? 0
            : 0
        }
        onClose={() => setMeasureChild(null)}
        onConfirm={async (result: MeasurementDialogResult) => {
          if (!measureChild) return
          const prior = getLatestMeasurement(growthMeasurements, measureChild.id)
          try {
            await recordMeasurement({
              childId: measureChild.id,
              date: result.date,
              weightKg: result.weightKg,
              heightCm: result.heightCm || prior?.heightCm || 0,
              muacCm: result.muacCm,
              headCircumferenceCm: result.headCircumferenceCm ?? prior?.headCircumferenceCm,
              notes: result.notes,
              recordedBy: user?.name ?? 'Umurezi',
            })
            setMeasureChild(null)
            showSuccess(caretaker.growth.saved)
          } catch {
            // ApiErrorBridge toasts LIVE failures
          }
        }}
      />
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}
