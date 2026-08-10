import { useState } from 'react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, StatCard } from '@/components/ui/Card'
import { ActionAlertsList } from '@/components/district/ActionAlertCard'
import { ACTION_ALERTS } from '@/lib/mock-data'
import { district } from '@/locales/rw/district'

const categories = [
  { key: 'all', label: district.followup.filterAll },
  { key: 'attendance', label: district.followup.filterAttendance },
  { key: 'enrollment', label: district.followup.filterEnrollment },
  { key: 'data_quality', label: district.followup.filterDataQuality },
  { key: 'operational', label: district.followup.filterOperational },
]

export function GukurikiranaPage() {
  const [category, setCategory] = useState('all')
  const highCount = ACTION_ALERTS.filter((a) => a.priority === 'high').length

  return (
    <DistrictLayout>
      <PageHeader title={district.followup.title} subtitle={district.followup.subtitle} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard
          compact
          label={district.followup.totalAlerts}
          value={ACTION_ALERTS.length}
          variant="info"
        />
        <StatCard
          compact
          label={district.followup.highPriority}
          value={highCount}
          variant="warning"
        />
        <StatCard
          compact
          label={district.followup.filterAttendance}
          value={ACTION_ALERTS.filter((a) => a.category === 'attendance').length}
        />
      </div>

      <Card padding="md" className="mb-5">
        <div className="flex flex-wrap gap-2">
          {categories.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`min-h-11 px-4 py-2 rounded-lg text-body font-semibold transition-colors ${
                category === key
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-background-subtle text-text-secondary hover:bg-primary-light hover:text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <ActionAlertsList category={category} />
    </DistrictLayout>
  )
}
