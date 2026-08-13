import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { NcdaOverviewCommand } from '@/components/ncda/overview/NcdaOverviewCommand'
import { env } from '@/config/env'
import { ncda } from '@/locales/rw/ncda'

/**
 * NCDA Overview — GIS-first national ECD intelligence command centre.
 * Uses national aggregates + bounded district/center geo reads. No mock KPIs.
 */
export function NcdaDashboardPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.dashboard.title}
          subtitle={ncda.dashboard.subtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={ncda.dashboard.mockOnlyTitle}
            description={ncda.dashboard.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <NcdaOverviewCommand />
    </PageContainer>
  )
}
