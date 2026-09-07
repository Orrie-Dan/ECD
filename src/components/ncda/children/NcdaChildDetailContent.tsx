import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
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
  useNcdaChildAttendance,
  useNcdaChildNutrition,
  useNcdaChildReferrals,
} from '@/features/ncda/children/queries'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { ncda } from '@/locales/rw/ncda'
import { formatDate } from '@/lib/mock-data'
import { getGradeLabel } from '@/lib/child-filters'
import {
  getAssessmentDueStatus,
  sortMeasurementsDesc,
} from '@/lib/nutrition-utils'
import type { ChildViewModel } from '@/models/child'
import type { NutritionScreeningListItemViewModel } from '@/models/nutrition-screenings'
import type { GrowthMeasurement, NutritionAssessment } from '@/types'

type DetailTab = 'overview' | 'profile' | 'attendance' | 'growth'

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'overview', label: caretaker.childDetail.tabOverview },
  { id: 'profile', label: caretaker.childDetail.tabProfile },
  { id: 'attendance', label: caretaker.childDetail.tabAttendance },
  { id: 'growth', label: caretaker.childDetail.tabGrowth },
]

const HISTORY_PAGE_SIZE = 100

function screeningToMeasurement(item: NutritionScreeningListItemViewModel): GrowthMeasurement {
  return {
    id: item.id,
    childId: item.childId,
    date: item.screeningDate,
    weightKg: item.weightKg,
    heightCm: item.heightCm ?? 0,
    muacCm: item.muacCm,
    headCircumferenceCm: item.headCircumferenceCm ?? undefined,
    recordedBy: item.recordedById,
    nutritionStatus: item.nutritionStatus,
    requiresReferral: item.requiresReferral,
  }
}

function screeningToAssessment(item: NutritionScreeningListItemViewModel): NutritionAssessment {
  return {
    id: item.id,
    childId: item.childId,
    measurementId: item.id,
    date: item.screeningDate,
    status: item.nutritionStatus,
    requiresReferral: item.requiresReferral,
  }
}

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

interface NcdaChildDetailContentProps {
  child: ChildViewModel
}

