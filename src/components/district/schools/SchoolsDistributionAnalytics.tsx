import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { district } from '@/locales/rw/district'
import type { SchoolDistribution } from '@/lib/mock-data'

interface SchoolsDistributionAnalyticsProps {
  distribution: SchoolDistribution
}

function SectorDistributionChart({ data }: { data: SchoolDistribution['bySector'] }) {
  const [hoveredSector, setHoveredSector] = useState<string | null>(null)
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const colors = [
    'bg-primary',
    'bg-secondary',
    'bg-success',
    'bg-warning',
    'bg-accent',
    'bg-emerald-500',
    'bg-purple-500',
    'bg-rose-500',
  ]

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const isHovered = hoveredSector === item.sector
        const barColor = colors[index % colors.length]

        return (
          <div
            key={item.sector}
            className={`p-2 rounded-lg transition-colors duration-150 -mx-2 ${isHovered ? 'bg-background-subtle' : ''}`}
            onMouseEnter={() => setHoveredSector(item.sector)}
            onMouseLeave={() => setHoveredSector(null)}
            onTouchStart={() => setHoveredSector(item.sector)}
            onTouchEnd={() => setHoveredSector(null)}
          >
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span
                className={`text-body text-text transition-colors truncate min-w-0 ${isHovered ? 'font-semibold' : ''}`}
                title={item.sector}
              >
                {item.sector}
              </span>
              <span className="text-body font-bold text-text shrink-0">
                {item.count}{' '}
                <span className="text-caption font-medium text-text-muted">({item.percent}%)</span>
              </span>
            </div>
            <div className="h-3 rounded-full bg-background-subtle overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatusDistributionChart({ data }: { data: SchoolDistribution['byStatus'] }) {
  const activeItem = data.find((d) => d.status === 'Bikora')
  const inactiveItem = data.find((d) => d.status === 'Bidasanzwe')

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {data.map((item) => (
          <div
            key={item.status}
            className={`text-center p-4 rounded-xl border transition-all duration-200 hover:border-primary/30 hover:shadow-sm ${
              item.status === 'Bikora'
                ? 'border-success/30 bg-success-light/30'
                : 'border-warning/30 bg-warning-light/30'
            }`}
          >
            <p className={`text-display text-text ${item.status === 'Bikora' ? '' : ''}`}>{item.percent}%</p>
            <p className="text-body font-semibold text-text mt-1">{item.status}</p>
            <p className="text-caption text-text-secondary mt-0.5">{item.count} ibigo</p>
          </div>
        ))}
      </div>

      <div className="h-4 rounded-full overflow-hidden flex shadow-inner">
        <div
          className="bg-success h-full transition-all duration-700 ease-out"
          style={{ width: `${activeItem?.percent ?? 0}%` }}
        />
        <div
          className="bg-warning h-full transition-all duration-700 ease-out"
          style={{ width: `${inactiveItem?.percent ?? 0}%` }}
        />
      </div>

      <div className="flex justify-between mt-2">
        <span className="text-caption text-success font-medium">
          {district.schools.activeSchools} ({activeItem?.count})
        </span>
        <span className="text-caption text-warning font-medium">
          {district.schools.inactiveSchools} ({inactiveItem?.count})
        </span>
      </div>
    </div>
  )
}

function ChildrenPerSchoolChart({ data }: { data: SchoolDistribution['childrenPerSchool'] }) {
  const [hoveredRange, setHoveredRange] = useState<string | null>(null)
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div>
      <div className="flex items-end gap-3 h-36 mb-3">
        {data.map((item) => {
          const isHovered = hoveredRange === item.range
          return (
            <div
              key={item.range}
              className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
              onMouseEnter={() => setHoveredRange(item.range)}
              onMouseLeave={() => setHoveredRange(null)}
              onTouchStart={() => setHoveredRange(item.range)}
              onTouchEnd={() => setHoveredRange(null)}
            >
              <span
                className={`text-caption font-semibold transition-colors ${
                  isHovered ? 'text-primary' : 'text-text-muted'
                }`}
              >
                {item.count}
              </span>
              <div
                className={`w-full rounded-t-md transition-all duration-700 ease-out ${
                  isHovered ? 'bg-primary' : 'bg-primary/70'
                }`}
                style={{
                  height: `${Math.max(8, (item.count / maxCount) * 100)}%`,
                }}
              />
              <span
                className={`text-caption text-center leading-tight transition-colors ${
                  isHovered ? 'text-primary font-semibold' : 'text-text-muted'
                }`}
              >
                {item.range}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-caption text-text-secondary text-center">{district.schools.childDistribution}</p>
    </div>
  )
}

export function SchoolsDistributionAnalytics({ distribution }: SchoolsDistributionAnalyticsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      <Card padding="lg" className="transition-shadow duration-200 hover:shadow-md">
        <h3 className="text-subheading text-text mb-4">{district.schools.bySector}</h3>
        <SectorDistributionChart data={distribution.bySector} />
      </Card>

      <Card padding="lg" className="transition-shadow duration-200 hover:shadow-md">
        <h3 className="text-subheading text-text mb-4">{district.schools.byStatus}</h3>
        <StatusDistributionChart data={distribution.byStatus} />
      </Card>

      <Card padding="lg" className="transition-shadow duration-200 hover:shadow-md">
        <h3 className="text-subheading text-text mb-4">{district.schools.childDistribution}</h3>
        <ChildrenPerSchoolChart data={distribution.childrenPerSchool} />
      </Card>
    </div>
  )
}
