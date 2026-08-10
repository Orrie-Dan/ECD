import { useMemo, useState } from 'react'
import { ECD_CENTERS } from '@/lib/mock-data'
import { env } from '@/config/env'
import { useCentersDirectory } from '@/features/centers'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { MapContainer } from './MapContainer'
import { MapLayerControls } from './MapLayerControls'
import { MapFilterPanel } from './MapFilterPanel'
import { MapCenterPanel } from './MapCenterPanel'
import type { MapCenterSummary, MapLayerDefinition, MapLayerId, MapViewFilters } from './types'

const DEFAULT_FILTERS: MapViewFilters = {
  sector: '',
  period: '',
}

function buildDefaultLayers(): MapLayerDefinition[] {
  return [
    {
      id: 'centers',
      label: district.gis.centersMap,
      description: district.gis.centersMapDesc,
      enabled: true,
    },
    {
      id: 'attendance',
      label: district.gis.attendanceMap,
      description: district.gis.attendanceMapDesc,
      enabled: true,
    },
    {
      id: 'enrollment',
      label: district.gis.enrollmentMap,
      description: district.gis.enrollmentMapDesc,
      enabled: false,
    },
    {
      id: 'dropouts',
      label: district.gis.dropoutMap,
      description: district.gis.dropoutMapDesc,
      enabled: false,
    },
    {
      id: 'intervention',
      label: district.gis.interventionMap,
      description: district.gis.interventionMapDesc,
      enabled: false,
    },
  ]
}

function toMapCenterFromMock(center: (typeof ECD_CENTERS)[number]): MapCenterSummary {
  return {
    id: center.id,
    name: center.name,
    sector: center.sector,
    cell: center.cell,
    children: center.children,
    caretaker: center.caretaker,
    caretakerPhone: center.caretakerPhone,
    attendance: center.attendance,
    submittedToday: center.submittedToday,
  }
}

/**
 * District Map View shell.
 * Composes map, layers, filters, and center detail panels.
 * GIS team: mount ArcGIS inside MapContainer; keep selection flowing through onCenterSelect.
 */
export function DistrictMapView() {
  const [filters, setFilters] = useState<MapViewFilters>(DEFAULT_FILTERS)
  const [layers, setLayers] = useState<MapLayerDefinition[]>(buildDefaultLayers)
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null)
  const liveCenters = useCentersDirectory({ page: 1, pageSize: 100 }, env.isLive)

  const sectors = useMemo(() => {
    if (env.isLive) return [] as string[]
    return [...new Set(ECD_CENTERS.map((c) => c.sector))].sort((a, b) => a.localeCompare(b, 'rw'))
  }, [])

  const centers = useMemo(() => {
    if (env.isLive) {
      return (liveCenters.data?.items ?? []).map(
        (c): MapCenterSummary => ({
          id: c.id,
          name: c.name,
          sector: c.districtName ?? '—',
          cell: c.villageName ?? '—',
          children: c.activeChildrenCount,
          caretaker: '—',
          caretakerPhone: '—',
          attendance: 0,
          submittedToday: c.status === 'active',
        }),
      )
    }
    let list = ECD_CENTERS.map(toMapCenterFromMock)
    if (filters.sector) {
      list = list.filter((c) => c.sector === filters.sector)
    }
    return list
  }, [filters.sector, liveCenters.data?.items])

  const selectedCenter = useMemo(
    () => centers.find((c) => c.id === selectedCenterId) ?? null,
    [centers, selectedCenterId],
  )

  const handleToggleLayer = (layerId: MapLayerId) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer,
      ),
    )
  }

  const handleFiltersChange = (next: MapViewFilters) => {
    setFilters(next)
    if (selectedCenterId && next.sector && env.isMock) {
      const stillVisible = ECD_CENTERS.some(
        (c) => c.id === selectedCenterId && c.sector === next.sector,
      )
      if (!stillVisible) setSelectedCenterId(null)
    }
  }

  if (env.isLive && liveCenters.isError) {
    return <LiveUnavailableState title={district.gis.centersMap} description={common.live.unavailableDesc} />
  }

  return (
    <div
      className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-4 lg:gap-6"
      data-gis-slot="district-map-view"
    >
      <div className="flex flex-col gap-4 min-h-0">
        {env.isLive ? (
          <p className="text-caption text-text-muted">{common.live.sectorFilterUnavailable}</p>
        ) : null}
        <MapContainer
          centers={centers}
          selectedCenterId={selectedCenterId}
          onCenterSelect={setSelectedCenterId}
          className="min-h-[420px] lg:min-h-[560px] flex-1"
        />
      </div>

      <aside className="flex flex-col gap-4 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto">
        <MapFilterPanel
          filters={filters}
          sectors={sectors}
          onChange={handleFiltersChange}
          onReset={() => {
            setFilters(DEFAULT_FILTERS)
          }}
        />
        <MapLayerControls layers={layers} onToggleLayer={handleToggleLayer} />
        <MapCenterPanel
          center={selectedCenter}
          onClose={() => setSelectedCenterId(null)}
        />
      </aside>
    </div>
  )
}
