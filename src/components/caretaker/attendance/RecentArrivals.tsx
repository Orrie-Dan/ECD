import { Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'
import { relations } from '@/locales/rw/common'
import { formatArrivalTime, getBroughtByLabel, type RecentArrival } from '@/lib/attendance-utils'

interface RecentArrivalsProps {
  arrivals: RecentArrival[]
}

export function RecentArrivals({ arrivals }: RecentArrivalsProps) {
  if (arrivals.length === 0) return null

  return (
    <Card padding="md" className="mb-6 border-secondary/15 bg-secondary-light/30">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={18} className="text-secondary" />
        <h3 className="text-label text-text">{caretaker.attendance.recentArrivals}</h3>
      </div>
      <ul className="space-y-2">
        {arrivals.map(({ child, record }) => (
          <li
            key={record.id}
            className="flex items-center gap-3 text-body py-2 px-3 rounded-lg bg-surface/70 border border-border"
          >
            <span className="font-mono text-caption font-semibold text-secondary shrink-0">
              {formatArrivalTime(record.arrivedAt)}
            </span>
            <span className="text-border-strong">—</span>
            <span className="font-medium text-text truncate flex-1">{child.fullName}</span>
            <span className="text-caption text-text-secondary shrink-0">
              {getBroughtByLabel(record.broughtBy, record.broughtByOther, relations)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
