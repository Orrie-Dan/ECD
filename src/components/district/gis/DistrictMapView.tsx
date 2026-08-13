import { GisPendingPlaceholder } from '@/components/gis/GisPendingPlaceholder'

/**
 * District map page — wait for GIS-team ArcGIS integration.
 * Do not build a custom map or stand-in center list here.
 */
export function DistrictMapView() {
  return (
    <div data-gis-slot="district-map-view">
      <GisPendingPlaceholder className="min-h-[24rem] lg:min-h-[32rem]" />
    </div>
  )
}
