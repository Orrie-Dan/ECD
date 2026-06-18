import { Card } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'

export interface ActivityItem {
  id: string
  timeLabel: string
  description: string
  type: 'arrival' | 'registration'
}

interface ActivityTimelineProps {
  items: ActivityItem[]
  title?: string
  emptyMessage?: string
}

export function ActivityTimeline({
  items,
  title = caretaker.dashboard.recentActions,
  emptyMessage = caretaker.dashboard.noRecentActivity,
}: ActivityTimelineProps) {
  return (
    <Card padding="lg" className="h-full">
      <h2 className="text-subheading text-text mb-5">{title}</h2>

      {items.length === 0 ? (
        <p className="text-body text-text-secondary py-6">{emptyMessage}</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="flex gap-4">
              <span className="text-body font-mono font-semibold text-secondary shrink-0 w-14">
                {item.timeLabel}
              </span>
              <span className="text-body text-text flex-1">{item.description}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
