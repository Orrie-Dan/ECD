import { useMemo, useState, useCallback } from 'react'
import { Users } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { ListControlBar } from '@/components/ui/ListControlBar'
import {
  AdvancedFiltersDrawer,
  DEFAULT_ATTENDANCE_ADVANCED,
  isAttendanceAdvancedActive,
  type AttendanceAdvancedFilters,
} from '@/components/ui/AdvancedFiltersDrawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { AttendanceCard } from '@/components/caretaker/attendance/AttendanceCard'
import { ArrivalTimeline } from '@/components/caretaker/attendance/ArrivalTimeline'
import { AttendanceModal } from '@/components/caretaker/attendance/AttendanceModal'
import { AttendanceViewSheet } from '@/components/caretaker/attendance/AttendanceViewSheet'
import { useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import { messages } from '@/locales/rw/common'
import {
  filterWaitingChildren,
  getRecentArrivals,
  getTodayDate,
  type RecentArrival,
} from '@/lib/attendance-utils'
import type { AttendanceRecord, BroughtBy, Child } from '@/types'

export function AttendancePage() {
  const { children, attendance, recordAttendance, clearTodayAttendance, getTodayRecord } = useData()
  const { showSuccess } = useToast()

  const [search, setSearch] = useState('')
  const [viewState, setViewState] = useState<'all' | 'waiting'>('waiting')
  const [advanced, setAdvanced] = useState<AttendanceAdvancedFilters>(DEFAULT_ATTENDANCE_ADVANCED)
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
        search,
        sort: advanced.sort,
        genderFilter: advanced.gender,
        ageFilter: advanced.age,
      }),
    [children, todayRecordsMap, search, advanced]
  )

  const recentArrivals = useMemo(
    () => getRecentArrivals(children, attendance),
    [children, attendance]
  )

  const openModal = useCallback((child: Child, editing: boolean) => {
    const record = getTodayRecord(child.id)
    setModalChild(child)
    setIsEditing(editing)
    setBroughtBy(record?.broughtBy ?? '')
    setBroughtByOther(record?.broughtByOther ?? '')
  }, [getTodayRecord])

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
      broughtByOther: broughtBy === 'undi' ? broughtByOther.trim() : undefined,
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
    [children, openModal]
  )

  const showArrivedPanel = viewState === 'all'

  return (
    <CaretakerLayout>
      {/* Primary work area — Abataraza first */}
      <section aria-label={caretaker.attendance.panelWaiting} className="mb-6">
        <h2 className="text-heading text-text mb-1">{caretaker.attendance.panelWaiting}</h2>
        <p className="text-body text-text-secondary mb-5">{caretaker.attendance.subtitle}</p>

        <ListControlBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={caretaker.attendance.searchPlaceholder}
          viewState={viewState}
          onViewStateChange={setViewState}
          onOpenAdvancedFilters={() => setDrawerOpen(true)}
          hasActiveAdvancedFilters={isAttendanceAdvancedActive(advanced)}
        />

        {waitingChildren.length === 0 ? (
          <EmptyState
            icon={<Users size={48} className="text-text-muted" strokeWidth={1.5} />}
            title={caretaker.attendance.emptyWaiting}
            description={caretaker.attendance.noChildrenDesc}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {waitingChildren.map((child) => (
              <AttendanceCard
                key={child.id}
                child={child}
                onMarkArrived={() => openModal(child, false)}
              />
            ))}
          </div>
        )}
      </section>

      {showArrivedPanel && (
        <section aria-label={caretaker.attendance.panelArrived}>
          <ArrivalTimeline
            arrivals={recentArrivals}
            onEdit={handleEditFromTimeline}
            onView={setViewArrival}
          />
        </section>
      )}

      <AdvancedFiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant="attendance"
        filters={advanced}
        onApply={(f) => setAdvanced(f as AttendanceAdvancedFilters)}
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
