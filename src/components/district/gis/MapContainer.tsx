import { GisPendingPlaceholder } from '@/components/gis/GisPendingPlaceholder'

interface MapContainerProps {
  className?: string
}

/**
 * Map viewport boundary reserved for ArcGIS.
 * Do not build a custom map here — GIS integrations will mount into this slot.
 */
export function MapContainer({ className = '' }: MapContainerProps) {
  return (
    <div
      className={`relative flex flex-col rounded-xl border border-border bg-surface overflow-hidden min-h-[320px] ${className}`}
      data-gis-slot="map-container"
    >
      <div className="absolute inset-0" data-gis-slot="map-host" aria-hidden="true" />
      <GisPendingPlaceholder className="relative z-10 m-3 flex-1" />
    </div>
  )
}
