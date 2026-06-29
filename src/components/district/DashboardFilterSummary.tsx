import { MapPin, Clock } from 'lucide-react'
import { DISTRICT_NAME } from '@/lib/mock-data'
import type { EffectiveDateRange } from '@/lib/chart-period'
import { district } from '@/locales/rw/district'

interface DashboardFilterSummaryProps {
  effectiveRange: EffectiveDateRange
  className?: string
}

export function DashboardFilterSummary({
  effectiveRange,
  className = '',
}: DashboardFilterSummaryProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background-subtle/60 px-3 py-1.5 text-caption font-medium text-text-secondary">
        <MapPin size={14} className="text-primary shrink-0" aria-hidden />
        <span>
          {district.charts.filterSummaryDistrict}:{' '}
          <strong className="text-text font-semibold">{DISTRICT_NAME}</strong>
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background-subtle/60 px-3 py-1.5 text-caption font-medium text-text-secondary">
        <Clock size={14} className="text-accent shrink-0" aria-hidden />
        <span>
          {district.charts.filterSummaryPeriod}:{' '}
          <strong className="text-text font-semibold">{effectiveRange.timeLabel}</strong>
        </span>
      </span>
    </div>
  )
}
