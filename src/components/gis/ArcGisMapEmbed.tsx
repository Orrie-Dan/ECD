import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  buildArcGisMapEmbedUrl,
  isArcGisMapConfigured,
  type ArcGisMapFocus,
} from '@/config/gis'
import { common } from '@/locales/rw/common'
import { GisPendingPlaceholder } from './GisPendingPlaceholder'

interface ArcGisMapEmbedProps {
  title?: string
  className?: string
  style?: CSSProperties
  /** Minimum height CSS value, e.g. `24rem` or `400px`. */
  minHeight?: string
  /** Stretch to fill the parent height (minHeight still applies as a floor). */
  fill?: boolean
  /** Show fullscreen toggle on the map surface. */
  allowFullscreen?: boolean
  /**
   * Optional camera focus for the embed dashboard (lat/lng/zoom).
   * Resolved from centerId in the SPA — not taken from the public route as coords.
   */
  focus?: ArcGisMapFocus | null
}

/**
 * Embeds the national ArcGIS ECD Mapping System webmap via a same-origin
 * static dashboard (Portal Map Viewer cannot be iframed).
 */
export function ArcGisMapEmbed({
  title = common.gis.mapTitle,
  className = '',
  style,
  minHeight = '20rem',
  fill = false,
  allowFullscreen = true,
  focus = null,
}: ArcGisMapEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const syncFullscreenState = useCallback(() => {
    setIsFullscreen(document.fullscreenElement === containerRef.current)
  }, [])

  useEffect(() => {
    document.addEventListener('fullscreenchange', syncFullscreenState)
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [syncFullscreenState])

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return

    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen()
      } else {
        await el.requestFullscreen()
      }
    } catch {
      // Fullscreen may be blocked by browser policy — ignore.
    }
  }, [])

  if (!isArcGisMapConfigured()) {
    return (
      <GisPendingPlaceholder
        className={fill ? `h-full ${className}` : className}
        style={{ ...style, minHeight, ...(fill ? { height: '100%' } : {}) }}
      />
    )
  }

  const embedUrl = buildArcGisMapEmbedUrl(undefined, undefined, focus)
  const frameHeight = isFullscreen || fill ? '100%' : minHeight
  const frameStyle: CSSProperties = {
    minHeight,
    height: frameHeight,
    width: '100%',
    ...style,
  }

  const containerStyle: CSSProperties = isFullscreen
    ? { width: '100%', height: '100%' }
    : fill
      ? { minHeight, height: '100%', width: '100%' }
      : { minHeight, height: minHeight }

  const focusKey =
    focus != null
      ? `${focus.latitude.toFixed(5)},${focus.longitude.toFixed(5)},${focus.zoom ?? ''}`
      : 'default'

  useEffect(() => {
    setLoaded(false)
  }, [focusKey])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg border border-border bg-background-subtle ${
        isFullscreen ? 'rounded-none border-0' : ''
      } ${fill ? 'flex h-full flex-col' : ''} ${className}`.trim()}
      style={containerStyle}
      data-gis-slot="arcgis-map-embed"
    >
      {allowFullscreen && loaded ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute top-2 right-2 z-20 shadow-sm"
          icon={isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          onClick={() => void toggleFullscreen()}
          aria-label={isFullscreen ? common.gis.exitFullscreen : common.gis.fullscreen}
        >
          <span className="sr-only">
            {isFullscreen ? common.gis.exitFullscreen : common.gis.fullscreen}
          </span>
        </Button>
      ) : null}
      {!loaded ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-background-subtle"
          role="status"
          aria-live="polite"
        >
          <p className="text-caption text-text-muted">{common.gis.loadingMap}</p>
        </div>
      ) : null}
      <iframe
        key={focusKey}
        src={embedUrl}
        title={title}
        className={`block w-full border-0 ${fill ? 'min-h-0 flex-1' : ''}`}
        style={frameStyle}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}
