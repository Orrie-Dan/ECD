import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Clock, Send } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChildHeader } from '@/components/children/ChildHeader'
import { ChildInfoCard, DetailRow } from '@/components/children/ChildInfoCard'
import { GuardianCard } from '@/components/children/GuardianCard'
import { AddressCard } from '@/components/children/AddressCard'
import { AttendanceSummaryCard } from '@/components/children/AttendanceSummaryCard'
import { AttendanceHistoryTable } from '@/components/attendance/AttendanceHistoryTable'
import { ChildGrowthHistorySection } from '@/components/growth/ChildGrowthHistorySection'
import { NutritionStatusCard } from '@/components/growth/NutritionStatusCard'
import { AssessmentReminderCard } from '@/components/growth/AssessmentReminderCard'
import {
  MeasurementDialog,
  type MeasurementDialogResult,
} from '@/components/growth/MeasurementDialog'
import { ArchiveDialog } from '@/components/children/ArchiveDialog'
import { ReactivateChildDialog } from '@/components/children/ReactivateChildDialog'
import { useAuth, useData } from '@/contexts/AppContext'
import { isCaretaker as userIsCaretaker } from '@/api/roles'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { formatDate } from '@/lib/mock-data'
import {
  getAssessmentDueStatus,
  getLatestMeasurement,
  sortMeasurementsDesc,
} from '@/lib/nutrition-utils'
import type { Child, GrowthMeasurement } from '@/types'

type DetailTab = 'overview' | 'profile' | 'attendance' | 'growth'

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'overview', label: caretaker.childDetail.tabOverview },
  { id: 'profile', label: caretaker.childDetail.tabProfile },
  { id: 'attendance', label: caretaker.childDetail.tabAttendance },
  { id: 'growth', label: caretaker.childDetail.tabGrowth },
]

