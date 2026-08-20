import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ruler, AlertTriangle, Clock, CheckCircle2, Users } from 'lucide-react'
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
import { GrowthSummaryCards } from '@/components/growth/GrowthSummaryCards'
import { ChildGrowthListCard } from '@/components/growth/ChildGrowthListCard'
import { ChildPicker } from '@/components/children/ChildPicker'
import {
  MeasurementDialog,
  type MeasurementDialogResult,
} from '@/components/growth/MeasurementDialog'
import { useAuth, useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { usePagination } from '@/hooks/usePagination'
import { caretaker } from '@/locales/rw/caretaker'
import { buildChildDetailPath } from '@/lib/child-routes'
import { common } from '@/locales/rw/common'
import { messageForMutationFailure } from '@/offline/mutation-error-message'
import { env } from '@/config/env'
import type { ChildPickerMeta } from '@/lib/child-picker'
import {
  applySharedChildFilters,
  sortRosterChildren,
} from '@/lib/child-filters'
import {
  buildGrowthFilterSummary,
  hasActiveGrowthFilters,
} from '@/lib/filter-summary'
import {
  computeGrowthSummary,
  filterGrowthChildren,
  getAssessmentDueStatus,
  getLatestAssessment,
  getLatestMeasurement,
  type GrowthListFilter,
} from '@/lib/nutrition-utils'
import type { Child } from '@/types'

function emptyIcon(filter: GrowthListFilter) {
  switch (filter) {
    case 'due':
      return <Clock size={48} className="text-text-muted" strokeWidth={1.5} />
    case 'overdue':
      return <Clock size={48} className="text-error" strokeWidth={1.5} />
    case 'at_risk':
      return <AlertTriangle size={48} className="text-text-muted" strokeWidth={1.5} />
    case 'up_to_date':
      return <CheckCircle2 size={48} className="text-success" strokeWidth={1.5} />
    default:
      return <Users size={48} className="text-text-muted" strokeWidth={1.5} />
  }
}

function emptyTitle(filter: GrowthListFilter): string {
  switch (filter) {
    case 'due':
    case 'overdue':
      return caretaker.growth.noDueChildren
    case 'at_risk':
      return caretaker.growth.noAtRisk
    case 'up_to_date':
      return caretaker.growth.noRecentMeasurements
    default:
      return caretaker.growth.filterEmpty
  }
}

export function GrowthPage() {
  const { user } = useAuth()
  const {
    children,
    growthMeasurements,
    nutritionAssessments,
    recordMeasurement,
  } = useData()
  const { showSuccess, showError } = useToast()
  const navigate = useNavigate()

  const [modalChild, setModalChild] = useState<Child | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [listFilter, setListFilter] = useState<GrowthListFilter>('due')
  const [filters, setFilters] = useState<RosterSearchFilters>(DEFAULT_ROSTER_SEARCH)

  const centerChildren = useMemo(
    () =>
      children.filter(
        (c) =>
          c.status === 'active' &&
          (!user?.centerId || c.centerId === user.centerId),
      ),
    [children, user?.centerId],
  )

  const { setSelectedGrade, gradeChildren: gradeCenterChildren, goBack, isGradeSelected } =
    useClassroomGateway(centerChildren)

  const summary = useMemo(
    () => computeGrowthSummary(gradeCenterChildren, growthMeasurements, nutritionAssessments),
    [gradeCenterChildren, growthMeasurements, nutritionAssessments],
  )

  const filteredChildren = useMemo(() => {
    const bySearch = applySharedChildFilters(gradeCenterChildren, filters)
    const byView = filterGrowthChildren(
      bySearch,
      growthMeasurements,
      nutritionAssessments,
      listFilter,
    )
    return sortRosterChildren(byView, filters.sort, (childId) =>
      getLatestMeasurement(growthMeasurements, childId)?.date,
    )
  }, [centerChildren, filters, growthMeasurements, nutritionAssessments, listFilter])

  const pagination = usePagination(filteredChildren, {
    resetDeps: [listFilter, filters, filteredChildren.length],
  })

  const filterSummary = useMemo(
    () => buildGrowthFilterSummary(filters, listFilter),
    [filters, listFilter],
  )

  const hasActiveConfig = hasActiveGrowthFilters(filters, listFilter)

  const atRiskIds = useMemo(() => {
    return new Set(
      filterGrowthChildren(
        gradeCenterChildren,
        growthMeasurements,
        nutritionAssessments,
        'at_risk',
      ).map((c) => c.id),
    )
  }, [gradeCenterChildren, growthMeasurements, nutritionAssessments])

  const getChildMeta = useMemo(() => {
    return (child: Child): ChildPickerMeta => {
      const latest = getLatestMeasurement(growthMeasurements, child.id)
      const dueStatus = getAssessmentDueStatus(latest?.date)
      return {
        lastGrowthDate: latest?.date,
        overdueGrowth: dueStatus === 'overdue' || dueStatus === 'never',
        atNutritionalRisk: atRiskIds.has(child.id),
        needsFollowUp: dueStatus === 'due' || dueStatus === 'overdue' || dueStatus === 'never',
      }
    }
  }, [growthMeasurements, atRiskIds])

  const viewOptions: ListViewOption[] = [
    { value: 'all', label: caretaker.growth.filterAll },
    { value: 'due', label: caretaker.growth.due },
    { value: 'overdue', label: caretaker.growth.overdue },
    { value: 'at_risk', label: caretaker.growth.atRisk },
    { value: 'up_to_date', label: caretaker.growth.upToDate },
  ]

  const handleConfirm = async (result: MeasurementDialogResult) => {
    if (!modalChild) return
    const prior = getLatestMeasurement(growthMeasurements, modalChild.id)
    try {
      await recordMeasurement({
        childId: modalChild.id,
        date: result.date,
        weightKg: result.weightKg,
        heightCm: result.heightCm || prior?.heightCm || 0,
        muacCm: result.muacCm,
        headCircumferenceCm: result.headCircumferenceCm ?? prior?.headCircumferenceCm,
        notes: result.notes,
        recordedBy: user?.name ?? 'Umurezi',
      })
      setModalChild(null)
      showSuccess(env.isLive ? common.sync.savedOnDevice : caretaker.growth.saved)
    } catch (err) {
      showError(messageForMutationFailure(err))
    }
  }

  const openPicker = () => setPickerOpen(true)

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
          title={caretaker.growth.title}
          description={caretaker.growth.subtitle}
          action={
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto"
                onClick={() => navigate('/caretaker/imikurire/ukwezi')}
              >
                {caretaker.growth.monthlyRoster}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
                icon={<Ruler size={18} />}
                onClick={openPicker}
                disabled={gradeCenterChildren.length === 0}
              >
                {caretaker.growth.recordMeasurement}
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
          <GrowthSummaryCards
            stats={summary}
            activeFilter={listFilter}
            onFilterChange={setListFilter}
          />

          <Card padding="lg" className="bg-primary-light/30 border-primary/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-subheading text-text">{caretaker.growth.recordMeasurement}</h2>
                <p className="text-body text-text-secondary mt-1">
                  {caretaker.growth.recordMeasurementDesc}
                </p>
              </div>
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto shrink-0"
                onClick={openPicker}
                disabled={gradeCenterChildren.length === 0}
              >
                {caretaker.growth.selectChild}
              </Button>
            </div>
          </Card>

          <section>
            <ListControlBar
              childName={filters.childName}
              onChildNameChange={(childName) => setFilters((prev) => ({ ...prev, childName }))}
              viewState={listFilter}
              onViewStateChange={(state) => setListFilter(state as GrowthListFilter)}
              viewOptions={viewOptions}
              onOpenSearchFilters={() => setDrawerOpen(true)}
              hasActiveSearchFilters={isRosterSearchActive(filters)}
            />

            {gradeCenterChildren.length > 0 && (
              <FilterResultsBar
                count={filteredChildren.length}
                summary={hasActiveConfig ? filterSummary : null}
                onClear={resetAll}
                showClear={hasActiveConfig}
              />
            )}

            {pagination.items.length === 0 ? (
              <EmptyState
                icon={emptyIcon(listFilter)}
                title={emptyTitle(listFilter)}
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
                    const latest = getLatestMeasurement(growthMeasurements, child.id)
                    const assessment = getLatestAssessment(nutritionAssessments, child.id)
                    return (
                      <ChildGrowthListCard
                        key={child.id}
                        child={child}
                        status={assessment?.status}
                        lastMeasurementDate={latest?.date}
                        viewOnly={listFilter === 'up_to_date'}
                        onRecord={() => setModalChild(child)}
                        onView={() => navigate(buildChildDetailPath('/caretaker/abana', child, 'growth'))}
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
                  pageSizeSelectId="growth-list-page-size"
                />
              </>
            )}
          </section>

          <ChildPicker
            hideTrigger
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            childrenList={gradeCenterChildren}
            value={modalChild?.id ?? ''}
            onChange={(_id, child) => {
              setModalChild(child)
              setPickerOpen(false)
            }}
            placeholder={caretaker.growth.selectChild}
            searchPlaceholder={caretaker.childPicker.searchPlaceholder}
            recentScope={`growth:${user?.centerId ?? 'default'}`}
            getMeta={getChildMeta}
            availableFilters={[
              'all',
              'overdue_growth',
              'at_nutritional_risk',
              'needs_follow_up',
            ]}
            defaultFilter="needs_follow_up"
            aria-label={caretaker.growth.selectChild}
          />

          <MeasurementDialog
            open={!!modalChild && !pickerOpen}
            child={modalChild}
            fallbackHeightCm={
              modalChild
                ? getLatestMeasurement(growthMeasurements, modalChild.id)?.heightCm ?? 0
                : 0
            }
            onClose={() => setModalChild(null)}
            onConfirm={handleConfirm}
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
