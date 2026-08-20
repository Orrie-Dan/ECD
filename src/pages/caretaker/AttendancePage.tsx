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
import { ClassroomCards } from '@/components/classrooms/ClassroomCards'
import { ClassroomBackLink } from '@/components/classrooms/ClassroomBackLink'
import { useClassroomGateway } from '@/hooks/useClassroomGateway'
import { useEnrollmentChildren } from '@/hooks/useEnrollmentChildren'
import { useAuth, useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import { getClassroomSelectionLabel } from '@/lib/child-filters'
import { env } from '@/config/env'
import { messages } from '@/locales/rw/common'
import { messageForMutationFailure } from '@/offline/mutation-error-message'
import { OfflineEmptyState } from '@/components/offline/OfflineEmptyState'
import {
  buildAttendanceDayRows,
  computeAttendanceSummary,
  getDayStatus,
  getRecordForDate,
  getTodayDate,
} from '@/lib/attendance-utils'
import { buildAttendanceFilterSummary, hasActiveAttendanceFilters } from '@/lib/filter-summary'
import { formatDate } from '@/lib/mock-data'
import type { AttendanceRecord, Child, ClassroomGrade } from '@/types'
import { CheckCircle2 } from 'lucide-react'

export function AttendancePage() {
  const { user } = useAuth()
  const { attendance, recordAttendance, clearTodayAttendance, childrenNeedOnlineBootstrap } =
    useData()
  const enrolledChildren = useEnrollmentChildren()
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

  const { selectedGrade, setSelectedGrade, gradeChildren, goBack, isGradeSelected } =
    useClassroomGateway(enrolledChildren)

  const summary = useMemo(
    () => computeAttendanceSummary(gradeChildren, attendance, selectedDate),
    [gradeChildren, attendance, selectedDate],
  )

  const rosterRows = useMemo(
    () =>
      buildAttendanceDayRows({
        children: gradeChildren,
        attendance,
        date: selectedDate,
        filters,
        viewState,
      }),
    [gradeChildren, attendance, selectedDate, filters, viewState],
  )

  const filterSummary = useMemo(
    () => buildAttendanceFilterSummary(filters, viewState),
    [filters, viewState],
  )

  const hasActiveConfig = hasActiveAttendanceFilters(filters, viewState)

  const summaryStatus =
    viewState === 'arrived' ? 'present' : viewState === 'absent' ? 'absent' : viewState === 'all' ? 'all' : 'none'

  const resetFilters = () => {
    setFilters(DEFAULT_ATTENDANCE_SEARCH)
    setViewState('all')
  }

  const goBackToClassrooms = () => {
    goBack()
    resetFilters()
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

  const panelTitle = isGradeSelected
    ? getClassroomSelectionLabel(selectedGrade)
    : caretaker.attendance.title

  const panelDescription = isGradeSelected
    ? (
      <>
        {caretaker.attendance.subtitle} —{' '}
        <span className="font-semibold text-text">{formatDate(selectedDate)}</span>
      </>
    )
    : caretaker.attendance.subtitle

  const getAttendanceDetail = (_grade: ClassroomGrade, kids: Child[]) => {
    let present = 0
    let recorded = 0
    for (const kid of kids) {
      const status = getDayStatus(attendance, kid.id, selectedDate)
      if (status !== 'unrecorded') recorded++
      if (status === 'present') present++
    }
    const total = kids.length
    const allDone = total > 0 && recorded === total
    return (
      <div className="flex items-center gap-2">
        {allDone ? (
          <span className="flex items-center gap-1 text-caption font-semibold text-success">
            <CheckCircle2 size={14} />
            {recorded}/{total}
          </span>
        ) : (
          <span className="text-caption font-medium text-text-muted">
            {present}/{total} {caretaker.attendance.arrived.toLowerCase()}
          </span>
        )}
        {total > 0 && (
          <div className="flex-1 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${(recorded / total) * 100}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <CaretakerLayout>
      <PageContainer>
        {isGradeSelected && <ClassroomBackLink onClick={goBackToClassrooms} />}

        <PageHeader
          title={panelTitle}
          description={panelDescription}
        />

        <PageContent>
      {childrenNeedOnlineBootstrap ? (
        <OfflineEmptyState />
      ) : !isGradeSelected ? (
        <section aria-label={caretaker.classrooms.title}>
          <AttendanceDateNav
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            maxDate={today}
            className="mb-6"
          />

          <ClassroomCards
            children={enrolledChildren}
            onSelect={setSelectedGrade}
            getDetail={getAttendanceDetail}
          />
        </section>
      ) : (
        /* ── Step 2: Children roster for selected classroom ── */
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
          showLate={false}
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

        {gradeChildren.length > 0 && (
          <FilterResultsBar
            count={rosterRows.length}
            summary={hasActiveConfig ? filterSummary : null}
            onClear={resetFilters}
            showClear={hasActiveConfig}
          />
        )}

        <AttendanceDayRoster
          rows={rosterRows}
          dateLabel={formatDate(selectedDate)}
          resetDeps={[selectedDate, selectedGrade, filters, viewState]}
          groupByGrade={false}
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
