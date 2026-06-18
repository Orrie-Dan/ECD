import { Eye, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { caretaker } from '@/locales/rw/caretaker'
import { relations } from '@/locales/rw/common'
import { formatArrivalTime, getBroughtByLabel, type RecentArrival } from '@/lib/attendance-utils'

interface ArrivalTimelineProps {
  arrivals: RecentArrival[]
  onEdit: (childId: string) => void
  onView: (arrival: RecentArrival) => void
  emptyMessage?: string
}

export function ArrivalTimeline({
  arrivals,
  onEdit,
  onView,
  emptyMessage = caretaker.attendance.noArrivalsYet,
}: ArrivalTimelineProps) {
  return (
    <Card padding="lg" className="h-full">
      <h2 className="text-subheading text-text mb-5">{caretaker.attendance.panelArrived}</h2>

      {arrivals.length === 0 ? (
        <p className="text-body text-text-secondary py-8 text-center">{emptyMessage}</p>
      ) : (
        <ul className="space-y-5">
          {arrivals.map(({ child, record }) => (
            <li
              key={record.id}
              className="flex gap-4 p-4 rounded-xl bg-background-subtle/60 border border-border transition-colors duration-200 hover:border-primary/20"
            >
              <div className="shrink-0 text-center w-16">
                <p className="text-body font-mono font-bold text-secondary">
                  {formatArrivalTime(record.arrivedAt)}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-subheading text-text">{child.fullName}</p>
                <p className="text-body text-text-secondary mt-1">
                  {caretaker.attendance.broughtByLabel}{' '}
                  {getBroughtByLabel(record.broughtBy, record.broughtByOther, relations)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  variant="tertiary"
                  size="sm"
                  icon={<Eye size={16} />}
                  onClick={() => onView({ child, record })}
                  aria-label={`${caretaker.attendance.view} ${child.fullName}`}
                >
                  {caretaker.attendance.view}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Pencil size={16} />}
                  onClick={() => onEdit(child.id)}
                  aria-label={`${caretaker.attendance.edit} ${child.fullName}`}
                >
                  {caretaker.attendance.edit}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
