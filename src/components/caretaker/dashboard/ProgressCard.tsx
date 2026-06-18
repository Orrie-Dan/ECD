import { Card } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'

interface ProgressCardProps {
  present: number
  total: number
}

export function ProgressCard({ present, total }: ProgressCardProps) {
  const rate = total > 0 ? Math.round((present / total) * 100) : 0
  const filledBars = Math.round(rate / 10)

  return (
    <Card padding="lg" className="h-full">
      <h2 className="text-subheading text-text mb-6">{caretaker.dashboard.attendanceProgress}</h2>

      <p className="text-body-lg text-text mb-4">
        {caretaker.dashboard.childrenArrived}:{' '}
        <span className="font-bold text-text">{present}</span>
        {' / '}
        <span className="font-bold text-text">{total}</span>
      </p>

      <div
        className="flex gap-1 mb-4"
        role="progressbar"
        aria-valuenow={rate}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${rate}%`}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`h-4 flex-1 rounded-sm ${
              i < filledBars ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </div>

      <p className="text-display text-primary">{rate}%</p>
    </Card>
  )
}
