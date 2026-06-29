import { Link } from 'react-router-dom'
import { Clock, UserPlus, UserMinus, CheckCircle, ClipboardCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { DISTRICT_RECENT_ACTIVITY } from '@/lib/mock-data'
import { district } from '@/locales/rw/district'

const actionConfig = {
  attendanceSubmitted: {
    icon: ClipboardCheck,
    color: 'text-primary',
    bg: 'bg-primary-light',
    label: district.activity.attendanceSubmitted,
  },
  childRegistered: {
    icon: UserPlus,
    color: 'text-success',
    bg: 'bg-success-light',
    label: district.activity.childRegistered,
  },
  dropoutRecorded: {
    icon: UserMinus,
    color: 'text-warning',
    bg: 'bg-warning-light',
    label: district.activity.dropoutRecorded,
  },
  alertResolved: {
    icon: CheckCircle,
    color: 'text-secondary',
    bg: 'bg-secondary-light',
    label: district.activity.alertResolved,
  },
} as const

interface RecentActivityFeedProps {
  compact?: boolean
  limit?: number
}

export function RecentActivityFeed({ compact = false, limit = 6 }: RecentActivityFeedProps) {
  const items = DISTRICT_RECENT_ACTIVITY.slice(0, limit)

  return (
    <Card padding={compact ? 'md' : 'lg'} className="h-full">
      <h3 className={`font-semibold text-text ${compact ? 'text-body mb-3' : 'text-subheading mb-5'}`}>
        {district.dashboard.recentActivity}
      </h3>
      <ul className={compact ? 'space-y-2' : 'space-y-3'}>
        {items.map((item) => {
          const config = actionConfig[item.action]
          const Icon = config.icon
          return (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-lg border border-border bg-background-subtle/50 ${
                compact ? 'px-3 py-2' : 'px-4 py-3'
              }`}
            >
              <span
                className={`flex items-center justify-center shrink-0 rounded-lg ${
                  compact ? 'w-8 h-8' : 'w-10 h-10'
                } ${config.bg}`}
              >
                <Icon size={compact ? 16 : 18} className={config.color} aria-hidden />
              </span>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-text truncate ${compact ? 'text-caption' : 'text-body'}`}>
                  <Link to="/district/ibigo" className="hover:text-primary transition-colors">
                    {item.centerName}
                  </Link>
                </p>
                <p className={`text-text-secondary ${compact ? 'text-caption' : 'text-body'}`}>
                  {config.label}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-caption text-text-muted shrink-0">
                <Clock size={12} aria-hidden />
                {item.time}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
