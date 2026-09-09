import { Card } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'
import { bilingualPrimary } from '@/lib/self-eval-text'
import {
  loadChecklistCatalog,
  RANK_CHART_COLORS,
  RANK_COLORS,
  resolveRank,
} from '@/features/self-evaluation/scoring'
import type { SelfEvalScoreResult } from '@/features/self-evaluation/types'

interface SelfEvalScoreSummaryProps {
  score: SelfEvalScoreResult
  compact?: boolean
}

export function SelfEvalScoreSummary({ score, compact = false }: SelfEvalScoreSummaryProps) {
  const rankStyle = RANK_COLORS[score.rank.id]
  const ranks = loadChecklistCatalog().ranks

  return (
    <Card className={`border-2 ${rankStyle.border} ${rankStyle.bg}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-caption text-text-muted">{caretaker.selfEval.scoreLabel}</p>
          <p className={`text-display font-bold ${rankStyle.text}`}>{score.percent}%</p>
          <p className="text-body text-text">
            {score.earnedScore} / {score.maxScore} {caretaker.selfEval.points}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-caption text-text-muted">{caretaker.selfEval.rankLabel}</p>
          <p className={`text-title font-semibold ${rankStyle.text}`}>
            {rankStyle.label}
          </p>
          <p className="text-caption text-text-muted">{score.rank.labelRw}</p>
          <span
            className="mt-2 inline-block h-2.5 w-10 rounded-full"
            style={{ backgroundColor: RANK_CHART_COLORS[score.rank.id] }}
            aria-hidden
          />
        </div>
      </div>

      {!compact && (
        <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
          <p className="text-label text-text-muted">{caretaker.selfEval.sectionTotals}</p>
          {score.sections.map((section) => {
            const sectionRank = resolveRank(section.percent, ranks)
            const sectionStyle = RANK_COLORS[sectionRank.id]
            return (
              <div
                key={section.sectionId}
                className="flex items-start justify-between gap-3 text-body"
              >
                <span className="min-w-0 flex-1 line-clamp-2">
                  {bilingualPrimary(section.title)}
                </span>
                <span
                  className={`shrink-0 font-medium tabular-nums ${sectionStyle.text}`}
                  title={sectionRank.labelRw}
                >
                  {section.earned}/{section.max}
                  <span className="ml-1 text-caption">({section.percent}%)</span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
