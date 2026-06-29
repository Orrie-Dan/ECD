import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { district } from '@/locales/rw/district'
import type { SchoolRegistrationTrend, SchoolCapacityData } from '@/lib/mock-data'

interface SchoolsPerformanceDashboardProps {
  registrationTrends: SchoolRegistrationTrend[]
  capacityData: SchoolCapacityData[]
}

interface BarTooltipProps {
  label: string
  newRegistrations: number
  dropouts: number
  netChange: number
  visible: boolean
}

function BarTooltip({ label, newRegistrations, dropouts, netChange, visible }: BarTooltipProps) {
  if (!visible) return null

  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-max max-w-56 rounded-lg border border-border bg-surface px-3 py-2 shadow-lg text-left pointer-events-none"
      role="tooltip"
    >
      <p className="text-caption font-bold text-text mb-1.5">{label}</p>
      <p className="text-caption text-text-secondary">
        <span className="inline-block w-2 h-2 rounded-sm bg-primary mr-1.5 align-middle" aria-hidden />
        {district.schools.newRegistrationsShort}: <strong className="text-text">{newRegistrations}</strong>
      </p>
      <p className="text-caption text-text-secondary mt-0.5">
        <span className="inline-block w-2 h-2 rounded-sm bg-warning mr-1.5 align-middle" aria-hidden />
        {district.children.trendDropouts}: <strong className="text-text">{dropouts}</strong>
      </p>
      <p className="text-caption text-text-secondary mt-0.5">
        <span className="inline-block w-2 h-2 rounded-sm bg-success mr-1.5 align-middle" aria-hidden />
        {district.children.trendNet}: <strong className={netChange >= 0 ? 'text-success' : 'text-warning'}>
          {netChange >= 0 ? '+' : ''}{netChange}
        </strong>
      </p>
    </div>
  )
}

function RegistrationTrendsChart({ data }: { data: SchoolRegistrationTrend[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const maxValue = Math.max(...data.flatMap((d) => [d.newRegistrations, d.dropouts]), 1)

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
        {[
          { label: district.schools.newRegistrationsShort, color: 'bg-primary' },
          { label: district.children.trendDropouts, color: 'bg-warning' },
        ].map(({ label, color }) => (
          <span key={label} className="inline-flex items-center gap-2 text-caption font-medium text-text-secondary">
            <span className={`w-3 h-3 rounded-sm ${color} shrink-0`} aria-hidden />
            {label}
          </span>
        ))}
      </div>

      <div
        className="flex items-end gap-2 sm:gap-3 h-44 sm:h-52 pb-1"
        role="img"
        aria-label={district.schools.registrationTrends}
      >
        {data.map((point, index) => {
          const isActive = activeIndex === index

          return (
            <div
              key={point.month}
              className="flex-1 min-w-10 flex flex-col items-center gap-1.5 h-full justify-end group relative"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onTouchStart={() => setActiveIndex(index)}
              onTouchEnd={() => setActiveIndex(null)}
            >
              <BarTooltip
                label={point.month}
                newRegistrations={point.newRegistrations}
                dropouts={point.dropouts}
                netChange={point.netChange}
                visible={isActive}
              />

              <div className="flex items-end gap-1 w-full h-[calc(100%-2.25rem)] justify-center">
                <div
                  className="w-3 sm:w-4 bg-warning rounded-t-sm transition-all duration-700 ease-out group-hover:opacity-90"
                  style={{
                    height: `${Math.max(4, (point.dropouts / maxValue) * 100)}%`,
                    transitionDelay: `${index * 40}ms`,
                  }}
                />
                <div
                  className="w-3 sm:w-4 bg-primary rounded-t-sm transition-all duration-700 ease-out group-hover:opacity-90"
                  style={{
                    height: `${Math.max(4, (point.newRegistrations / maxValue) * 100)}%`,
                    transitionDelay: `${index * 40 + 20}ms`,
                  }}
                />
              </div>

              <span
                className={`text-caption text-center leading-tight whitespace-nowrap transition-colors duration-200 ${
                  isActive ? 'text-primary font-semibold' : 'text-text-muted'
                }`}
              >
                {point.month.slice(0, 3)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CapacityChart({ data }: { data: SchoolCapacityData[] }) {
  const [hoveredSchool, setHoveredSchool] = useState<string | null>(null)

  const capacitySummary = useMemo(() => {
    const overcrowded = data.filter((d) => d.status === 'overcrowded').length
    const nearCapacity = data.filter((d) => d.status === 'near_capacity').length
    const optimal = data.filter((d) => d.status === 'optimal').length
    const underutilized = data.filter((d) => d.status === 'underutilized').length
    return { overcrowded, nearCapacity, optimal, underutilized }
  }, [data])

  const topSchools = useMemo(
    () => [...data].sort((a, b) => b.utilizationPercent - a.utilizationPercent).slice(0, 8),
    [data],
  )

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { label: district.schools.overcrowded, count: capacitySummary.overcrowded, color: 'bg-error text-error' },
          { label: district.schools.nearCapacity, count: capacitySummary.nearCapacity, color: 'bg-warning text-warning' },
          { label: district.schools.optimalCapacity, count: capacitySummary.optimal, color: 'bg-success text-success' },
          { label: district.schools.underutilized, count: capacitySummary.underutilized, color: 'bg-secondary text-secondary' },
        ].map(({ label, count, color }) => (
          <div key={label} className="text-center p-2 rounded-lg border border-border bg-background-subtle/50">
            <p className={`text-subheading font-bold ${color.split(' ')[1]}`}>{count}</p>
            <p className="text-caption text-text-muted truncate">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {topSchools.map((school) => {
          const isHovered = hoveredSchool === school.id
          const barColor =
            school.status === 'overcrowded'
              ? 'bg-error'
              : school.status === 'near_capacity'
                ? 'bg-warning'
                : school.status === 'underutilized'
                  ? 'bg-secondary'
                  : 'bg-success'

          return (
            <div
              key={school.id}
              className={`p-2 rounded-lg transition-colors duration-150 ${isHovered ? 'bg-background-subtle' : ''}`}
              onMouseEnter={() => setHoveredSchool(school.id)}
              onMouseLeave={() => setHoveredSchool(null)}
              onTouchStart={() => setHoveredSchool(school.id)}
              onTouchEnd={() => setHoveredSchool(null)}
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-caption text-text truncate flex-1">{school.name}</span>
                <span className="text-caption font-semibold text-text shrink-0">
                  {school.enrolled}/{school.capacity}
                </span>
                <span
                  className={`text-caption font-bold shrink-0 ${
                    school.utilizationPercent > 95
                      ? 'text-error'
                      : school.utilizationPercent > 80
                        ? 'text-warning'
                        : school.utilizationPercent < 50
                          ? 'text-secondary'
                          : 'text-success'
                  }`}
                >
                  {school.utilizationPercent}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-background-subtle overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
                  style={{ width: `${Math.min(100, school.utilizationPercent)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SchoolsPerformanceDashboard({
  registrationTrends,
  capacityData,
}: SchoolsPerformanceDashboardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <Card padding="lg" className="transition-shadow duration-200 hover:shadow-md">
        <h3 className="text-subheading text-text mb-4">{district.schools.registrationTrends}</h3>
        <RegistrationTrendsChart data={registrationTrends} />
      </Card>

      <Card padding="lg" className="transition-shadow duration-200 hover:shadow-md">
        <h3 className="text-subheading text-text mb-4">{district.schools.schoolCapacity}</h3>
        <CapacityChart data={capacityData} />
      </Card>
    </div>
  )
}
