import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { ATTENDANCE_THRESHOLD, SECTOR_PERFORMANCE } from '@/lib/mock-data'
import { district } from '@/locales/rw/district'

interface SectorPerformanceProps {
  compact?: boolean
  maxItems?: number
}

export function SectorPerformance({ compact = false, maxItems }: SectorPerformanceProps) {
  const sorted = [...SECTOR_PERFORMANCE].sort((a, b) => b.rate - a.rate)
  const visible = maxItems ? sorted.slice(0, maxItems) : sorted

  return (
    <Card padding={compact ? 'md' : 'lg'} className="h-full flex flex-col">
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-2.5' : 'mb-5'}`}>
        <h3 className={`font-semibold text-text ${compact ? 'text-body' : 'text-subheading'}`}>
          {district.dashboard.sectorPerformance}
        </h3>
        {compact && (
          <Link to="/district/ikarita" className="text-caption font-semibold text-primary hover:underline shrink-0">
            {district.gis.title} →
          </Link>
        )}
      </div>
      {!compact && (
        <p className="text-caption text-text-muted mb-4 -mt-2">{district.dashboard.sectorThresholdNote}</p>
      )}
      <ul className={`flex-1 ${compact ? 'space-y-1.5 max-h-[220px] overflow-y-auto pr-1' : 'space-y-3'}`}>
        {visible.map((sector) => {
          const needsSupport = sector.rate < ATTENDANCE_THRESHOLD
          return (
            <li
              key={sector.sector}
              className={`flex items-center gap-3 rounded-lg border ${
                compact ? 'px-2.5 py-2' : 'p-4 gap-4'
              } ${
                needsSupport
                  ? 'border-warning/30 bg-warning-light/30'
                  : 'border-border bg-background-subtle/40'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`font-semibold text-text truncate ${compact ? 'text-caption' : 'text-body'}`}>
                    {sector.sector}
                  </p>
                  <span
                    className={`font-bold shrink-0 ${compact ? 'text-body' : 'text-heading'} ${
                      needsSupport ? 'text-warning' : 'text-success'
                    }`}
                  >
                    {sector.rate}%
                  </span>
                </div>
                <div className={`bg-background-subtle rounded-full overflow-hidden ${compact ? 'mt-1.5 h-1.5' : 'mt-2.5 h-2.5'}`}>
                  <div
                    className={`h-full rounded-full ${needsSupport ? 'bg-warning' : 'bg-primary'}`}
                    style={{ width: `${sector.rate}%` }}
                  />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
