import { Map as MapIcon, MapPin } from 'lucide-react'
import { district } from '@/locales/rw/district'
import type { MapCenterSummary } from './types'

interface MapContainerProps {
  /** Centers available for selection until ArcGIS feature layers are wired. */
  centers: MapCenterSummary[]
  selectedCenterId: string | null
  onCenterSelect: (centerId: string) => void
  /**
   * Future: pass a DOM node / ref callback into ArcGIS MapView constructor.
   * Kept optional so the shell stays SDK-free.
   */
  mapHostRef?: (node: HTMLDivElement | null) => void
  className?: string
}

/**
 * Map viewport boundary.
 * Replace the placeholder body with an ArcGIS MapView/WebMap mount point.
 * Do not import @arcgis/* outside this component (or a dedicated adapter).
 */
export function MapContainer({
  centers,
  selectedCenterId,
  onCenterSelect,
  mapHostRef,
  className = '',
}: MapContainerProps) {
  return (
    <div
      className={`relative flex flex-col rounded-xl border border-border bg-surface overflow-hidden min-h-[320px] lg:min-h-0 ${className}`}
      data-gis-slot="map-container"
    >
      {/* ArcGIS mount target — keep empty until SDK integration */}
      <div
        ref={mapHostRef}
        className="absolute inset-0"
        data-gis-slot="map-host"
        aria-hidden="true"
      />

      <div
        className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 bg-background-subtle/90 px-4 py-8 border border-dashed border-border-strong m-3 rounded-lg"
        role="img"
        aria-label={district.gis.mapContainerLabel}
      >
        <MapIcon size={36} className="text-text-muted opacity-50" aria-hidden />
        <div className="text-center max-w-md space-y-1">
          <p className="text-body font-semibold text-text">{district.gis.embedPlaceholder}</p>
          <p className="text-caption text-text-muted">{district.gis.embedNote}</p>
          <p className="text-caption text-text-secondary pt-2">{district.gis.selectCenterHint}</p>
        </div>

        <ul
          className="mt-2 w-full max-w-lg max-h-48 overflow-y-auto rounded-lg border border-border bg-surface divide-y divide-border"
          aria-label={district.gis.centerListLabel}
        >
          {centers.map((center) => {
            const selected = center.id === selectedCenterId
            return (
              <li key={center.id}>
                <button
                  type="button"
                  onClick={() => onCenterSelect(center.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? 'bg-primary-light text-primary'
                      : 'hover:bg-background-subtle text-text'
                  }`}
                  aria-pressed={selected}
                >
                  <MapPin size={16} className="shrink-0 opacity-70" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-semibold truncate">{center.name}</span>
                    <span className="block text-caption text-text-secondary truncate">
                      {center.sector} · {center.cell}
                    </span>
                  </span>
                  <span
                    className={`text-caption font-semibold tabular-nums shrink-0 ${
                      center.attendance < 70 ? 'text-warning' : 'text-success'
                    }`}
                  >
                    {center.attendance}%
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
