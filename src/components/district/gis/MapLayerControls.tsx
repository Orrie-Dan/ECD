import { Layers } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { district } from '@/locales/rw/district'
import type { MapLayerDefinition, MapLayerId } from './types'

interface MapLayerControlsProps {
  layers: MapLayerDefinition[]
  onToggleLayer: (layerId: MapLayerId) => void
  className?: string
}

/**
 * Layer legend / visibility controls.
 * Wire `onToggleLayer` to ArcGIS Layer.visible when layers are registered.
 */
export function MapLayerControls({
  layers,
  onToggleLayer,
  className = '',
}: MapLayerControlsProps) {
  return (
    <Card padding="md" className={className} data-gis-slot="layer-controls">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary-light shrink-0">
          <Layers size={18} className="text-secondary" aria-hidden />
        </span>
        <div>
          <h3 className="text-body font-semibold text-text">{district.gis.layersTitle}</h3>
          <p className="text-caption text-text-muted">{district.gis.layersHint}</p>
        </div>
      </div>

      <ul className="space-y-2" role="group" aria-label={district.gis.layersTitle}>
        {layers.map((layer) => (
          <li key={layer.id}>
            <label className="flex items-start gap-3 min-h-11 px-2 py-2 rounded-lg border border-border hover:bg-background-subtle cursor-pointer transition-colors">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 accent-primary shrink-0"
                checked={layer.enabled}
                onChange={() => onToggleLayer(layer.id)}
                aria-describedby={`layer-desc-${layer.id}`}
              />
              <span className="min-w-0">
                <span className="block text-body font-semibold text-text">{layer.label}</span>
                <span
                  id={`layer-desc-${layer.id}`}
                  className="block text-caption text-text-secondary"
                >
                  {layer.description}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Card>
  )
}
