import { Card } from '@/components/ui/Card'
import { ATTENDANCE_OVERVIEW } from '@/lib/mock-data'
import { district } from '@/locales/rw/district'
import { TrendBadge } from '@/components/district/TrendBadge'

const periods = [
  { key: 'today' as const, label: district.dashboard.attendanceToday },
  { key: 'week' as const, label: district.dashboard.attendanceWeek },
  { key: 'month' as const, label: district.dashboard.attendanceMonth },
]

interface AttendanceOverviewProps {
  compact?: boolean
}

export function AttendanceOverview({ compact = false }: AttendanceOverviewProps) {
  return (
    <Card padding={compact ? 'md' : 'lg'} className="h-full">
      <h3 className={`font-semibold text-text ${compact ? 'text-body mb-3' : 'text-subheading mb-5'}`}>
        {district.dashboard.attendanceOverview}
      </h3>
      <div className={`grid grid-cols-1 min-[400px]:grid-cols-3 ${compact ? 'gap-2' : 'gap-4'}`}>
        {periods.map(({ key, label }) => {
          const data = ATTENDANCE_OVERVIEW[key]
          const isLow = data.rate < 70
          return (
            <div
              key={key}
              className={`rounded-lg border text-center ${
                compact ? 'p-2.5 sm:p-3' : 'p-5'
              } ${
                isLow ? 'border-warning/30 bg-warning-light/30' : 'border-border bg-background-subtle/50'
              }`}
            >
              <p className={`text-text-secondary ${compact ? 'text-caption mb-1' : 'text-body mb-2'}`}>
                {label}
              </p>
              <p className={`font-bold ${compact ? 'text-heading' : 'text-display'} ${isLow ? 'text-warning' : 'text-text'}`}>
                {data.rate}%
              </p>
              <div className={compact ? 'mt-1.5' : 'mt-3'}>
                <TrendBadge direction={data.trend} change={compact ? undefined : data.change} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
