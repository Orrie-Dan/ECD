import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PieChart } from 'lucide-react'
import { district } from '@/locales/rw/district'
import type { ChildrenDistributionData } from '@/lib/district-children-utils'

interface ChildrenDistributionProps {
  distribution: ChildrenDistributionData
}

export function ChildrenDistribution({ distribution }: ChildrenDistributionProps) {
  const total = distribution.gender.reduce((sum, g) => sum + g.count, 0)
  const maxAge = Math.max(...distribution.ageGroups.map((g) => g.count), 1)

  if (total === 0) {
    return (
      <Card padding="lg" className="mb-4">
        <EmptyState
          icon={<PieChart size={48} className="text-text-muted" strokeWidth={1.5} />}
          title={district.children.distributionEmpty}
          description={district.children.distributionEmptyDesc}
        />
      </Card>
    )
  }

  return (
    <Card padding="lg" className="mb-4 transition-shadow duration-200 hover:shadow-md">
      <h3 className="text-subheading text-text mb-5">{district.children.distribution}</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h4 className="text-body font-semibold text-text mb-4">{district.children.ageGroups}</h4>
          <ul className="space-y-3">
            {distribution.ageGroups.map((group) => (
              <li
                key={group.label}
                className="rounded-lg p-2 -mx-2 transition-colors duration-150 hover:bg-background-subtle/80"
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-body text-text">{group.label} imyaka</span>
                  <span className="text-body font-bold text-text shrink-0">
                    {group.count.toLocaleString()}{' '}
                    <span className="text-caption font-medium text-text-muted">({group.percent}%)</span>
                  </span>
                </div>
                <div className="h-3 rounded-full bg-background-subtle overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${(group.count / maxAge) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-body font-semibold text-text mb-4">{district.children.genderDistribution}</h4>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
            {distribution.gender.map((g) => (
              <div
                key={g.label}
                className="text-center p-4 rounded-xl border border-border bg-background-subtle/50 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
              >
                <p className="text-heading sm:text-display text-text">{g.percent}%</p>
                <p className="text-body font-semibold text-text mt-1">{g.label}</p>
                <p className="text-caption text-text-secondary mt-0.5">{g.count.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="h-4 rounded-full overflow-hidden flex shadow-inner">
            <div
              className="bg-secondary h-full transition-all duration-700 ease-out"
              style={{ width: `${distribution.gender[0].percent}%` }}
            />
            <div
              className="bg-primary h-full transition-all duration-700 ease-out"
              style={{ width: `${distribution.gender[1].percent}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
