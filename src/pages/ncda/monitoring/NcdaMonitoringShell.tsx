import type { ReactNode } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { DistrictWorkspaceNav } from '@/layouts/district/DistrictWorkspaceNav'
import { NCDA_MONITORING_TABS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'

export function NcdaMonitoringShell({ children }: { children: ReactNode }) {
  return (
    <PageContainer>
      <PageHeader
        title={ncda.monitoringHub.title}
        subtitle={ncda.monitoringHub.subtitle}
        size="compact"
      />
      <PageContent>
        <DistrictWorkspaceNav
          items={NCDA_MONITORING_TABS}
          ariaLabel={ncda.monitoringHub.title}
        />
        {children}
      </PageContent>
    </PageContainer>
  )
}
