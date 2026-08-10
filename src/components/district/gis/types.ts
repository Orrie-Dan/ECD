/**
 * Integration contracts for the district GIS shell.
 * ArcGIS / map SDK wiring should plug into these props and callbacks —
 * keep map SDK imports inside MapContainer (or a future MapAdapter) only.
 */

export type MapLayerId =
  | 'centers'
  | 'attendance'
  | 'enrollment'
  | 'dropouts'
  | 'intervention'

export interface MapLayerDefinition {
  id: MapLayerId
  label: string
  description: string
  enabled: boolean
}

export interface MapViewFilters {
  sector: string
  period: 'week' | 'month' | 'year' | ''
}

/** Minimal center payload the map UI needs today (no geometry yet). */
export interface MapCenterSummary {
  id: string
  name: string
  sector: string
  cell: string
  children: number
  caretaker: string
  caretakerPhone: string
  attendance: number
  submittedToday: boolean
}

export interface MapSelectionHandlers {
  /** Called when the user selects a center (list stub today; map click later). */
  onCenterSelect: (centerId: string) => void
  onClearSelection: () => void
}

/** Reserved slot for a future ArcGIS MapView / WebMap instance. */
export type MapViewHandle = {
  /** Placeholder for MapView.destroy() / similar cleanup. */
  destroy?: () => void
}
