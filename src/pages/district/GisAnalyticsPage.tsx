import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { GisEmbed } from '@/components/district/GisEmbed'
import { Card } from '@/components/ui/Card'
import { district } from '@/locales/rw/district'
import { ECD_CENTERS } from '@/lib/mock-data'

export function GisAnalyticsPage() {
  return (
    <DistrictLayout>
      <PageHeader
        title={district.gis.title}
        subtitle={district.gis.subtitle}
      />

      <div className="space-y-6">
        <GisEmbed
          title={district.gis.mapTitle}
          description={district.gis.mapDesc}
          height="450px"
          showFilters
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GisEmbed
            title={district.gis.sectorDistribution}
            height="350px"
          />

          <Card padding="lg">
            <h3 className="text-subheading text-text mb-5">{district.gis.childrenPerCenter}</h3>
            <ul className="space-y-4">
              {ECD_CENTERS.map((center) => (
                <li key={center.id} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-text truncate">{center.name}</p>
                    <div className="mt-2 h-2.5 bg-background-subtle rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(center.children / 60) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-subheading text-primary shrink-0 w-8 text-right">{center.children}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <GisEmbed
          title={district.gis.lowAttendance}
          description={district.dashboard.lowAttendanceAreas}
          height="350px"
          showFilters
        />
      </div>
    </DistrictLayout>
  )
}
