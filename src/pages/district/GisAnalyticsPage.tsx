import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { GisEmbed } from '@/components/district/GisEmbed'
import { district } from '@/locales/rw/district'

export function GisAnalyticsPage() {
  return (
    <DistrictLayout>
      <PageHeader title={district.gis.title} subtitle={district.gis.subtitle} />

      <div className="space-y-4 sm:space-y-6">
        <GisEmbed
          title={district.gis.centersMap}
          description={district.gis.centersMapDesc}
          height="clamp(240px, 40vw, 400px)"
          showFilters
          showViewLevels
          allowFullscreen
        />

        <GisEmbed
          title={district.gis.attendanceMap}
          description={district.gis.attendanceMapDesc}
          height="clamp(240px, 40vw, 400px)"
          showFilters
          allowFullscreen
        />

        <GisEmbed
          title={district.gis.enrollmentMap}
          description={district.gis.enrollmentMapDesc}
          height="clamp(240px, 40vw, 400px)"
          showFilters
          allowFullscreen
        />

        <GisEmbed
          title={district.gis.dropoutMap}
          description={district.gis.dropoutMapDesc}
          height="clamp(240px, 40vw, 400px)"
          showFilters
          allowFullscreen
        />

        <GisEmbed
          title={district.gis.interventionMap}
          description={district.gis.interventionMapDesc}
          height="clamp(240px, 40vw, 400px)"
          showFilters
          allowFullscreen
        />
      </div>
    </DistrictLayout>
  )
}