function SpecialNeedsContent({ text }: { text: string }) {
  const segments = text
    .split(/\s*—\s*/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (segments.length <= 1) {
    return (
      <div className="rounded-lg border border-border bg-background-subtle/50 px-3.5 py-3">
        <p className="text-body text-text leading-relaxed whitespace-pre-wrap break-words">{text}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-warning/25 bg-warning-light/35 px-3.5 py-3 space-y-2.5">
      {segments.map((segment, index) => (
        <div key={index} className={index > 0 ? 'pt-2.5 border-t border-warning/15' : undefined}>
          {index === 0 ? (
            <p className="text-body font-semibold text-text leading-snug break-words">{segment}</p>
          ) : (
            <p className="text-body text-text-secondary leading-relaxed break-words">{segment}</p>
          )}
        </div>
      ))}
    </div>
  )
}

interface ChildDetailContentProps {
  child: Child
  /** Base path for edit navigation (caretaker vs district). */
  editBasePath?: string
  showActions?: boolean
}

export function ChildDetailContent({
  child,
  editBasePath = '/caretaker/abana',
  showActions = true,
}: ChildDetailContentProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    getChildAttendance,
    getChildMeasurements,
    getChildAssessments,
    getChildReferrals,
    recordMeasurement,
    updateMeasurement,
    updateReferralStatus,
    updateReferral,
  } = useData()
  const { showSuccess } = useToast()

  const rawTab = searchParams.get('tab')
  const tab: DetailTab =
    rawTab === 'attendance' ||
    rawTab === 'overview' ||
    rawTab === 'profile' ||
    rawTab === 'growth'
      ? rawTab
      : rawTab === 'info'
        ? 'profile'
        : 'overview'

  const [archiveOpen, setArchiveOpen] = useState(false)
  const [reactivateOpen, setReactivateOpen] = useState(false)
  const [measureOpen, setMeasureOpen] = useState(false)
  const [editingMeasurement, setEditingMeasurement] = useState<GrowthMeasurement | null>(null)

  const isCaretaker = userIsCaretaker(user)
  const actionsEnabled = showActions && isCaretaker

  const attendance = getChildAttendance(child.id)
  const presentCount = attendance.filter((a) => a.present).length
  const absentCount = attendance.filter((a) => !a.present).length

  const measurements = getChildMeasurements(child.id)
  const assessments = getChildAssessments(child.id)
  const referrals = getChildReferrals(child.id)

  const latestMeasurement = useMemo(
    () => sortMeasurementsDesc(measurements)[0],
    [measurements],
  )
  const latestAssessment = useMemo(
    () =>
      [...assessments].sort(
        (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
      )[0],
    [assessments],
  )
  const assessmentDue = getAssessmentDueStatus(latestMeasurement?.date)
  const openReferrals = referrals.filter((r) => r.status !== 'completed')
  const hasSpecialNeeds = Boolean(child.specialNeeds?.trim())
  const hasAlerts =
    hasSpecialNeeds ||
    openReferrals.length > 0 ||
    assessmentDue === 'due' ||
    assessmentDue === 'overdue' ||
    assessmentDue === 'never'

  const timeline = useMemo(() => {
    const items: { date: string; label: string }[] = [
      { date: child.registeredAt, label: caretaker.childDetail.timelineRegistered },
    ]
    if (child.archivedAt) {
      items.push({ date: child.archivedAt, label: caretaker.childDetail.timelineArchived })
    }
    return items.sort((a, b) => a.date.localeCompare(b.date))
  }, [child])

  const setTab = (next: DetailTab) => {
    setSearchParams(next === 'overview' ? {} : { tab: next }, { replace: true })
  }

  const openMeasureDialog = (record: GrowthMeasurement | null = null) => {
    setEditingMeasurement(record)
    setMeasureOpen(true)
  }

  return (
    <>
      <ChildHeader
        child={child}
        showActions={actionsEnabled}
        onEdit={() => navigate(`${editBasePath}/${child.id}/hindura`)}
        onArchive={() => setArchiveOpen(true)}
        onReactivate={() => setReactivateOpen(true)}
        onRecordMeasurement={
          actionsEnabled && child.status === 'active'
            ? () => openMeasureDialog(null)
            : undefined
        }
      />

      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 mb-6 bg-background-subtle rounded-xl border border-border"
        role="tablist"
        aria-label={caretaker.childDetail.title}
      >
        {TABS.map((t) => {
          const selected = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`child-tab-${t.id}`}
              aria-controls={`child-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`
                w-full min-h-11 px-2 sm:px-3 py-2.5 rounded-lg text-body font-semibold text-center
                leading-snug transition-all duration-150
                focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2
                ${selected
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text hover:bg-surface/60'}
              `}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && (
        <div
          id="child-panel-overview"
          role="tabpanel"
          aria-labelledby="child-tab-overview"
          className="space-y-4"
        >
          {/* Alerts requiring attention */}
          <Card padding="lg">
            <h3 className="text-label text-primary mb-4">{caretaker.childDetail.overviewAlerts}</h3>
            {!hasAlerts ? (
              <p className="text-body text-text-secondary">{caretaker.childDetail.noAlerts}</p>
            ) : (
              <ul className="space-y-3">
                {(assessmentDue === 'due' ||
                  assessmentDue === 'overdue' ||
                  assessmentDue === 'never') && (
                  <li className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-light/40 px-3.5 py-3">
                    <Clock size={18} className="text-warning shrink-0 mt-0.5" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold text-text">
                        {assessmentDue === 'overdue' || assessmentDue === 'never'
                          ? caretaker.growth.dueOverdue
                          : caretaker.growth.dueSoon}
                      </p>
                      <Button
                        variant="tertiary"
                        size="sm"
                        className="mt-1 -ml-2"
                        onClick={() => setTab('growth')}
                      >
                        {caretaker.childDetail.viewTab} {caretaker.childDetail.tabGrowth}
                      </Button>
                    </div>
                  </li>
                )}
                {openReferrals.length > 0 && (
                  <li className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-light/40 px-3.5 py-3">
                    <Send size={18} className="text-warning shrink-0 mt-0.5" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold text-text">
                        {caretaker.childDetail.openReferralsAlert}: {openReferrals.length}
                      </p>
                      <Button
                        variant="tertiary"
                        size="sm"
                        className="mt-1 -ml-2"
                        onClick={() => setTab('growth')}
                      >
                        {caretaker.childDetail.viewTab} {caretaker.childDetail.tabGrowth}
                      </Button>
                    </div>
                  </li>
                )}
                {hasSpecialNeeds && (
                  <li className="flex items-start gap-3 rounded-lg border border-border bg-background-subtle/60 px-3.5 py-3">
                    <AlertTriangle size={18} className="text-accent shrink-0 mt-0.5" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold text-text">
                        {caretaker.childDetail.specialNeedsAlert}
                      </p>
                      <Button
                        variant="tertiary"
                        size="sm"
                        className="mt-1 -ml-2"
                        onClick={() => setTab('profile')}
                      >
                        {caretaker.childDetail.viewTab} {caretaker.childDetail.tabProfile}
                      </Button>
                    </div>
                  </li>
                )}
              </ul>
            )}
          </Card>

          {/* Growth & nutrition at a glance */}
          <div>
            <h3 className="text-label text-primary mb-3">
              {caretaker.childDetail.overviewGrowth}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <NutritionStatusCard
                measurement={latestMeasurement}
                assessment={latestAssessment}
              />
              <AssessmentReminderCard latestDate={latestMeasurement?.date} />
            </div>
          </div>

          {/* Attendance snapshot */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-label text-primary">
                {caretaker.childDetail.overviewAttendance}
              </h3>
              <Button variant="tertiary" size="sm" onClick={() => setTab('attendance')}>
                {caretaker.childDetail.viewTab} {caretaker.childDetail.tabAttendance}
              </Button>
            </div>
            <AttendanceSummaryCard presentCount={presentCount} absentCount={absentCount} />
          </div>

          {/* Lifecycle milestones */}
          <Card padding="lg">
            <h3 className="text-label text-primary mb-4">
              {caretaker.childDetail.overviewTimeline}
            </h3>
            <ol className="space-y-4">
              {timeline.map((item, index) => (
                <li key={`${item.date}-${item.label}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                        index === timeline.length - 1 ? 'bg-primary' : 'bg-border-strong'
                      }`}
                      aria-hidden
                    />
                    {index < timeline.length - 1 && (
                      <span className="flex-1 w-px bg-border mt-1" aria-hidden />
                    )}
                  </div>
                  <div className="pb-2">
                    <p className="text-body font-semibold text-text">{item.label}</p>
                    <p className="text-caption text-text-secondary">{formatDate(item.date)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}

      {tab === 'profile' && (
        <div
          id="child-panel-profile"
          role="tabpanel"
          aria-labelledby="child-tab-profile"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <ChildInfoCard title={caretaker.childDetail.personalInfo}>
            <DetailRow label={common.labels.dateOfBirth} value={formatDate(child.dateOfBirth)} />
            <DetailRow
              label={caretaker.childDetail.dateRegistered}
              value={formatDate(child.registeredAt)}
            />
          </ChildInfoCard>

          <GuardianCard child={child} which={1} />
          <GuardianCard child={child} which={2} />
          <AddressCard child={child} />

          <Card padding="lg" className="lg:col-span-2">
            <h3 className="text-label text-primary mb-4">
              {caretaker.childDetail.specialNeedsLabel}
            </h3>
            {child.specialNeeds?.trim() ? (
              <SpecialNeedsContent text={child.specialNeeds.trim()} />
            ) : (
              <p className="text-body text-text-muted italic">
                {caretaker.childDetail.noSpecialNeeds}
              </p>
            )}
          </Card>
        </div>
      )}

      {tab === 'attendance' && (
        <div
          id="child-panel-attendance"
          role="tabpanel"
          aria-labelledby="child-tab-attendance"
          className="space-y-4"
        >
          <AttendanceSummaryCard presentCount={presentCount} absentCount={absentCount} />
          <AttendanceHistoryTable records={attendance} resetDeps={[child.id]} />
        </div>
      )}

      {tab === 'growth' && (
        <div
          id="child-panel-growth"
          role="tabpanel"
          aria-labelledby="child-tab-growth"
        >
          <ChildGrowthHistorySection
            child={child}
            measurements={measurements}
            assessments={assessments}
            referrals={referrals}
            canEdit={actionsEnabled && child.status === 'active'}
            onRecordMeasurement={() => openMeasureDialog(null)}
            onEditMeasurement={(record) => openMeasureDialog(record)}
            onCompleteReferral={async (id, notes) => {
              await updateReferralStatus(id, 'completed', { notes })
              showSuccess(caretaker.referral.statusUpdated)
            }}
            onMarkReferralImplemented={async (id) => {
              await updateReferral(id, { implementedAt: new Date().toISOString().split('T')[0] })
              showSuccess(caretaker.referral.implementedSaved)
            }}
            onSaveReferralNotes={async (id, notes) => {
              await updateReferral(id, { notes })
              showSuccess(caretaker.referral.notesSaved)
            }}
          />
        </div>
      )}

      {actionsEnabled && (
        <>
          <ArchiveDialog open={archiveOpen} onClose={() => setArchiveOpen(false)} child={child} />
          <ReactivateChildDialog
            open={reactivateOpen}
            onClose={() => setReactivateOpen(false)}
            child={child}
          />
          <MeasurementDialog
            open={measureOpen}
            child={child}
            existing={editingMeasurement}
            fallbackHeightCm={
              editingMeasurement?.heightCm ??
              getLatestMeasurement(measurements, child.id)?.heightCm ??
              0
            }
            onClose={() => {
              setMeasureOpen(false)
              setEditingMeasurement(null)
            }}
            onConfirm={async (result: MeasurementDialogResult) => {
              try {
                if (editingMeasurement) {
                  await updateMeasurement(editingMeasurement.id, {
                    date: result.date,
                    weightKg: result.weightKg,
                    heightCm: result.heightCm || editingMeasurement.heightCm,
                    muacCm: result.muacCm,
                    headCircumferenceCm:
                      result.headCircumferenceCm ?? editingMeasurement.headCircumferenceCm,
                    notes: result.notes,
                    recordedBy: user?.name ?? 'Umurezi',
                  })
                  showSuccess(caretaker.growth.updated)
                } else {
                  const prior = getLatestMeasurement(measurements, child.id)
                  await recordMeasurement({
                    childId: child.id,
                    date: result.date,
                    weightKg: result.weightKg,
                    heightCm: result.heightCm || prior?.heightCm || 0,
                    muacCm: result.muacCm,
                    headCircumferenceCm:
                      result.headCircumferenceCm ?? prior?.headCircumferenceCm,
                    notes: result.notes,
                    recordedBy: user?.name ?? 'Umurezi',
                  })
                  showSuccess(caretaker.growth.saved)
                }
                setMeasureOpen(false)
                setEditingMeasurement(null)
              } catch {
                // ApiErrorBridge toasts LIVE failures
              }
            }}
          />
        </>
      )}
    </>
  )
}
