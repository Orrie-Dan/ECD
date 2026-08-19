import catalog from './data/checklists.generated.json'
import type {
  ComplianceRankBand,
  SelfEvalChecklistCatalog,
  SelfEvalFacilityChecklist,
  SelfEvalItem,
  SelfEvalItemAnswers,
  SelfEvalScoreResult,
  SelfEvalSectionScore,
} from './types'

export function getChecklistMaxScore(checklist: SelfEvalFacilityChecklist): number {
  return checklist.grandTotalMax ?? checklist.computedMaxScore
}

export function scoreItem(item: SelfEvalItem, answers: SelfEvalItemAnswers): number {
  if (item.indicators.length > 0) {
    if (item.selectionMode === 'any') {
      const anyMet = item.indicators.some((ind) => answers[ind.id] === true)
      return anyMet ? item.maxScore : 0
    }
    return item.indicators.reduce(
      (sum, ind) => sum + (answers[ind.id] === true ? ind.maxScore : 0),
      0,
    )
  }
  return answers[item.id] === true ? item.maxScore : 0
}

export function scoreSection(
  section: SelfEvalFacilityChecklist['sections'][number],
  answers: SelfEvalItemAnswers,
): SelfEvalSectionScore {
  const earned = section.items.reduce((sum, item) => sum + scoreItem(item, answers), 0)
  const computedMax = section.items.reduce((sum, item) => sum + item.maxScore, 0)
  const max = section.subtotalMax ?? computedMax
  const percent = max > 0 ? Math.round((earned / max) * 100) : 0
  return {
    sectionId: section.id,
    title: section.title,
    earned,
    max,
    percent,
  }
}

export function resolveRank(
  percent: number,
  ranks: ComplianceRankBand[],
): ComplianceRankBand {
  const match = ranks.find(
    (rank) => percent >= rank.minPercent && percent <= rank.maxPercent,
  )
  return match ?? ranks[ranks.length - 1]
}

export function scoreSelfEvaluation(
  checklist: SelfEvalFacilityChecklist,
  answers: SelfEvalItemAnswers,
  ranks: ComplianceRankBand[],
): SelfEvalScoreResult {
  const sections = checklist.sections.map((section) => scoreSection(section, answers))
  const earnedScore = sections.reduce((sum, section) => sum + section.earned, 0)
  const maxScore = getChecklistMaxScore(checklist)
  const percent = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0
  return {
    earnedScore,
    maxScore,
    percent,
    rank: resolveRank(percent, ranks),
    sections,
  }
}

export const RANK_COLORS: Record<
  ComplianceRankBand['id'],
  { bg: string; text: string; border: string; label: string }
> = {
  green: {
    bg: 'bg-success-light',
    text: 'text-success',
    border: 'border-success/30',
    label: 'Icyatsi',
  },
  blue: {
    bg: 'bg-primary-light',
    text: 'text-primary',
    border: 'border-primary/30',
    label: 'Ubururu',
  },
  yellow: {
    bg: 'bg-warning-light',
    text: 'text-warning',
    border: 'border-warning/30',
    label: 'Umuhondo',
  },
  red: {
    bg: 'bg-error-light',
    text: 'text-error',
    border: 'border-error/30',
    label: 'Utukura',
  },
}

export function loadChecklistCatalog(): SelfEvalChecklistCatalog {
  return catalog as SelfEvalChecklistCatalog
}
