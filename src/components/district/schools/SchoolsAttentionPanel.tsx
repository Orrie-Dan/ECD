import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight, Clock, Filter } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { district } from '@/locales/rw/district'
import type { SchoolAttentionItem } from '@/lib/mock-data'

interface SchoolsAttentionPanelProps {
  items: SchoolAttentionItem[]
  onViewSchool?: (centerId: string) => void
  compact?: boolean
}

const severityConfig = {
  high: {
    badge: 'bg-error/10 text-error border-error/20',
    icon: 'text-error',
    label: district.schools.severityHigh,
    dot: 'bg-error',
  },
  medium: {
    badge: 'bg-warning/10 text-warning border-warning/20',
    icon: 'text-warning',
    label: district.schools.severityMedium,
    dot: 'bg-warning',
  },
  low: {
    badge: 'bg-success/10 text-success border-success/20',
    icon: 'text-success',
    label: district.schools.severityLow,
    dot: 'bg-success',
  },
}

type SeverityFilter = 'all' | 'high' | 'medium' | 'low'

export function SchoolsAttentionPanel({ items, onViewSchool, compact = false }: SchoolsAttentionPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [sortByUrgency, setSortByUrgency] = useState(true)

  const filteredItems =
    severityFilter === 'all' ? items : items.filter((item) => item.severity === severityFilter)

  const sortedItems = sortByUrgency
    ? [...filteredItems].sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 }
        return order[a.severity] - order[b.severity]
      })
    : filteredItems

  const highCount = items.filter((i) => i.severity === 'high').length
  const mediumCount = items.filter((i) => i.severity === 'medium').length
  const lowCount = items.filter((i) => i.severity === 'low').length

  if (items.length === 0) {
    return (
      <Card padding={compact ? 'md' : 'lg'} className="border-success/20 bg-success-light/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
            <AlertTriangle size={20} className="text-success" />
          </div>
          <div>
            <p className="text-body font-semibold text-success">{district.followup.empty}</p>
            <p className="text-caption text-text-secondary mt-0.5">{district.followup.emptyDesc}</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card padding={compact ? 'md' : 'lg'} className="border-warning/25 bg-warning-light/10">
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${compact ? 'mb-3' : 'mb-5'}`}>
        <h3
          className={`font-semibold text-text flex items-center gap-2 ${compact ? 'text-body' : 'text-subheading'}`}
        >
          <AlertTriangle size={compact ? 18 : 22} className="text-warning shrink-0" aria-hidden />
          {district.schools.attentionRequired}
          <span className="text-caption font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </h3>

        {!compact && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-surface rounded-lg border border-border p-1">
              {(['all', 'high', 'medium', 'low'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSeverityFilter(filter)}
                  className={`px-2 py-1 rounded-md text-caption font-medium transition-colors ${
                    severityFilter === filter
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:bg-background-subtle'
                  }`}
                >
                  {filter === 'all'
                    ? district.followup.filterAll
                    : filter === 'high'
                      ? `${district.schools.severityHigh} (${highCount})`
                      : filter === 'medium'
                        ? `${district.schools.severityMedium} (${mediumCount})`
                        : `${district.schools.severityLow} (${lowCount})`}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSortByUrgency(!sortByUrgency)}
              className={`p-2 rounded-lg border transition-colors ${
                sortByUrgency
                  ? 'border-primary bg-primary-light text-primary'
                  : 'border-border bg-surface text-text-muted hover:bg-background-subtle'
              }`}
              title={district.schools.sortByUrgency}
            >
              <Filter size={16} />
            </button>
          </div>
        )}
      </div>

      <ul className={`${compact ? 'space-y-2' : 'space-y-3'} max-h-[500px] overflow-y-auto`}>
        {sortedItems.map((item) => {
          const config = severityConfig[item.severity]

          return (
            <li key={item.id}>
              <Link
                to={`/district/ibigo/${item.centerId}`}
                onClick={() => onViewSchool?.(item.centerId)}
                className={`block rounded-lg border bg-surface transition-all duration-200 hover:shadow-md group ${
                  compact ? 'p-3' : 'p-4'
                } ${config.badge.replace('text-', 'border-').replace('/10', '/30')}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${config.dot}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className={`font-semibold text-text truncate ${compact ? 'text-caption' : 'text-body'}`}>
                        {item.centerName}
                      </p>
                      <span
                        className={`text-caption font-semibold px-2 py-0.5 rounded-full border shrink-0 ${config.badge}`}
                      >
                        {config.label}
                      </span>
                    </div>

                    <p className={`text-text-secondary ${compact ? 'text-caption' : 'text-body'}`}>
                      {item.issue}
                    </p>

                    {!compact && item.metrics && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.metrics.map((metric, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 text-caption bg-background-subtle px-2 py-1 rounded-md"
                          >
                            <span className="text-text-muted">{metric.label}:</span>
                            <span className="font-semibold text-text">{metric.value}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {!compact && (
                      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
                        <div className="min-w-0">
                          <p className="text-caption text-text-muted">{district.schools.suggestedAction}:</p>
                          <p className="text-caption text-text truncate">{item.suggestedAction}</p>
                        </div>

                        {item.lastActivity && (
                          <div className="flex items-center gap-1 text-caption text-text-muted shrink-0">
                            <Clock size={12} />
                            {item.lastActivity}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <ChevronRight
                    size={16}
                    className="text-text-muted shrink-0 opacity-60 group-hover:opacity-100 mt-1"
                    aria-hidden
                  />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      {!compact && filteredItems.length === 0 && (
        <p className="text-body text-text-secondary text-center py-8">
          {district.schools.noResults}
        </p>
      )}
    </Card>
  )
}
