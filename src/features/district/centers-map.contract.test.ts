import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { buildDistrictMapCenterHref } from '@/lib/district-map-links'
import { hasUsableCenterCoordinates } from '@/lib/center-coordinates'
import { DISTRICT_PATHS } from '@/layouts/district/navigation'

describe('district Ibigo → map focus', () => {
  it('builds map href preferring center code', () => {
    const href = buildDistrictMapCenterHref({ id: 'center-abc', code: 'ECD-9' })
    expect(href).toBe(`${DISTRICT_PATHS.gis}?center=ECD-9`)
    expect(href).not.toMatch(/lat=|lng=|longitude|latitude/i)
  })

  it('falls back to centerId when code is missing', () => {
    const href = buildDistrictMapCenterHref({ id: 'center-abc' })
    expect(href).toBe(`${DISTRICT_PATHS.gis}?centerId=center-abc`)
  })

  it('rejects unusable coordinates', () => {
    expect(hasUsableCenterCoordinates(null, null)).toBe(false)
    expect(hasUsableCenterCoordinates(-1.94, null)).toBe(false)
    expect(hasUsableCenterCoordinates(-1.9441, 30.0619)).toBe(true)
  })

  it('CentersPage links to map via centerId and never renders raw coords as Ahantu', () => {
    const page = fs.readFileSync(
      path.resolve(__dirname, '../../pages/district/CentersPage.tsx'),
      'utf8',
    )
    expect(page).toContain('buildDistrictMapCenterHref')
    expect(page).toContain('viewOnMap')
    expect(page).toContain('locationUnavailable')
    expect(page).not.toContain('toFixed')
    expect(page).toContain('useDistrictCentersList')
    expect(page).not.toContain('districtFilter')
  })

  it('App routes /district/ikarita to GisAnalyticsPage', () => {
    const app = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8')
    expect(app).toContain('GisAnalyticsPage')
    expect(app).toMatch(/path="\/district\/ikarita"\s+element=\{<GisAnalyticsPage/)
  })

  it('DistrictMapView resolves center code or centerId and scopes to district', () => {
    const mapView = fs.readFileSync(
      path.resolve(__dirname, '../../components/district/gis/DistrictMapView.tsx'),
      'utf8',
    )
    expect(mapView).toContain('CENTER_ID_PARAM')
    expect(mapView).toContain('CENTER_CODE_PARAM')
    expect(mapView).toContain('item.districtId !== districtId')
    expect(mapView).toContain('ECD_CENTER_MAP_ZOOM')
    expect(mapView).toContain('focus={mapFocus}')
  })

  it('NcdaOverviewCommand focuses the map when a centre is selected', () => {
    const overview = fs.readFileSync(
      path.resolve(__dirname, '../../components/ncda/overview/NcdaOverviewCommand.tsx'),
      'utf8',
    )
    expect(overview).toContain('focus={mapFocus}')
    expect(overview).toContain('ECD_CENTER_MAP_ZOOM')
    expect(overview).toContain('hasUsableCenterCoordinates')
  })

  it('NcdaCenterDetailPage links Ahantu to the map instead of raw coords', () => {
    const page = fs.readFileSync(
      path.resolve(__dirname, '../../pages/ncda/NcdaCenterDetailPage.tsx'),
      'utf8',
    )
    expect(page).toContain('viewOnMap')
    expect(page).toContain('locationUnavailable')
    expect(page).not.toContain('formatCoords')
    expect(page).not.toContain('toFixed(5)')
  })
})
