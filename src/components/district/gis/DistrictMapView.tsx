import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Building2, MapPin, X } from 'lucide-react'
import { ArcGisMapEmbed } from '@/components/gis/ArcGisMapEmbed'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/contexts/AppContext'
import { useCenterDirectoryItem } from '@/features/centers'
import { resolveCenterRouteKey } from '@/api/resources/centers'
import { ECD_CENTER_MAP_ZOOM, hasUsableCenterCoordinates } from '@/lib/center-coordinates'
import { buildCenterDetailPath } from '@/lib/entity-routes'
import { DISTRICT_PATHS } from '@/layouts/district/navigation'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { env } from '@/config/env'
import type { CenterDirectoryItem } from '@/api/resources/centers'
import type { ArcGisMapFocus } from '@/config/gis'

const CENTER_ID_PARAM = 'centerId'
const CENTER_CODE_PARAM = 'center'

/**
 * District map page — ArcGIS ECD Mapping System webmap.
 * Optional `?center=` (code) or legacy `?centerId=` focuses the camera and opens a details panel.
 */
export function DistrictMapView() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const centerParam =
    params.get(CENTER_CODE_PARAM)?.trim() || params.get(CENTER_ID_PARAM)?.trim() || ''
  const districtId = user?.districtId?.trim() || undefined

  const resolved = useQuery({
    queryKey: ['map-center-route', centerParam],
    queryFn: () => resolveCenterRouteKey(centerParam),
    enabled: env.isLive && Boolean(centerParam),
    staleTime: 60_000,
  })
  const centerId = resolved.data?.id ?? ''

  const centerQuery = useCenterDirectoryItem(centerId || undefined, Boolean(centerId) && env.isLive)

  const selectedCenter = useMemo((): CenterDirectoryItem | null => {
    const item = centerQuery.data
    if (!item || !centerId) return null
    if (districtId && item.districtId !== districtId) return null
    return item
  }, [centerQuery.data, centerId, districtId])

  const mapFocus = useMemo((): ArcGisMapFocus | null => {
    if (!selectedCenter) return null
    if (!hasUsableCenterCoordinates(selectedCenter.latitude, selectedCenter.longitude)) {
      return null
    }
    return {
      latitude: selectedCenter.latitude,
      longitude: selectedCenter.longitude,
      zoom: ECD_CENTER_MAP_ZOOM,
    }
  }, [selectedCenter])

  const clearSelection = () => {
    const next = new URLSearchParams(params)
    next.delete(CENTER_ID_PARAM)
    next.delete(CENTER_CODE_PARAM)
    setParams(next, { replace: true })
  }

  const focusUnavailable =
    Boolean(selectedCenter) &&
    !hasUsableCenterCoordinates(selectedCenter?.latitude, selectedCenter?.longitude)

  return (
    <div
      className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.9fr)] gap-3 items-start"
      data-gis-slot="district-map-view"
    >
      <div className="min-w-0 space-y-2">
        {focusUnavailable ? (
          <p className="text-caption text-warning" role="status">
            {district.centers.mapFocusUnavailable}
          </p>
        ) : mapFocus ? (
          <p className="text-caption text-text-muted" role="status">
            {district.centers.mapFocusHint}
          </p>
        ) : null}
        <ArcGisMapEmbed
          title={district.gis.mapViewTitle}
          className="min-h-96 lg:min-h-128"
          minHeight="24rem"
          focus={mapFocus}
        />
      </div>

      <SelectedCenterPanel
        centerKey={centerParam}
        center={selectedCenter}
        isLoading={Boolean(centerParam) && (resolved.isLoading || centerQuery.isLoading)}
        onClose={clearSelection}
      />
    </div>
  )
}

function SelectedCenterPanel({
  centerKey,
  center,
  isLoading,
  onClose,
}: {
  centerKey: string
  center: CenterDirectoryItem | null
  isLoading: boolean
  onClose: () => void
}) {
  if (!centerKey) {
    return (
      <Card padding="md" data-gis-slot="center-panel" role="status">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-background-subtle shrink-0">
            <Building2 size={18} className="text-text-muted" aria-hidden />
          </span>
          <h3 className="text-body font-semibold text-text">{district.gis.centerPanelTitle}</h3>
        </div>
        <p className="text-body text-text-secondary">{district.gis.centerPanelEmpty}</p>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card padding="md" data-gis-slot="center-panel" aria-busy="true">
        <Skeleton height="8rem" className="w-full" rounded="md" />
      </Card>
    )
  }

  if (!center) {
    return (
      <Card padding="md" data-gis-slot="center-panel" role="status">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-body font-semibold text-text">{district.gis.centerPanelTitle}</h3>
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            icon={<X size={16} />}
            onClick={onClose}
            aria-label={common.close}
          >
            <span className="sr-only">{common.close}</span>
          </Button>
        </div>
        <p className="text-body text-text-secondary">{district.gis.centerPanelEmpty}</p>
      </Card>
    )
  }

  const statusLabel =
    center.status === 'active'
      ? district.centers.statusActive
      : district.centers.statusInactive

  return (
    <Card padding="md" data-gis-slot="center-panel">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-caption font-semibold text-text-muted uppercase tracking-wide">
            {district.gis.centerPanelTitle}
          </p>
          <h3 className="text-subheading text-text mt-1 wrap-break-word">{center.name}</h3>
          <p className="text-caption text-text-secondary mt-1">{center.code}</p>
        </div>
        <Button
          type="button"
          variant="tertiary"
          size="sm"
          icon={<X size={16} />}
          onClick={onClose}
          aria-label={common.close}
        >
          <span className="sr-only">{common.close}</span>
        </Button>
      </div>

      <dl className="space-y-3">
        <div className="flex items-start gap-3">
          <MapPin size={16} className="mt-0.5 text-text-muted shrink-0" aria-hidden />
          <div className="min-w-0">
            <dt className="text-caption text-text-muted">{district.centers.colVillage}</dt>
            <dd className="text-body text-text wrap-break-word">{center.villageName ?? '—'}</dd>
          </div>
        </div>
        <div className="flex justify-between gap-3 py-1 border-t border-border">
          <dt className="text-body text-text-secondary">{district.centers.colStatus}</dt>
          <dd className="text-body font-semibold text-text">{statusLabel}</dd>
        </div>
        <div className="flex justify-between gap-3 py-1">
          <dt className="text-body text-text-secondary">{district.centers.colChildren}</dt>
          <dd className="text-body font-semibold text-text tabular-nums">
            {center.activeChildrenCount}
          </dd>
        </div>
      </dl>

      <div className="mt-5 pt-4 border-t border-border">
        <Link
          to={buildCenterDetailPath(DISTRICT_PATHS.centers, center)}
          className="inline-flex items-center justify-center gap-2 min-h-11 w-full px-4 text-body rounded-xl font-semibold bg-surface text-primary border-2 border-primary shadow-sm hover:bg-primary-light hover:border-primary-dark transition-all"
        >
          {district.gis.viewCenterDetails}
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </Card>
  )
}
