import { useMemo, useState, useCallback } from 'react'
import { Users } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { ListControlBar, type ListViewState } from '@/components/ui/ListControlBar'
import {
  SearchFiltersPanel,
  DEFAULT_ATTENDANCE_SEARCH,
  isAttendanceSearchActive,
  type AttendanceSearchFilters,
} from '@/components/ui/SearchFiltersPanel'
import { FilterResultsBar } from '@/components/ui/FilterResultsBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { AttendanceCard } from '@/components/caretaker/attendance/AttendanceCard'
import { ArrivalTimeline } from '@/components/caretaker/attendance/ArrivalTimeline'
import { AttendanceModal } from '@/components/caretaker/attendance/AttendanceModal'
import { AttendanceViewSheet } from '@/components/caretaker/attendance/AttendanceViewSheet'
import { useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import { messages, OTHER_RELATION_VALUE } from '@/locales/rw/common'
import {
  filterArrivedChildren,
  filterWaitingChildren,
  getTodayDate,
  type RecentArrival,
} from '@/lib/attendance-utils'
import { buildAttendanceFilterSummary, hasActiveAttendanceFilters } from '@/lib/filter-summary'
import type { AttendanceRecord, BroughtBy, Child } from '@/types'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'

export function AttendancePage() {
  const { children, attendance, recordAttendance, clearTodayAttendance, getTodayRecord } = useData()
  const { showSuccess } = useToast()

  const [filters, setFilters] = useState<AttendanceSearchFilters>(DEFAULT_ATTENDANCE_SEARCH)
  const [viewState, setViewState] = useState<ListViewState>('waiting')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [modalChild, setModalChild] = useState<Child | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [broughtBy, setBroughtBy] = useState<BroughtBy | ''>('')
  const [broughtByOther, setBroughtByOther] = useState('')
  const [viewArrival, setViewArrival] = useState<RecentArrival | null>(null)

  const today = getTodayDate()

  const todayRecordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>()
    children.forEach((c) => {
      const record = attendance.find((a) => a.childId === c.id && a.date === today)
      if (record) map.set(c.id, record)
    })
    return map
  }, [children, attendance, today])

  const waitingChildren = useMemo(
    () =>
      filterWaitingChildren({
        children,
        todayRecords: todayRecordsMap,
        filters,
      }),
    [children, todayRecordsMap, filters],
  )

  const arrivedChildren = useMemo(
    () =>
      filterArrivedChildren({
        children,
        todayRecords: todayRecordsMap,
        filters,
      }),
    [children, todayRecordsMap, filters],
  )

  const waitingPagination = usePagination(waitingChildren, {
    resetDeps: [filters, viewState],
  })

  const arrivedPagination = usePagination(arrivedChildren, {
    resetDeps: [filters, viewState],
  })

  const filterSummary = useMemo(
    () => buildAttendanceFilterSummary(filters, viewState),
    [filters, viewState],
  )

  const hasActiveConfig = hasActiveAttendanceFilters(filters, viewState)
  const activePanelCount =
    viewState === 'waiting' || viewState === 'all' ? waitingChildren.length : arrivedChildren.length

  const resetAll = () => {
    setFilters(DEFAULT_ATTENDANCE_SEARCH)
    setViewState('waiting')
  }

  const openModal = useCallback(
    (child: Child, editing: boolean) => {
      const record = getTodayRecord(child.id)
      setModalChild(child)
      setIsEditing(editing)
      setBroughtBy(record?.broughtBy ?? '')
      setBroughtByOther(record?.broughtByOther ?? '')
    },
    [getTodayRecord],
  )

  const closeModal = useCallback(() => {
    setModalChild(null)
    setIsEditing(false)
    setBroughtBy('')
    setBroughtByOther('')
  }, [])

  const handleConfirm = useCallback(() => {
    if (!modalChild || !broughtBy) return

    const childId = modalChild.id
    const existing = getTodayRecord(childId)

    recordAttendance({
      childId,
      date: today,
      present: true,
      broughtBy,
      broughtByOther: broughtBy === OTHER_RELATION_VALUE ? broughtByOther.trim() : undefined,
      arrivedAt: existing?.arrivedAt ?? new Date().toISOString(),
    })

    closeModal()

    showSuccess(messages.attendanceRecorded, {
      undoLabel: caretaker.attendance.undo,
      onUndo: () => clearTodayAttendance(childId),
    })
  }, [
    modalChild,
    broughtBy,
    broughtByOther,
    getTodayRecord,
    recordAttendance,
    today,
    showSuccess,
    closeModal,
    clearTodayAttendance,
  ])

  const handleEditFromTimeline = useCallback(
    (childId: string) => {
      const child = children.find((c) => c.id === childId)
      if (child) openModal(child, true)
    },
    [children, openModal],
  )

  const showWaitingPanel = viewState === 'waiting' || viewState === 'all'
  const showArrivedPanel = viewState === 'arrived' || viewState === 'all'

  const panelTitle =
    viewState === 'arrived' ? caretaker.attendance.panelArrived : caretaker.attendance.panelWaiting
  const panelSubtitle =
    viewState === 'arrived' ? caretaker.attendance.recentArrivals : caretaker.attendance.subtitle

  return (
    <CaretakerLayout>
      <section
        aria-label={viewState === 'arrived' ? caretaker.attendance.panelArrived : caretaker.attendance.panelWaiting}
        className="mb-6"
      >
        <h2 className="text-heading text-text mb-1">{panelTitle}</h2>
        <p className="text-body text-text-secondary mb-5">{panelSubtitle}</p>

        <ListControlBar
          childName={filters.childName}
          onChildNameChange={(childName) => setFilters((prev) => ({ ...prev, childName }))}
          viewState={viewState}
          onViewStateChange={setViewState}
          onOpenSearchFilters={() => setDrawerOpen(true)}
          hasActiveSearchFilters={isAttendanceSearchActive(filters)}
          showArrivedFilter
        />

        {children.length > 0 && (
          <FilterResultsBar
            count={activePanelCount}
            summary={hasActiveConfig ? filterSummary : null}
            onClear={resetAll}
            showClear={hasActiveConfig}
          />
        )}

        {showWaitingPanel && (
          <>
            {waitingChildren.length === 0 ? (
              <EmptyState
                icon={<Users size={48} className="text-text-muted" strokeWidth={1.5} />}
                title={caretaker.attendance.emptyWaiting}
                description={caretaker.attendance.noChildrenDesc}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {waitingPagination.items.map((child) => (
                    <AttendanceCard
                      key={child.id}
                      child={child}
                      onMarkArrived={() => openModal(child, false)}
                    />
                  ))}
                </div>
                <Pagination
                  page={waitingPagination.page}
                  pageSize={waitingPagination.pageSize}
                  total={waitingPagination.total}
                  totalPages={waitingPagination.totalPages}
                  startIndex={waitingPagination.startIndex}
                  endIndex={waitingPagination.endIndex}
                  hasPrevious={waitingPagination.hasPrevious}
                  hasNext={waitingPagination.hasNext}
                  onPageChange={waitingPagination.setPage}
                  onPageSizeChange={waitingPagination.setPageSize}
                  pageSizeSelectId="attendance-waiting-page-size"
                />
              </>
            )}
          </>
        )}

        {showArrivedPanel && viewState !== 'all' && (
          <>
            {arrivedChildren.length === 0 ? (
              <EmptyState
                icon={<Users size={48} className="text-text-muted" strokeWidth={1.5} />}
                title={caretaker.attendance.noArrivalsYet}
                description={caretaker.attendance.noChildrenDesc}
              />
            ) : (
              <>
                <ArrivalTimeline
                  arrivals={arrivedPagination.items}
                  onEdit={handleEditFromTimeline}
                  onView={setViewArrival}
                />
                <Pagination
                  page={arrivedPagination.page}
                  pageSize={arrivedPagination.pageSize}
                  total={arrivedPagination.total}
                  totalPages={arrivedPagination.totalPages}
                  startIndex={arrivedPagination.startIndex}
                  endIndex={arrivedPagination.endIndex}
                  hasPrevious={arrivedPagination.hasPrevious}
                  hasNext={arrivedPagination.hasNext}
                  onPageChange={arrivedPagination.setPage}
                  onPageSizeChange={arrivedPagination.setPageSize}
                  pageSizeSelectId="attendance-arrived-page-size"
                />
              </>
            )}
          </>
        )}
      </section>

      {showArrivedPanel && viewState === 'all' && (
        <section aria-label={caretaker.attendance.panelArrived}>
          <ArrivalTimeline
            arrivals={arrivedPagination.items}
            onEdit={handleEditFromTimeline}
            onView={setViewArrival}
            emptyMessage={caretaker.attendance.noArrivalsYet}
          />
          <Pagination
            page={arrivedPagination.page}
            pageSize={arrivedPagination.pageSize}
            total={arrivedPagination.total}
            totalPages={arrivedPagination.totalPages}
            startIndex={arrivedPagination.startIndex}
            endIndex={arrivedPagination.endIndex}
            hasPrevious={arrivedPagination.hasPrevious}
            hasNext={arrivedPagination.hasNext}
            onPageChange={arrivedPagination.setPage}
            onPageSizeChange={arrivedPagination.setPageSize}
            pageSizeSelectId="attendance-arrived-all-page-size"
            className="max-w-4xl"
          />
        </section>
      )}

      <SearchFiltersPanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant="attendance"
        filters={filters}
        onApply={(f) => setFilters(f as AttendanceSearchFilters)}
      />

      <AttendanceModal
        open={!!modalChild}
        child={modalChild}
        broughtBy={broughtBy}
        broughtByOther={broughtByOther}
        isEditing={isEditing}
        onBroughtByChange={setBroughtBy}
        onBroughtByOtherChange={setBroughtByOther}
        onClose={closeModal}
        onConfirm={handleConfirm}
      />

      <AttendanceViewSheet
        open={!!viewArrival}
        child={viewArrival?.child ?? null}
        record={viewArrival?.record ?? null}
        onClose={() => setViewArrival(null)}
      />
    </CaretakerLayout>
  )
}
