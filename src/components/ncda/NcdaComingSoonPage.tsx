import { Construction } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { NcdaBreadcrumbs } from '@/components/ncda/NcdaBreadcrumbs'
import { ncda } from '@/locales/rw/ncda'

export interface NcdaComingSoonPageProps {
  title: string
  description: string
  category: string
  /** Landing dashboard uses a slightly richer framing — still no fake metrics. */
  variant?: 'section' | 'landing'
  showBreadcrumbs?: boolean
}

/**
 * Honest unimplemented-domain placeholder for NCDA shell routes.
 * Distinguishes "not built yet" from empty operational data.
 */
export function NcdaComingSoonPage({
  title,
  description,
  category,
  variant = 'section',
  showBreadcrumbs = true,
}: NcdaComingSoonPageProps) {
  const landing = variant === 'landing'

  return (
    <PageContainer>
      {showBreadcrumbs && <NcdaBreadcrumbs currentLabel={title} />}
      <PageHeader
        title={title}
        description={description}
        badge={category}
        size="compact"
      />
      <PageContent>
        <Card
          elevated
          padding="lg"
          className={landing ? 'border-primary/20 bg-primary-light/20' : undefined}
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
            <span
              className="flex items-center justify-center w-12 h-12 rounded-xl bg-surface border border-border text-accent shrink-0"
              aria-hidden="true"
            >
              <Construction size={24} strokeWidth={2} />
            </span>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning">{ncda.comingSoon.badge}</Badge>
                <p className="text-body font-bold text-text">{ncda.comingSoon.heading}</p>
              </div>
              <p className="text-body text-text-secondary max-w-2xl">{ncda.comingSoon.body}</p>
              <p className="text-caption text-text-muted">{ncda.comingSoon.notEmptyData}</p>
            </div>
          </div>
        </Card>
      </PageContent>
    </PageContainer>
  )
}
