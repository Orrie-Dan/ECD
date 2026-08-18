import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Maximize2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { common } from '@/locales/rw/common'

const DEFAULT_HEIGHT = 280
const FULLSCREEN_HEIGHT = 520

export function ChartFullscreenPanel({
  title,
  hint,
  renderChart,
  footer,
  className = '',
  chartHeight = DEFAULT_HEIGHT,
  fullscreenChartHeight = FULLSCREEN_HEIGHT,
}: {
  title: string
  hint?: string
  renderChart: (height: number) => ReactNode
  footer?: ReactNode
  className?: string
  chartHeight?: number
  fullscreenChartHeight?: number
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  return (
    <>
      <Card padding="md" className={`flex h-full min-w-0 flex-col border-border ${className}`.trim()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-body font-semibold text-text leading-snug">{title}</h3>
            {hint ? <p className="mt-0.5 text-caption text-text-muted">{hint}</p> : null}
          </div>
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            icon={<Maximize2 size={16} />}
            onClick={() => setOpen(true)}
            aria-label={common.charts.fullscreen}
            className="shrink-0"
          />
        </div>
        <div className="min-w-0 w-full flex-1">{renderChart(chartHeight)}</div>
        {footer ? <div className="mt-3 min-w-0">{footer}</div> : null}
      </Card>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-background safe-area-top safe-area-bottom"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-subheading font-semibold text-text">{title}</h2>
              {hint ? <p className="mt-0.5 truncate text-caption text-text-muted">{hint}</p> : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<X size={16} />}
              onClick={close}
            >
              {common.charts.exitFullscreen}
            </Button>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-8 sm:py-6 lg:px-12">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              <div className="w-full">
                {renderChart(fullscreenChartHeight)}
              </div>
              {footer ? (
                <div className="w-full border-t border-border pt-4">
                  {footer}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
