import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Baby, CheckCircle2, Hourglass, Plus } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Button } from '@/components/ui/Button'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/caretaker/dashboard/StatCard'
import { ProgressCard } from '@/components/caretaker/dashboard/ProgressCard'
import { ActivityTimeline, type ActivityItem } from '@/components/caretaker/dashboard/ActivityTimeline'
import { AttendanceSummaryCards } from '@/components/attendance/AttendanceSummaryCards'
import { useAuth, useData } from '@/contexts/AppContext'
import { caretaker } from '@/locales/rw/caretaker'
import { common, relations } from '@/locales/rw/common'
import { useEnrollmentChildren } from '@/hooks/useEnrollmentChildren'
import {
  computeAttendanceSummary,
  formatArrivalTime,
  formatRelativeDayLabel,
  getBroughtByLabel,
  getRecentArrivals,
  getTodayDate,
} from '@/lib/attendance-utils'
import type { Child, AttendanceRecord } from '@/types'

function buildActivityFeed(
  children: Child[],
  attendance: AttendanceRecord[]
): ActivityItem[] {
  const arrivals = getRecentArrivals(children, attendance, 15).map(({ child, record }) => ({
    id: `arr-${record.id}`,
    sortTime: new Date(record.arrivedAt!).getTime(),
    timeLabel: formatArrivalTime(record.arrivedAt),
    description: `${child.fullName.split(' ')[0]} ${caretaker.dashboard.arrivedAction} (${getBroughtByLabel(record.broughtBy, record.broughtByOther, relations)})`,
    type: 'arrival' as const,
  }))

  const registrations = [...children]
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
    .slice(0, 8)
    .map((child) => {
      const dayLabel = formatRelativeDayLabel(child.registeredAt)
      return {
        id: `reg-${child.id}`,
        sortTime: new Date(child.registeredAt).getTime(),
        timeLabel: dayLabel || '—',
        description: `${child.fullName.split(' ')[0]} ${caretaker.dashboard.registeredAction}`,
        type: 'registration' as const,
      }
    })

  return [...arrivals, ...registrations]
    .sort((a, b) => b.sortTime - a.sortTime)
    .slice(0, 12)
    .map(({ id, timeLabel, description, type }) => ({ id, timeLabel, description, type }))
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString('rw-RW', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function CaretakerDashboardPage() {
  const { user } = useAuth()
  const { attendance } = useData()
  const enrolledChildren = useEnrollmentChildren()
  const navigate = useNavigate()

  const summary = useMemo(
    () => computeAttendanceSummary(enrolledChildren, attendance, getTodayDate()),
    [enrolledChildren, attendance],
  )
  const presentCount = summary.present
  const waitingCount = summary.unrecorded

  const activityItems = useMemo(
    () => buildActivityFeed(enrolledChildren, attendance),
    [enrolledChildren, attendance]
  )

  return (
    <CaretakerLayout>
      <PageContainer>
        <PageHeader
          title={`${caretaker.dashboard.greeting}, ${user?.name}`}
          description={`${caretaker.dashboard.centerLabel}: ${user?.centerName}`}
          action={
            <Button
              variant="primary"
              size="xl"
              icon={<Plus size={22} strokeWidth={2.5} />}
              onClick={() => navigate('/caretaker/ubwitabire')}
              className="w-full sm:w-auto shrink-0"
            >
              {caretaker.dashboard.primaryAction}
            </Button>
          }
        />
        <p className="text-body text-text-muted -mt-3 mb-5">
          {caretaker.dashboard.todayLabel}: {formatTodayDate()}
        </p>

        <PageContent>
          <section aria-label={caretaker.attendance.summaryTitle} className="mb-8">
            <AttendanceSummaryCards stats={summary} />
          </section>

          <section aria-label={common.ui.keyStats} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard icon={<Baby size={22} />} label={caretaker.dashboard.totalChildren} value={enrolledChildren.length} />
            <StatCard icon={<CheckCircle2 size={22} />} label={caretaker.dashboard.presentToday} value={presentCount} variant="success" />
            <StatCard icon={<Hourglass size={22} />} label={caretaker.dashboard.notYetArrived} value={waitingCount} variant="warning" />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityTimeline items={activityItems} />
            <ProgressCard present={presentCount} total={enrolledChildren.length} />
          </div>
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}
