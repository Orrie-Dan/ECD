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
import { AttendanceDayFilters, type AttendanceViewState } from '@/components/attendance/AttendanceDayFilters'
import { AttendanceDateNav } from '@/components/attendance/AttendanceDateNav'
import { AttendanceDayRoster } from '@/components/attendance/AttendanceDayRoster'
import { AttendanceDialog, type AttendanceDialogResult } from '@/components/attendance/AttendanceDialog'
import { AttendanceSummaryCards } from '@/components/attendance/AttendanceSummaryCards'
import { AttendanceViewSheet } from '@/components/attendance/AttendanceViewSheet'
import { useAuth, useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import { env } from '@/config/env'
import { messages } from '@/locales/rw/common'
import { messageForMutationFailure } from '@/offline/mutation-error-message'
import { OfflineEmptyState } from '@/components/offline/OfflineEmptyState'
import {
  buildAttendanceDayRows,
  computeAttendanceSummary,
  getRecordForDate,
  getTodayDate,
} from '@/lib/attendance-utils'
import { buildAttendanceFilterSummary, hasActiveAttendanceFilters } from '@/lib/filter-summary'
import { formatDate } from '@/lib/mock-data'
import type { AttendanceRecord, Child } from '@/types'

export function AttendancePage() {
  const { user } = useAuth()
  const { children, attendance, recordAttendance, clearTodayAttendance, childrenNeedOnlineBootstrap } =
    useData()
  const { showSuccess, showError } = useToast()

  const [filters, setFilters] = useState<AttendanceSearchFilters>(DEFAULT_ATTENDANCE_SEARCH)
  const [viewState, setViewState] = useState<AttendanceViewState>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(getTodayDate)

  const [modalChild, setModalChild] = useState<Child | null>(null)
  const [initialPresent, setInitialPresent] = useState<boolean | null>(null)
  const [viewEntry, setViewEntry] = useState<{ child: Child; record: AttendanceRecord } | null>(null)

  const today = getTodayDate()
  const recordedBy = user?.name ?? 'Umurezi'

  const activeChildren = useMemo(
    () => children.filter((c) => c.status === 'active'),
    [children],
  )

  const summary = useMemo(
    () => computeAttendanceSummary(activeChildren, attendance, selectedDate),
    [activeChildren, attendance, selectedDate],
  )

  const rosterRows = useMemo(
    () =>
      buildAttendanceDayRows({
        children: activeChildren,
        attendance,
        date: selectedDate,
        filters,
        viewState,
      }),
    [activeChildren, attendance, selectedDate, filters, viewState],
  )

  const filterSummary = useMemo(
    () => buildAttendanceFilterSummary(filters, viewState),
    [filters, viewState],
  )

  const hasActiveConfig = hasActiveAttendanceFilters(filters, viewState)

  const summaryStatus =
    viewState === 'arrived' ? 'present' : viewState === 'absent' ? 'absent' : viewState === 'all' ? 'all' : 'none'

  const resetAll = () => {
    setFilters(DEFAULT_ATTENDANCE_SEARCH)
    setViewState('all')
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
      const date = selectedDate

      try {
        await recordAttendance({
          childId,
          date,
          present: result.present,
          broughtBy: result.broughtBy,
          broughtByOther: result.broughtByOther,
          arrivedAt: result.arrivedAt,
          absentReason: result.absentReason,
          notes: result.notes,
          recordedBy,
        })

        closeDialog()
        showSuccess(
          env.isLive ? messages.attendanceRecordedLocal : messages.attendanceRecorded,
          {
            undoLabel: caretaker.attendance.undo,
            onUndo: () => {
              void clearTodayAttendance(childId, date)
            },
          },
        )
      } catch (err) {
        showError(messageForMutationFailure(err))
      }
    },
    [modalChild, recordAttendance, selectedDate, recordedBy, closeDialog, showSuccess, showError, clearTodayAttendance],
  )

  const panelTitle =
    viewState === 'arrived'
      ? caretaker.attendance.panelArrived
      : viewState === 'waiting'
        ? caretaker.attendance.panelWaiting
        : viewState === 'absent'
          ? caretaker.attendance.panelAbsent
          : caretaker.attendance.title

  return (
    <CaretakerLayout>
      <PageContainer>
        <PageHeader
          title={panelTitle}
          description={
            <>
              {caretaker.attendance.subtitle} —{' '}
              <span className="font-semibold text-text">{formatDate(selectedDate)}</span>
            </>
          }
        />

        <PageContent>
      {childrenNeedOnlineBootstrap ? (
        <OfflineEmptyState />
      ) : (
      <>
      <section aria-label={caretaker.attendance.summaryTitle} className="mb-6">
        <AttendanceDateNav
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          maxDate={today}
          className="mb-6"
        />

        <AttendanceSummaryCards
          stats={summary}
          className="mb-6"
          selectedStatus={summaryStatus}
          onSelectStatus={(status) => {
            setViewState(status === 'present' ? 'arrived' : status === 'absent' ? 'absent' : 'all')
          }}
        />

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
            count={rosterRows.length}
            summary={hasActiveConfig ? filterSummary : null}
            onClear={resetAll}
            showClear={hasActiveConfig}
          />
        )}

        <AttendanceDayRoster
          rows={rosterRows}
          dateLabel={formatDate(selectedDate)}
          resetDeps={[selectedDate, filters, viewState]}
          onMarkPresent={(child) => openDialog(child, true)}
          onMarkAbsent={(child) => openDialog(child, false)}
          onView={(child, record) => setViewEntry({ child, record })}
          onEdit={(child, record) => openDialog(child, record.present)}
        />
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
        existing={modalChild ? getRecordForDate(attendance, modalChild.id, selectedDate) ?? null : null}
        date={selectedDate}
        initialPresent={initialPresent}
        recordedBy={recordedBy}
        onClose={closeDialog}
        onConfirm={handleConfirm}
      />

      <AttendanceViewSheet
        open={!!viewEntry}
        child={viewEntry?.child ?? null}
        record={viewEntry?.record ?? null}
        onClose={() => setViewEntry(null)}
      />
      </>
      )}
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}
