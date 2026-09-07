import { ArcGisMapEmbed } from '@/components/gis/ArcGisMapEmbed'

interface MapContainerProps {
  className?: string
}

/**
 * Map viewport for the ArcGIS ECD Mapping System webmap.
 */
export function MapContainer({ className = '' }: MapContainerProps) {
  return (
    <div
      className={`relative flex flex-col rounded-xl border border-border bg-surface overflow-hidden min-h-[320px] ${className}`}
      data-gis-slot="map-container"
    >
      <ArcGisMapEmbed className="flex-1 border-0 rounded-none" minHeight="320px" />
    </div>
  )
}
