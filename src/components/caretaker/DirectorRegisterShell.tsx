import { Construction, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Skeleton } from '@/components/ui/Skeleton'
import { caretaker } from '@/locales/rw/caretaker'

export interface DirectorRegisterShellProps {
  title: string
  description: string
  /** Paper book section label, e.g. "VIII". */
  paperSection?: string
  canMutate: boolean
}

/**
 * Honest placeholder for director ECD book registers (Sections VIII–XIV).
 * Shows filter/table skeleton structure without fake data or mutation success.
 */
export function DirectorRegisterShell({
  title,
  description,
  paperSection,
  canMutate,
}: DirectorRegisterShellProps) {
  const shell = caretaker.director.registerShell

  return (
    <PageContainer>
      <PageHeader
        title={title}
        description={description}
        badge={paperSection ? `Igice ${paperSection}` : shell.badge}
        size="compact"
        action={
          canMutate ? (
            <Button variant="primary" size="sm" icon={<Plus size={18} />} disabled>
              {shell.addRecord}
            </Button>
          ) : undefined
        }
      />
      <PageContent className="space-y-4">
        {!canMutate && (
          <Card padding="md" className="border-border bg-background-subtle">
            <p className="text-body text-text-secondary">{shell.readOnlyHint}</p>
          </Card>
        )}

        <Card padding="md" elevated>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-body font-semibold text-text">{shell.filtersLabel}</p>
              <p className="text-caption text-text-muted">{shell.filtersHint}</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  aria-hidden="true"
                />
                <div
                  className="h-10 rounded-lg border border-border bg-background-subtle pl-9 pr-3 flex items-center"
                  aria-hidden="true"
                >
                  <Skeleton height="0.75rem" width="60%" rounded="sm" />
                </div>
              </div>
              <Button variant="secondary" size="sm" disabled>
                {shell.filtersLabel}
              </Button>
            </div>
          </div>
        </Card>

        <Card
          elevated
          padding="lg"
          role="status"
          aria-live="polite"
        >
          <div className="space-y-4">
            <div className="hidden sm:grid grid-cols-4 gap-3 pb-3 border-b border-border">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} height="0.75rem" width="70%" rounded="sm" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-3 py-2">
                  <Skeleton height="1rem" rounded="sm" />
                  <Skeleton height="1rem" rounded="sm" className="hidden sm:block" />
                  <Skeleton height="1rem" rounded="sm" className="hidden sm:block" />
                  <Skeleton height="1rem" width="40%" rounded="sm" className="hidden sm:block" />
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-start pt-2 border-t border-border">
              <span
                className="flex items-center justify-center w-12 h-12 rounded-xl bg-surface border border-border text-accent shrink-0"
                aria-hidden="true"
              >
                <Construction size={24} strokeWidth={2} />
              </span>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="warning">{shell.badge}</Badge>
                  <p className="text-body font-bold text-text">{shell.heading}</p>
                </div>
                <p className="text-body text-text-secondary max-w-2xl">{shell.body}</p>
                <p className="text-caption text-text-muted">{shell.notEmptyData}</p>
                <p className="text-caption text-text-muted">{shell.tablePlaceholder}</p>
              </div>
            </div>
          </div>
        </Card>
      </PageContent>
    </PageContainer>
  )
}
