import { useMemo, useState, useCallback } from 'react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  SearchFiltersPanel,
  DEFAULT_ATTENDANCE_SEARCH,
  isAttendanceSearchActive,
  type AttendanceSearchFilters,
} from '@/components/ui/SearchFiltersPanel'
import { FilterResultsBar } from '@/components/ui/FilterResultsBar'
import { AttendanceCard } from '@/components/attendance/AttendanceCard'
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid'
import { AttendanceDayFilters } from '@/components/attendance/AttendanceDayFilters'
import { AttendanceDialog, type AttendanceDialogResult } from '@/components/attendance/AttendanceDialog'
import { AttendanceSummaryCards } from '@/components/attendance/AttendanceSummaryCards'
import { useAuth, useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import { env } from '@/config/env'
import { messages } from '@/locales/rw/common'
import { messageForMutationFailure } from '@/offline/mutation-error-message'
import { OfflineEmptyState } from '@/components/offline/OfflineEmptyState'
import {
  computeAttendanceSummary,
  filterAbsentChildren,
  filterArrivedChildren,
  filterWaitingChildren,
  getTodayDate,
} from '@/lib/attendance-utils'
import { buildAttendanceFilterSummary, hasActiveAttendanceFilters } from '@/lib/filter-summary'
import type { AttendanceRecord, Child } from '@/types'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import type { ListViewState } from '@/components/ui/ListControlBar'

export function AttendancePage() {
  const { user } = useAuth()
  const { children, attendance, recordAttendance, clearTodayAttendance, getTodayRecord, childrenNeedOnlineBootstrap } =
    useData()
  const { showSuccess, showError } = useToast()

  const [filters, setFilters] = useState<AttendanceSearchFilters>(DEFAULT_ATTENDANCE_SEARCH)
  const [viewState, setViewState] = useState<ListViewState>('waiting')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [modalChild, setModalChild] = useState<Child | null>(null)
  const [initialPresent, setInitialPresent] = useState<boolean | null>(null)

  const today = getTodayDate()
  const recordedBy = user?.name ?? 'Umurezi'

  const activeChildren = useMemo(
    () => children.filter((c) => c.status === 'active'),
    [children],
  )

  const todayRecordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>()
    activeChildren.forEach((c) => {
      const record = attendance.find((a) => a.childId === c.id && a.date === today)
      if (record) map.set(c.id, record)
    })
    return map
  }, [activeChildren, attendance, today])

  const summary = useMemo(
    () => computeAttendanceSummary(activeChildren, attendance, today),
    [activeChildren, attendance, today],
  )

  const waitingChildren = useMemo(
    () =>
      filterWaitingChildren({
        children: activeChildren,
        todayRecords: todayRecordsMap,
        filters,
      }),
    [activeChildren, todayRecordsMap, filters],
  )

  const arrivedChildren = useMemo(
    () =>
      filterArrivedChildren({
        children: activeChildren,
        todayRecords: todayRecordsMap,
        filters,
      }),
    [activeChildren, todayRecordsMap, filters],
  )

  const absentChildren = useMemo(
    () =>
      filterAbsentChildren({
        children: activeChildren,
        todayRecords: todayRecordsMap,
        filters,
      }),
    [activeChildren, todayRecordsMap, filters],
  )

  const waitingPagination = usePagination(waitingChildren, {
    resetDeps: [filters, viewState],
  })

  const arrivedPagination = usePagination(arrivedChildren, {
    resetDeps: [filters, viewState],
  })

  const absentPagination = usePagination(absentChildren, {
    resetDeps: [filters, viewState],
  })

  const filterSummary = useMemo(
    () => buildAttendanceFilterSummary(filters, viewState),
    [filters, viewState],
  )

  const hasActiveConfig = hasActiveAttendanceFilters(filters, viewState)
  const activePanelCount =
    viewState === 'waiting'
      ? waitingChildren.length
      : viewState === 'arrived'
        ? arrivedChildren.length
        : waitingChildren.length + arrivedChildren.length + absentChildren.length

  const resetAll = () => {
    setFilters(DEFAULT_ATTENDANCE_SEARCH)
    setViewState('waiting')
  }

  const openDialog = useCallback((child: Child, presentPrefill: boolean | null) => {
    setModalChild(child)
    setInitialPresent(presentPrefill)
  }, [])

  const closeDialog = useCallback(() => {
    setModalChild(null)
    setInitialPresent(null)
  }, [])

  const handleConfirm = useCallback(
    async (result: AttendanceDialogResult) => {
      if (!modalChild) return
      const childId = modalChild.id

      try {
        await recordAttendance({
          childId,
          date: today,
          present: result.present,
          broughtBy: result.broughtBy,
          broughtByOther: result.broughtByOther,
          arrivedAt: result.arrivedAt,
          absentReason: result.absentReason,
          notes: result.notes,
          recordedBy,
        })

        closeDialog()
        // LIVE local-first: always confirm device save (sync is separate / shell status).
        showSuccess(
          env.isLive ? messages.attendanceRecordedLocal : messages.attendanceRecorded,
          {
            undoLabel: caretaker.attendance.undo,
            onUndo: () => {
              void clearTodayAttendance(childId)
            },
          },
        )
      } catch (err) {
        showError(messageForMutationFailure(err))
      }
    },
    [modalChild, recordAttendance, today, recordedBy, closeDialog, showSuccess, showError, clearTodayAttendance],
  )

  const childHistory = useCallback(
    (childId: string) => attendance.filter((a) => a.childId === childId),
    [attendance],
  )

  const showWaitingPanel = viewState === 'waiting' || viewState === 'all'
  const showArrivedPanel = viewState === 'arrived' || viewState === 'all'
  const showAbsentPanel = viewState === 'all' || viewState === 'arrived'

  const panelTitle =
    viewState === 'arrived'
      ? caretaker.attendance.panelArrived
      : viewState === 'waiting'
        ? caretaker.attendance.panelWaiting
        : caretaker.attendance.title

  return (
    <CaretakerLayout>
      <PageContainer>
        <PageHeader title={panelTitle} description={caretaker.attendance.subtitle} />

        <PageContent>
      {childrenNeedOnlineBootstrap ? (
        <OfflineEmptyState />
      ) : (
      <>
      <section aria-label={caretaker.attendance.summaryTitle} className="mb-6">
        <AttendanceSummaryCards stats={summary} className="mb-6" />

        <AttendanceDayFilters
          childName={filters.childName}
          onChildNameChange={(childName) => setFilters((prev) => ({ ...prev, childName }))}
          viewState={viewState}
          onViewStateChange={setViewState}
          onOpenSearchFilters={() => setDrawerOpen(true)}
          hasActiveSearchFilters={isAttendanceSearchActive(filters)}
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
          <div className={viewState === 'all' ? 'mt-2' : undefined}>
            {viewState === 'all' && (
              <h3 className="text-label text-primary mb-3">{caretaker.attendance.panelWaiting}</h3>
            )}
            <AttendanceGrid
              empty={waitingChildren.length === 0}
              emptyTitle={caretaker.attendance.emptyWaiting}
              emptyDescription={caretaker.attendance.noChildrenDesc}
              aria-label={caretaker.attendance.panelWaiting}
            >
              {waitingPagination.items.map((child) => (
                <AttendanceCard
                  key={child.id}
                  child={child}
                  todayStatus="unrecorded"
                  history={childHistory(child.id)}
                  onMarkPresent={() => openDialog(child, true)}
                  onMarkAbsent={() => openDialog(child, false)}
                />
              ))}
            </AttendanceGrid>
            {waitingChildren.length > 0 && (
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
            )}
          </div>
        )}

        {showArrivedPanel && (
          <div className={viewState === 'all' || viewState === 'arrived' ? 'mt-6' : undefined}>
            {(viewState === 'all' || viewState === 'arrived') && (
              <h3 className="text-label text-primary mb-3">{caretaker.attendance.panelArrived}</h3>
            )}
            <AttendanceGrid
              empty={arrivedChildren.length === 0}
              emptyTitle={caretaker.attendance.noArrivalsYet}
              emptyDescription={caretaker.attendance.noChildrenDesc}
              aria-label={caretaker.attendance.panelArrived}
            >
              {arrivedPagination.items.map(({ child, record }) => (
                <AttendanceCard
                  key={record.id}
                  child={child}
                  todayStatus="present"
                  todayRecord={record}
                  history={childHistory(child.id)}
                  onEdit={() => openDialog(child, true)}
                />
              ))}
            </AttendanceGrid>
            {arrivedChildren.length > 0 && (
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
            )}
          </div>
        )}

        {showAbsentPanel && (
          <div className="mt-6">
            {(viewState === 'all' || (viewState === 'arrived' && absentChildren.length > 0)) && (
              <h3 className="text-label text-primary mb-3">{caretaker.attendance.panelAbsent}</h3>
            )}
            {(viewState === 'all' || absentChildren.length > 0) && (
              <AttendanceGrid
                empty={absentChildren.length === 0}
                emptyTitle={caretaker.attendance.noAbsentYet}
                emptyDescription={caretaker.attendance.noChildrenDesc}
                aria-label={caretaker.attendance.panelAbsent}
              >
                {absentPagination.items.map(({ child, record }) => (
                  <AttendanceCard
                    key={record.id}
                    child={child}
                    todayStatus="absent"
                    todayRecord={record}
                    history={childHistory(child.id)}
                    onEdit={() => openDialog(child, false)}
                  />
                ))}
              </AttendanceGrid>
            )}
            {absentChildren.length > 0 && (
              <Pagination
                page={absentPagination.page}
                pageSize={absentPagination.pageSize}
                total={absentPagination.total}
                totalPages={absentPagination.totalPages}
                startIndex={absentPagination.startIndex}
                endIndex={absentPagination.endIndex}
                hasPrevious={absentPagination.hasPrevious}
                hasNext={absentPagination.hasNext}
                onPageChange={absentPagination.setPage}
                onPageSizeChange={absentPagination.setPageSize}
                pageSizeSelectId="attendance-absent-page-size"
              />
            )}
          </div>
        )}
      </section>

      <SearchFiltersPanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant="attendance"
        filters={filters}
        onApply={(f) => setFilters(f as AttendanceSearchFilters)}
      />

      <AttendanceDialog
        open={!!modalChild}
        child={modalChild}
        existing={modalChild ? getTodayRecord(modalChild.id) : null}
        initialPresent={initialPresent}
        recordedBy={recordedBy}
        onClose={closeDialog}
        onConfirm={handleConfirm}
      />
      </>
      )}
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}
