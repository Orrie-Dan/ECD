import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Accessibility, Clock, History } from 'lucide-react'
import { ClassroomCards } from '@/components/classrooms/ClassroomCards'
import { ClassroomBackLink } from '@/components/classrooms/ClassroomBackLink'
import { useClassroomGateway } from '@/hooks/useClassroomGateway'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { ListControlBar, type ListViewOption } from '@/components/ui/ListControlBar'
import {
  SearchFiltersPanel,
  DEFAULT_ROSTER_SEARCH,
  isRosterSearchActive,
  type RosterSearchFilters,
} from '@/components/ui/SearchFiltersPanel'
import { FilterResultsBar } from '@/components/ui/FilterResultsBar'
import { Pagination } from '@/components/ui/Pagination'
import { ChildPicker } from '@/components/children/ChildPicker'
import { StedSummaryCards } from '@/components/sted/StedSummaryCards'
import { ChildStedListCard } from '@/components/sted/ChildStedListCard'
import { StedAssessmentViewSheet } from '@/components/sted/StedAssessmentViewSheet'
import { useAuth, useData } from '@/contexts/AppContext'
import { usePagination } from '@/hooks/usePagination'
import { caretaker } from '@/locales/rw/caretaker'
import { slugifyChildName } from '@/lib/child-routes'
import { buildChildDetailPath } from '@/lib/child-routes'
import type { ChildPickerMeta } from '@/lib/child-picker'
import { applySharedChildFilters, sortRosterChildren } from '@/lib/child-filters'
import { buildStedFilterSummary, hasActiveStedFilters } from '@/lib/filter-summary'
import {
  computeStedCenterSummary,
  filterStedChildren,
  getChildrenDueForStedFollowUp,
  getEligibleStedChildren,
  getLatestStedAssessment,
  getStedAgeBand,
  type StedListFilter,
} from '@/lib/sted-utils'
import type { Child, StedAssessment } from '@/types'

