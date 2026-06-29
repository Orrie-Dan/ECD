import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, ChevronRight, Award, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { district } from '@/locales/rw/district'
import type { SchoolPerformanceRanking } from '@/lib/mock-data'

interface SchoolsRankingsProps {
  topPerforming: SchoolPerformanceRanking[]
  needsSupport: SchoolPerformanceRanking[]
  onViewSchool?: (centerId: string) => void
}

interface RankingListProps {
  title: string
  subtitle: string
  schools: SchoolPerformanceRanking[]
  variant: 'top' | 'bottom'
  icon: React.ReactNode
  onViewSchool?: (centerId: string) => void
}

function RankingList({ title, subtitle, schools, variant, icon, onViewSchool }: RankingListProps) {
  const isTop = variant === 'top'

  return (
    <Card padding="lg" className={`${isTop ? 'border-success/20' : 'border-warning/20'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isTop ? 'bg-success-light' : 'bg-warning-light'
          }`}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-subheading text-text">{title}</h3>
          <p className="text-caption text-text-muted">{subtitle}</p>
        </div>
      </div>

      <ul className="space-y-2">
        {schools.map((school, index) => {
          const rankBadge =
            isTop && index < 3 ? (
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-bold text-white ${
                  index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-400' : 'bg-amber-700'
                }`}
              >
                {index + 1}
              </span>
            ) : (
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-caption font-semibold bg-background-subtle text-text-muted">
                {index + 1}
              </span>
            )

          const trendIcon =
            school.enrollmentChange > 0 ? (
              <TrendingUp size={14} className="text-success" />
            ) : school.enrollmentChange < 0 ? (
              <TrendingDown size={14} className="text-warning" />
            ) : null

          return (
            <li key={school.id}>
              <Link
                to={`/district/ibigo/${school.id}`}
                onClick={() => onViewSchool?.(school.id)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface hover:border-primary/30 hover:shadow-sm transition-all duration-200 group"
              >
                {rankBadge}

                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-text truncate">{school.name}</p>
                  <p className="text-caption text-text-muted truncate">{school.sector}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-body font-bold ${
                          isTop ? 'text-success' : school.attendance >= 70 ? 'text-success' : 'text-warning'
                        }`}
                      >
                        {school.attendance}%
                      </span>
                      {trendIcon}
                    </div>
                    <p className="text-caption text-text-muted">{school.children} abana</p>
                  </div>

                  <ChevronRight
                    size={16}
                    className="text-text-muted opacity-60 group-hover:opacity-100"
                    aria-hidden
                  />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-background-subtle/50">
            <p className="text-caption text-text-muted">{district.schools.registrationGrowth}</p>
            <p className={`text-body font-bold ${isTop ? 'text-success' : 'text-warning'}`}>
              {isTop ? '+' : ''}
              {Math.round(schools.reduce((sum, s) => sum + s.enrollmentChange, 0) / schools.length)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-background-subtle/50">
            <p className="text-caption text-text-muted">{district.schools.activeChildren}</p>
            <p className="text-body font-bold text-text">
              {schools.reduce((sum, s) => sum + s.children, 0)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-background-subtle/50">
            <p className="text-caption text-text-muted">{district.schools.dataCompleteness}</p>
            <p className="text-body font-bold text-text">
              {Math.round(schools.reduce((sum, s) => sum + s.dataCompleteness, 0) / schools.length)}%
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function SchoolsRankings({ topPerforming, needsSupport, onViewSchool }: SchoolsRankingsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <RankingList
        title={district.schools.topPerforming}
        subtitle={district.schools.consistentActivity}
        schools={topPerforming}
        variant="top"
        icon={<Award size={22} className="text-success" />}
        onViewSchool={onViewSchool}
      />

      <RankingList
        title={district.schools.needsSupport}
        subtitle={district.schools.lowEngagement}
        schools={needsSupport}
        variant="bottom"
        icon={<AlertCircle size={22} className="text-warning" />}
        onViewSchool={onViewSchool}
      />
    </div>
  )
}
