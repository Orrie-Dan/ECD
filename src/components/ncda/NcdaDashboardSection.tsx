import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ncda } from '@/locales/rw/ncda'

/** Per-widget loading / error / success shell for partial dashboard failures. */
export function NcdaDashboardSection({
  title,
  isLoading,
  isError,
  onRetry,
  children,
  className = '',
  variant = 'stats',
}: {
  title: string
  isLoading: boolean
  isError: boolean
  onRetry?: () => void
  children: ReactNode
  className?: string
  variant?: 'stats' | 'charts'
}) {
  return (
    <section className={`space-y-3 ${className}`.trim()} aria-labelledby={`ncda-sec-${title}`}>
      <h2 id={`ncda-sec-${title}`} className="text-subheading font-semibold text-text">
        {title}
      </h2>
      {isError ? (
        <Card padding="md" className="border-border bg-background-subtle/40">
          <p className="text-body text-text-secondary">{ncda.dashboard.sectionError}</p>
          {onRetry ? (
            <div className="mt-3">
              <Button type="button" variant="primary" onClick={() => void onRetry()}>
                {ncda.dashboard.retry}
              </Button>
            </div>
          ) : null}
        </Card>
      ) : isLoading ? (
        variant === 'charts' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height="16rem" className="w-full" rounded="lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height="4.5rem" className="w-full" rounded="lg" />
            ))}
          </div>
        )
      ) : (
        children
      )}
    </section>
  )
}