export function StedPage() {
  const { user } = useAuth()
  const { children, stedAssessments } = useData()
  const navigate = useNavigate()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [listFilter, setListFilter] = useState<StedListFilter>('due')
  const [filters, setFilters] = useState<RosterSearchFilters>(DEFAULT_ROSTER_SEARCH)
  const [viewing, setViewing] = useState<{
    child: Child
    assessment: StedAssessment
  } | null>(null)

  const centerChildren = useMemo(
    () =>
      children.filter(
        (c) =>
          c.status === 'active' &&
          (!user?.centerId || c.centerId === user.centerId),
      ),
    [children, user?.centerId],
  )

  const { selectedGrade, setSelectedGrade, gradeChildren: gradeCenterChildren, goBack, isGradeSelected } =
    useClassroomGateway(centerChildren)

  const eligible = useMemo(() => getEligibleStedChildren(gradeCenterChildren), [gradeCenterChildren])

  const summary = useMemo(
    () => computeStedCenterSummary(gradeCenterChildren, stedAssessments),
    [gradeCenterChildren, stedAssessments],
  )

  const dueFollowUp = useMemo(
    () => getChildrenDueForStedFollowUp(gradeCenterChildren, stedAssessments),
    [gradeCenterChildren, stedAssessments],
  )

  const dueIds = useMemo(
    () => new Set(dueFollowUp.map(({ child }) => child.id)),
    [dueFollowUp],
  )

  const filteredChildren = useMemo(() => {
    const bySearch = applySharedChildFilters(eligible, filters)
    const byView = filterStedChildren(bySearch, stedAssessments, listFilter)
    return sortRosterChildren(byView, filters.sort, (childId) =>
      getLatestStedAssessment(stedAssessments, childId)?.assessmentDate,
    )
  }, [eligible, filters, stedAssessments, listFilter])

  const pagination = usePagination(filteredChildren, {
    resetDeps: [listFilter, filters, filteredChildren.length],
  })

  const filterSummary = useMemo(
    () => buildStedFilterSummary(filters, listFilter),
    [filters, listFilter],
  )

  const hasActiveConfig = hasActiveStedFilters(filters, listFilter)

  const getChildMeta = useMemo(() => {
    return (child: Child): ChildPickerMeta => {
      const latest = getLatestStedAssessment(stedAssessments, child.id)
      const due = dueIds.has(child.id)
      return {
        ageBand: getStedAgeBand(child.dateOfBirth),
        needsFollowUp: due || !latest,
      }
    }
  }, [stedAssessments, dueIds])

  const viewOptions: ListViewOption[] = [
    { value: 'all', label: caretaker.sted.filterAll },
    { value: 'due', label: caretaker.sted.dueFollowUpCount },
    { value: 'assessed', label: caretaker.sted.assessed },
  ]

  const openPicker = () => setPickerOpen(true)

  const startAssessment = (childId?: string) => {
    const child = children.find((item) => item.id === childId)
    const childSearch = child ? `?child=${encodeURIComponent(slugifyChildName(child.fullName))}` : ''
    navigate(`/caretaker/sted/new${childSearch}`)
  }

  const openAssessment = (child: Child, assessment: StedAssessment) => {
    setViewing({ child, assessment })
  }

  const resetAll = () => {
    setFilters(DEFAULT_ROSTER_SEARCH)
    setListFilter('due')
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
          title={caretaker.sted.title}
          description={caretaker.sted.subtitle}
          action={
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto"
                icon={<History size={18} />}
                onClick={() => navigate('/caretaker/sted/amateka')}
              >
                {caretaker.sted.viewHistory}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
                icon={<Accessibility size={18} />}
                onClick={openPicker}
                disabled={eligible.length === 0}
              >
                {caretaker.sted.startAssessment}
              </Button>
            </div>
          }
        />

        <PageContent className="space-y-6">
      {!isGradeSelected ? (
          <ClassroomCards
            children={centerChildren}
            onSelect={setSelectedGrade}
          />
      ) : (
      <>
          <StedSummaryCards
            stats={summary}
            activeFilter={listFilter}
            onFilterChange={setListFilter}
          />

          <Card padding="lg" className="bg-primary-light/30 border-primary/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-subheading text-text">{caretaker.sted.startAssessment}</h2>
                <p className="text-body text-text-secondary mt-1">
                  {caretaker.sted.startAssessmentDesc}
                </p>
              </div>
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto shrink-0"
                onClick={openPicker}
                disabled={eligible.length === 0}
              >
                {caretaker.sted.selectChild}
              </Button>
            </div>
          </Card>

          <section>
            <ListControlBar
              childName={filters.childName}
              onChildNameChange={(childName) => setFilters((prev) => ({ ...prev, childName }))}
              viewState={listFilter}
              onViewStateChange={(state) => setListFilter(state as StedListFilter)}
              viewOptions={viewOptions}
              onOpenSearchFilters={() => setDrawerOpen(true)}
              hasActiveSearchFilters={isRosterSearchActive(filters)}
            />

            {eligible.length > 0 && (
              <FilterResultsBar
                count={filteredChildren.length}
                summary={hasActiveConfig ? filterSummary : null}
                onClear={resetAll}
                showClear={hasActiveConfig}
              />
            )}

            {pagination.items.length === 0 ? (
              <EmptyState
                icon={<Clock size={48} className="text-text-muted" strokeWidth={1.5} />}
                title={
                  listFilter === 'due'
                    ? caretaker.sted.noDue
                    : caretaker.sted.noAssessments
                }
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                  {pagination.items.map((child) => {
                    const assessment = getLatestStedAssessment(stedAssessments, child.id)
                    return (
                      <ChildStedListCard
                        key={child.id}
                        child={child}
                        ageBand={assessment?.ageBand ?? getStedAgeBand(child.dateOfBirth) ?? undefined}
                        lastAssessmentDate={assessment?.assessmentDate}
                        followUpDueDate={assessment?.outcome.followUpDueDate}
                        outcomeNormal={assessment?.outcome.normal}
                        viewOnly={listFilter === 'assessed' && !dueIds.has(child.id)}
                        onAssess={() => startAssessment(child.id)}
                        onView={() => {
                          if (assessment) openAssessment(child, assessment)
                          else navigate(buildChildDetailPath('/caretaker/abana', child))
                        }}
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
                  pageSizeSelectId="sted-list-page-size"
                />
              </>
            )}
          </section>

          <ChildPicker
            hideTrigger
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            childrenList={eligible}
            value=""
            onChange={(id) => {
              setPickerOpen(false)
              if (id) startAssessment(id)
            }}
            placeholder={caretaker.sted.selectChild}
            searchPlaceholder={caretaker.childPicker.searchPlaceholder}
            recentScope={`sted:${user?.centerId ?? 'default'}`}
            getMeta={getChildMeta}
            availableFilters={['all', 'age_1_3', 'age_4_6', 'needs_follow_up']}
            defaultFilter="needs_follow_up"
            aria-label={caretaker.sted.selectChild}
          />

          <StedAssessmentViewSheet
            open={!!viewing}
            child={viewing?.child ?? null}
            assessment={viewing?.assessment ?? null}
            onClose={() => setViewing(null)}
          />

          <SearchFiltersPanel
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            variant="roster"
            filters={filters}
            onApply={(next) => setFilters(next as RosterSearchFilters)}
          />
      </>
      )}
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}
