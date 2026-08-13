import type { CSSProperties } from 'react'
import { Map } from 'lucide-react'
import { common } from '@/locales/rw/common'

interface GisPendingPlaceholderProps {
  compact?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Honest GIS slot — do not build a custom map here.
 * ArcGIS / GIS-team integrations mount into this surface later.
 */
export function GisPendingPlaceholder({
  compact = false,
  className = '',
  style,
}: GisPendingPlaceholderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-lg border border-dashed border-border-strong bg-background-subtle px-4 ${
        compact ? 'py-8 min-h-[10rem]' : 'py-12 min-h-[20rem]'
      } ${className}`.trim()}
      style={style}
      role="status"
      aria-label={common.gis.waitingTitle}
    >
      <Map
        size={compact ? 28 : 40}
        className="text-text-muted opacity-50 mb-3"
        aria-hidden
      />
      <p className={`font-semibold text-text ${compact ? 'text-body' : 'text-subheading'}`}>
        {common.gis.waitingTitle}
      </p>
      <p
        className={`text-text-secondary mt-1 max-w-md ${compact ? 'text-caption' : 'text-body'}`}
      >
        {common.gis.waitingBody}
      </p>
    </div>
  )
}
