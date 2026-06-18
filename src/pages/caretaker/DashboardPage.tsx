import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Baby, CheckCircle2, Hourglass, Plus } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/caretaker/dashboard/StatCard'
import { ProgressCard } from '@/components/caretaker/dashboard/ProgressCard'
import { ActivityTimeline, type ActivityItem } from '@/components/caretaker/dashboard/ActivityTimeline'
import { useAuth, useData } from '@/contexts/AppContext'
import { caretaker } from '@/locales/rw/caretaker'
import { relations } from '@/locales/rw/common'
import {
  formatArrivalTime,
  formatRelativeDayLabel,
  getBroughtByLabel,
  getRecentArrivals,
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
  const { children, attendance, isPresentToday } = useData()
  const navigate = useNavigate()

  const presentCount = children.filter((c) => isPresentToday(c.id)).length
  const waitingCount = children.length - presentCount

  const activityItems = useMemo(
    () => buildActivityFeed(children, attendance),
    [children, attendance]
  )

  return (
    <CaretakerLayout>
      {/* Welcome header */}
      <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
        <div className="space-y-2">
          <h1 className="text-display text-text">
            {caretaker.dashboard.greeting}, {user?.name}
          </h1>
          <p className="text-body-lg text-text-secondary">
            {caretaker.dashboard.centerLabel}: <span className="font-semibold text-text">{user?.centerName}</span>
          </p>
          <p className="text-body text-text-muted">
            {caretaker.dashboard.todayLabel}: {formatTodayDate()}
          </p>
        </div>
        <Button
          variant="primary"
          size="xl"
          icon={<Plus size={22} strokeWidth={2.5} />}
          onClick={() => navigate('/caretaker/ubwitabire')}
          className="shrink-0"
        >
          {caretaker.dashboard.primaryAction}
        </Button>
      </header>

      {/* Statistics */}
      <section aria-label="Imibare y'ingenzi" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<Baby size={22} />} label={caretaker.dashboard.totalChildren} value={children.length} />
        <StatCard icon={<CheckCircle2 size={22} />} label={caretaker.dashboard.presentToday} value={presentCount} variant="success" />
        <StatCard icon={<Hourglass size={22} />} label={caretaker.dashboard.notYetArrived} value={waitingCount} variant="warning" />
      </section>

      {/* Two-column main area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityTimeline items={activityItems} />
        <ProgressCard present={presentCount} total={children.length} />
      </div>
    </CaretakerLayout>
  )
}
