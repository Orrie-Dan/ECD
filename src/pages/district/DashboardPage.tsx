import { Users, UserCheck, Building2, TrendingUp } from 'lucide-react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/Card'
import { Card } from '@/components/ui/Card'
import { GisEmbed } from '@/components/district/GisEmbed'
import { DISTRICT_STATS, LOW_ATTENDANCE_AREAS } from '@/lib/mock-data'
import { district } from '@/locales/rw/district'

export function DistrictDashboardPage() {
  return (
    <DistrictLayout>
      <PageHeader
        title={district.dashboard.title}
        subtitle={district.dashboard.subtitle}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={district.dashboard.totalChildren}
          value={DISTRICT_STATS.totalChildren.toLocaleString()}
          icon={<Users size={22} className="text-primary" />}
        />
        <StatCard
          label={district.dashboard.presentToday}
          value={DISTRICT_STATS.presentToday.toLocaleString()}
          icon={<UserCheck size={22} className="text-success" />}
          variant="success"
        />
        <StatCard
          label={district.dashboard.ecdCenters}
          value={DISTRICT_STATS.ecdCenters}
          icon={<Building2 size={22} className="text-secondary" />}
          variant="info"
        />
        <StatCard
          label={district.dashboard.attendanceRate}
          value={`${DISTRICT_STATS.attendanceRate}%`}
          icon={<TrendingUp size={22} className="text-accent" />}
          variant={DISTRICT_STATS.attendanceRate >= 70 ? 'success' : 'warning'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GisEmbed
          title={district.gis.mapTitle}
          description={district.gis.mapDesc}
          height="320px"
          showFilters
        />

        <Card padding="lg">
          <h3 className="text-subheading text-text mb-5">{district.dashboard.lowAttendanceAreas}</h3>
          <ul className="space-y-3">
            {LOW_ATTENDANCE_AREAS.map((area) => (
              <li
                key={area.sector}
                className="flex items-center justify-between p-4 rounded-xl border border-warning/20 bg-warning-light/40"
              >
                <div>
                  <p className="text-body font-semibold text-text">{area.sector}</p>
                  <p className="text-caption mt-0.5">{area.centers} ibigo</p>
                </div>
                <span className="text-heading text-warning">{area.rate}%</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </DistrictLayout>
  )
}
