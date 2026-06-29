import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Map, Maximize2, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SelectInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { district } from '@/locales/rw/district'

interface GisEmbedProps {
  title: string
  description?: string
  height?: string
  showFilters?: boolean
  showViewLevels?: boolean
  compact?: boolean
  allowFullscreen?: boolean
  headerAction?: React.ReactNode
}

function MapPlaceholder({ height, title }: { height: string; title: string }) {
  return (
    <div
      className="rounded-lg border border-dashed border-border-strong bg-background-subtle flex flex-col items-center justify-center w-full aspect-[4/3] sm:aspect-auto"
      style={{ minHeight: height }}
      role="img"
      aria-label={title}
    >
      <Map size={28} className="text-text-muted opacity-50 mb-2" aria-hidden />
      <p className="text-caption font-semibold text-text-secondary">{district.gis.embedPlaceholder}</p>
    </div>
  )
}

export function GisEmbed({
  title,
  description,
  height = '400px',
  showFilters = false,
  showViewLevels = false,
  compact = false,
  allowFullscreen = false,
  headerAction,
}: GisEmbedProps) {
  const [fullscreen, setFullscreen] = useState(false)
  const mapHeight = compact ? 'clamp(140px, 28vw, 200px)' : height

  const closeFullscreen = useCallback(() => setFullscreen(false), [])

  useEffect(() => {
    if (!fullscreen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFullscreen()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [fullscreen, closeFullscreen])

  const filters = (showFilters || showViewLevels) && (
    <div className={`flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 ${compact ? 'mb-2' : 'mb-4'}`}>
      {showViewLevels && (
        <div className="flex flex-wrap gap-2">
          {[district.gis.viewDistrict, district.gis.viewSector, district.gis.viewCell].map((label) => (
            <button
              key={label}
              type="button"
              className="px-3 py-2 min-h-9 rounded-md text-caption font-semibold border border-border bg-background-subtle text-text-secondary hover:border-primary hover:text-primary transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
          <SelectInput className="!min-h-10 text-caption w-full sm:max-w-[10rem]">
            <option value="">{district.gis.filterSector}</option>
            <option value="remera">Remera</option>
            <option value="gatsata">Gatsata</option>
          </SelectInput>
          <SelectInput className="!min-h-10 text-caption w-full sm:max-w-[9rem]">
            <option value="">{district.gis.filterPeriod}</option>
            <option value="week">{district.gis.periodWeek}</option>
            <option value="month">{district.gis.periodMonth}</option>
          </SelectInput>
        </div>
      )}
    </div>
  )

  const content = (
    <>
      {filters}
      <MapPlaceholder height={mapHeight} title={title} />
    </>
  )

  return (
    <>
      <Card padding={compact ? 'md' : 'lg'}>
        <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 ${compact ? 'mb-2' : 'mb-4'}`}>
          <div className="min-w-0 flex-1">
            <h3
              className={`font-semibold text-text flex items-start sm:items-center gap-2 ${
                compact ? 'text-body' : 'text-subheading'
              }`}
            >
              <span
                className={`flex items-center justify-center rounded-lg bg-secondary-light shrink-0 ${
                  compact ? 'w-7 h-7' : 'w-9 h-9'
                }`}
              >
                <Map size={compact ? 16 : 20} className="text-secondary" aria-hidden />
              </span>
              <span className="min-w-0 break-words">{title}</span>
            </h3>
            {description && !compact && (
              <p className="text-body text-text-secondary mt-1 sm:ml-11">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {headerAction}
            {allowFullscreen && (
              <Button
                type="button"
                variant="tertiary"
                size="sm"
                icon={<Maximize2 size={16} />}
                onClick={() => setFullscreen(true)}
                aria-label={district.gis.fullscreen}
              >
                <span className="sr-only sm:not-sr-only">{district.gis.fullscreen}</span>
              </Button>
            )}
          </div>
        </div>
        {content}
      </Card>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-background flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-surface shrink-0">
            <h2 className="text-subheading text-text truncate">{title}</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<X size={16} />}
              onClick={closeFullscreen}
            >
              {district.gis.exitFullscreen}
            </Button>
          </div>
          <div className="flex-1 p-3 sm:p-4 overflow-auto min-h-0">
            <div className="max-w-7xl mx-auto h-full min-h-[50vh] sm:min-h-[60vh]">
              {filters}
              <MapPlaceholder height="min(75vh, 640px)" title={title} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function DashboardGisPreview() {
  return (
    <GisEmbed
      title={district.gis.attendanceMap}
      compact
      showViewLevels
      allowFullscreen
      headerAction={
        <Link to="/district/ikarita" className="text-caption font-semibold text-primary hover:underline">
          {district.gis.title} →
        </Link>
      }
    />
  )
}
