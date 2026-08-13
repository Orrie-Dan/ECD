import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { DistrictMapView } from '@/components/district/gis'
import { district } from '@/locales/rw/district'

export function GisAnalyticsPage() {
  return (
    <>
      <PageContainer>
        <PageHeader title={district.gis.mapViewTitle} subtitle={district.gis.subtitle} />
        <PageContent>
          <DistrictMapView />
        </PageContent>
      </PageContainer>
    </>
  )
}
