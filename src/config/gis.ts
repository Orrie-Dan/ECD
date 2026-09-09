/**
 * ArcGIS ECD Mapping System — national portal webmap embed.
 *
 * Portal Map Viewer URLs cannot be iframed (`X-Frame-Options: sameorigin`).
 * The SPA iframes a same-origin static dashboard under `/dashboards/...` that
 * loads the webmap via the ArcGIS JS API. Portal REST calls are proxied through
 * the Nest BFF at `/api/v1/gis/proxy` to avoid browser CORS blocks.
 */

const DEFAULT_PORTAL_URL = 'https://infrastructure.space.gov.rw/portal'
const DEFAULT_WEBMAP_ID = '2b7f6d9cd1ac43bf993f811e7844014d'

/** Same-origin embed page served from `public/dashboards/ecd-mapping/` (under Vite `base`). */
export const ECD_MAPPING_EMBED_PATH = `${import.meta.env.BASE_URL}dashboards/ecd-mapping/index.html`

/** BFF GIS routes — relative so Vite dev proxy / reverse proxy can forward to Nest. */
export const GIS_API_BASE = '/api/v1/gis'

function readPortalUrl(raw: string | undefined): string {
  return (raw?.trim() || DEFAULT_PORTAL_URL).replace(/\/$/, '')
}

function readWebmapId(raw: string | undefined): string {
  return raw?.trim() || DEFAULT_WEBMAP_ID
}

export const gisConfig = {
  portalUrl: readPortalUrl(import.meta.env.VITE_ARCGIS_PORTAL_URL),
  webmapId: readWebmapId(import.meta.env.VITE_ARCGIS_WEBMAP_ID),
  embedPath: ECD_MAPPING_EMBED_PATH,
} as const

export type ArcGisMapFocus = {
  latitude: number
  longitude: number
  /** ArcGIS MapView zoom; facility-level default is applied by callers. */
  zoom?: number
}

/**
 * Relative same-origin URL for `<iframe src>` — avoids Portal X-Frame-Options.
 * Optional focus is for the embed dashboard only (not the SPA route).
 */
export function buildArcGisMapEmbedUrl(
  webmapId: string = gisConfig.webmapId,
  portalUrl: string = gisConfig.portalUrl,
  focus?: ArcGisMapFocus | null,
): string {
  const params = new URLSearchParams({
    webmap: webmapId,
    portal: portalUrl.replace(/\/$/, ''),
    // Relative — same-origin via Vite dev proxy / reverse proxy (no CORS).
    gisApi: GIS_API_BASE,
  })
  if (
    focus &&
    Number.isFinite(focus.latitude) &&
    Number.isFinite(focus.longitude)
  ) {
    params.set('lat', String(focus.latitude))
    params.set('lng', String(focus.longitude))
    if (focus.zoom != null && Number.isFinite(focus.zoom)) {
      params.set('zoom', String(focus.zoom))
    }
  }
  return `${ECD_MAPPING_EMBED_PATH}?${params.toString()}`
}

export function isArcGisMapConfigured(): boolean {
  return Boolean(gisConfig.portalUrl && gisConfig.webmapId)
}
