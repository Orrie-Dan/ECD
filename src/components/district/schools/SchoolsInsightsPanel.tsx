import { TrendingUp, TrendingDown, Info, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import type { DistrictSchoolInsight } from '@/lib/mock-data'

interface SchoolsInsightsPanelProps {
  insights: DistrictSchoolInsight[]
  compact?: boolean
}

const typeConfig = {
  positive: {
    icon: TrendingUp,
    iconBg: 'bg-success-light',
    iconColor: 'text-success',
    borderColor: 'border-success/20',
    metricColor: 'text-success',
  },
  warning: {
    icon: TrendingDown,
    iconBg: 'bg-warning-light',
    iconColor: 'text-warning',
    borderColor: 'border-warning/20',
    metricColor: 'text-warning',
  },
  info: {
    icon: Info,
    iconBg: 'bg-secondary-light',
    iconColor: 'text-secondary',
    borderColor: 'border-secondary/20',
    metricColor: 'text-secondary',
  },
}

export function SchoolsInsightsPanel({ insights, compact = false }: SchoolsInsightsPanelProps) {
  const displayedInsights = compact ? insights.slice(0, 4) : insights

  return (
    <Card padding={compact ? 'md' : 'lg'}>
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-3' : 'mb-5'}`}>
        <h3 className={`font-semibold text-text ${compact ? 'text-body' : 'text-subheading'}`}>
          {district.schools.districtInsights}
        </h3>
        {compact && (
          <span className="text-caption text-primary font-semibold cursor-pointer hover:underline">
            {district.dashboard.viewFollowup}
          </span>
        )}
      </div>

      <div className={`${compact ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}`}>
        {displayedInsights.map((insight) => {
          const config = typeConfig[insight.type]
          const Icon = config.icon

          return (
            <div
              key={insight.id}
              className={`
                rounded-xl border bg-surface transition-all duration-200 hover:shadow-md group cursor-default
                ${config.borderColor}
                ${compact ? 'p-3' : 'p-4'}
              `}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.iconBg}`}
                >
                  <Icon size={20} className={config.iconColor} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`font-semibold text-text ${compact ? 'text-caption' : 'text-body'} line-clamp-2`}>
                      {insight.title}
                    </h4>
                    {insight.metric && (
                      <span
                        className={`text-caption font-bold px-2 py-0.5 rounded-full bg-background-subtle shrink-0 ${config.metricColor}`}
                      >
                        {insight.metric}
                      </span>
                    )}
                  </div>

                  <p className={`text-text-secondary ${compact ? 'text-caption line-clamp-2' : 'text-caption'}`}>
                    {insight.description}
                  </p>

                  {!compact && insight.schools && insight.schools.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-caption text-text-muted mb-1">{common.ui.centersPrefix}</p>
                      <div className="flex flex-wrap gap-1">
                        {insight.schools.slice(0, 3).map((school, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center text-caption bg-background-subtle px-2 py-0.5 rounded-md text-text"
                          >
                            {school}
                          </span>
                        ))}
                        {insight.schools.length > 3 && (
                          <span className="text-caption text-text-muted">
                            {common.ui.moreItems.replace('{count}', String(insight.schools.length - 3))}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {compact && (
                  <ChevronRight
                    size={16}
                    className="text-text-muted opacity-0 group-hover:opacity-100 shrink-0 mt-1"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!compact && insights.length === 0 && (
        <div className="text-center py-8">
          <Info size={40} className="text-text-muted mx-auto mb-3" />
          <p className="text-body text-text-secondary">
            {district.schools.insightsEmpty}
          </p>
        </div>
      )}
    </Card>
  )
}
