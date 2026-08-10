import { useState } from 'react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, StatCard } from '@/components/ui/Card'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { ActionAlertsList } from '@/components/district/ActionAlertCard'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { env } from '@/config/env'
import { ACTION_ALERTS } from '@/lib/mock-data'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'

const categories = [
  { id: 'all', label: district.followup.filterAll },
  { id: 'attendance', label: district.followup.filterAttendance },
  { id: 'enrollment', label: district.followup.filterEnrollment },
  { id: 'nutrition', label: district.followup.filterNutrition },
  { id: 'data_quality', label: district.followup.filterDataQuality },
  { id: 'operational', label: district.followup.filterOperational },
] as const

type CategoryFilter = (typeof categories)[number]['id']

export function GukurikiranaPage() {
  const [category, setCategory] = useState<CategoryFilter>('all')
  const highCount = ACTION_ALERTS.filter((a) => a.priority === 'high').length

  return (
    <DistrictLayout>
      <PageContainer>
        <PageHeader title={district.followup.title} subtitle={district.followup.subtitle} />
        <PageContent className="space-y-6">
          {env.isLive ? (
            <LiveUnavailableState
              title={district.followup.title}
              description={common.live.unavailableDesc}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                <div className="h-full [&>div]:h-full">
                  <StatCard
                    compact
                    label={district.followup.totalAlerts}
                    value={ACTION_ALERTS.length}
                    variant="info"
                  />
                </div>
                <div className="h-full [&>div]:h-full">
                  <StatCard
                    compact
                    label={district.followup.highPriority}
                    value={highCount}
                    variant="danger"
                  />
                </div>
                <div className="h-full [&>div]:h-full">
                  <StatCard
                    compact
                    label={district.followup.filterAttendance}
                    value={ACTION_ALERTS.filter((a) => a.category === 'attendance').length}
                  />
                </div>
              </div>

              <Card padding="lg">
                <SegmentedTabs
                  options={[...categories]}
                  value={category}
                  onChange={setCategory}
                  aria-label={district.followup.title}
                  columns={3}
                />
              </Card>

              <ActionAlertsList category={category} />
            </>
          )}
        </PageContent>
      </PageContainer>
    </DistrictLayout>
  )
}
