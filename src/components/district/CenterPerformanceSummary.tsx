import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { getBottomCenters, getTopCenters } from '@/lib/mock-data'
import { district } from '@/locales/rw/district'

interface CenterPerformanceSummaryProps {
  limit?: number
}

function CompactList({
  title,
  centers,
  accent,
}: {
  title: string
  centers: ReturnType<typeof getTopCenters>
  accent: 'success' | 'warning'
}) {
  const accentClass = accent === 'success' ? 'text-success' : 'text-warning'

  return (
    <div>
      <p className="text-caption font-semibold text-text-secondary uppercase tracking-wide mb-2">{title}</p>
      <ul className="space-y-1">
        {centers.map((center) => (
          <li key={center.id}>
            <Link
              to={`/district/ibigo/${center.id}`}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-background-subtle transition-colors group"
            >
              <span className="text-caption font-medium text-text truncate">{center.name}</span>
              <span className={`text-body font-bold shrink-0 ${accentClass}`}>{center.attendance}%</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CenterPerformanceSummary({ limit = 3 }: CenterPerformanceSummaryProps) {
  const top = getTopCenters(limit)
  const bottom = getBottomCenters(limit)

  return (
    <Card padding="md">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-body font-semibold text-text">{district.dashboard.schoolPerformance}</h3>
        <Link
          to="/district/ibigo"
          className="text-caption font-semibold text-primary hover:underline shrink-0"
        >
          {district.dashboard.viewAllCenters}
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CompactList title={district.dashboard.topCenters} centers={top} accent="success" />
        <CompactList title={district.dashboard.bottomCenters} centers={bottom} accent="warning" />
      </div>
    </Card>
  )
}