export function NcdaChildDetailContent({ child }: NcdaChildDetailContentProps) {
  const [searchParams, setSearchParams] = useSearchParams()
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

  const needsAttendance = tab === 'overview' || tab === 'attendance'
  const needsNutrition = tab === 'overview' || tab === 'growth'
  const needsReferrals = tab === 'overview'

  const attendanceQ = useNcdaChildAttendance(
    child.id,
    1,
    HISTORY_PAGE_SIZE,
    needsAttendance,
  )
  const nutritionQ = useNcdaChildNutrition(child.id, 1, HISTORY_PAGE_SIZE, needsNutrition)
  const referralsQ = useNcdaChildReferrals(child.id, 1, 20, needsReferrals)

  const attendance = attendanceQ.data?.items ?? []
  const screenings = nutritionQ.data?.items ?? []
  const pendingReferrals = (referralsQ.data?.items ?? []).filter(
    (row) => row.status === 'pending',
  )

  const measurements = useMemo(
    () => screenings.map(screeningToMeasurement),
    [screenings],
  )
  const assessments = useMemo(
    () => screenings.map(screeningToAssessment),
    [screenings],
  )

  const presentCount = attendance.filter((row) => row.present).length
  const absentCount = attendance.filter((row) => !row.present).length

  const latestMeasurement = sortMeasurementsDesc(measurements)[0]
  const latestAssessment = useMemo(
    () =>
      [...assessments].sort(
        (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
      )[0],
    [assessments],
  )
  const assessmentDue = getAssessmentDueStatus(latestMeasurement?.date)
  const hasSpecialNeeds = Boolean(child.specialNeeds?.trim())
  const hasAlerts =
    hasSpecialNeeds ||
    pendingReferrals.length > 0 ||
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
  }, [child.archivedAt, child.registeredAt])

  const setTab = (next: DetailTab) => {
    setSearchParams(next === 'overview' ? {} : { tab: next }, { replace: true })
  }

  const historyLoading =
    (needsAttendance && attendanceQ.isLoading && !attendanceQ.data) ||
    (needsNutrition && nutritionQ.isLoading && !nutritionQ.data)

  return (
    <>
      <ChildHeader child={child} showActions={false} />

      {child.centerId ? (
        <p className="-mt-4 mb-4 text-caption text-text-secondary">
          <Link
            to={`${NCDA_PATHS.centers}/${child.centerId}`}
            className="font-semibold text-primary hover:underline"
          >
            {ncda.children.openCenter}: {child.centerName || child.centerId}
          </Link>
          {child.district ? (
            <>
              <span className="mx-2 text-border-strong" aria-hidden>
                ·
              </span>
              <span>{child.district}</span>
            </>
          ) : null}
        </p>
      ) : null}

      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 mb-6 bg-background-subtle rounded-xl border border-border"
        role="tablist"
        aria-label={caretaker.childDetail.title}
      >
        {TABS.map((item) => {
          const selected = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`ncda-child-tab-${item.id}`}
              aria-controls={`ncda-child-panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`
                w-full min-h-11 px-2 sm:px-3 py-2.5 rounded-lg text-body font-semibold text-center
                leading-snug transition-all duration-150
                focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2
                ${selected
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text hover:bg-surface/60'}
              `}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {historyLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-28 w-full" rounded="xl" />
          <Skeleton className="h-40 w-full" rounded="xl" />
        </div>
      ) : null}

      {tab === 'overview' && !historyLoading ? (
        <div
          id="ncda-child-panel-overview"
          role="tabpanel"
          aria-labelledby="ncda-child-tab-overview"
          className="space-y-4"
        >
          <Card padding="lg">
            <h3 className="text-label text-primary mb-4">{caretaker.childDetail.overviewAlerts}</h3>
            {!hasAlerts ? (
              <p className="text-body text-text-secondary">{caretaker.childDetail.noAlerts}</p>
            ) : (
              <ul className="space-y-3">
                {pendingReferrals.length > 0 ? (
                  <li className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-light/40 px-3.5 py-3">
                    <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold text-text">
                        {caretaker.childDetail.openReferralsTitle}
                      </p>
                      <p className="text-caption text-text-secondary">
                        {pendingReferrals.length} {ncda.children.sectionReferrals.toLowerCase()}
                      </p>
                    </div>
                  </li>
                ) : null}
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
                {hasSpecialNeeds ? (
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
                ) : null}
              </ul>
            )}
          </Card>

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
                    {index < timeline.length - 1 ? (
                      <span className="flex-1 w-px bg-border mt-1" aria-hidden />
                    ) : null}
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
      ) : null}

      {tab === 'profile' ? (
        <div
          id="ncda-child-panel-profile"
          role="tabpanel"
          aria-labelledby="ncda-child-tab-profile"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <ChildInfoCard title={caretaker.childDetail.personalInfo}>
            <DetailRow label={common.labels.dateOfBirth} value={formatDate(child.dateOfBirth)} />
            <DetailRow
              label={caretaker.registration.nationalId}
              value={child.nationalId?.trim() || caretaker.registration.notProvided}
            />
            <DetailRow
              label={ncda.children.colReg}
              value={child.registrationNumber?.trim() || caretaker.registration.notProvided}
            />
            <DetailRow
              label={caretaker.childDetail.dateRegistered}
              value={formatDate(child.registeredAt)}
            />
            <DetailRow
              label={caretaker.classrooms.gradeLabel}
              value={getGradeLabel(child.classroomGrade) || caretaker.classrooms.noClassroom}
            />
            <DetailRow label={ncda.children.colDistrict} value={child.district || '—'} />
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
      ) : null}

      {tab === 'attendance' && !historyLoading ? (
        <div
          id="ncda-child-panel-attendance"
          role="tabpanel"
          aria-labelledby="ncda-child-tab-attendance"
          className="space-y-4"
        >
          <AttendanceSummaryCard presentCount={presentCount} absentCount={absentCount} />
          <AttendanceHistoryTable records={attendance} resetDeps={[child.id]} />
        </div>
      ) : null}

      {tab === 'growth' && !historyLoading ? (
        <div
          id="ncda-child-panel-growth"
          role="tabpanel"
          aria-labelledby="ncda-child-tab-growth"
        >
          <ChildGrowthHistorySection
            child={child}
            measurements={measurements}
            assessments={assessments}
            canEdit={false}
          />
        </div>
      ) : null}
    </>
  )
}
