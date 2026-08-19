export type ComplianceRankId = 'green' | 'blue' | 'yellow' | 'red'

export type SelfEvalSelectionMode = 'all' | 'any'

export interface SelfEvalIndicator {
  id: string
  label: string
  maxScore: number
}

export interface SelfEvalItem {
  id: string
  number: number
  text: string
  maxScore: number
  indicators: SelfEvalIndicator[]
  selectionMode?: SelfEvalSelectionMode
}

export interface SelfEvalSection {
  id: string
  title: string
  subtotalMax: number | null
  items: SelfEvalItem[]
}

export interface SelfEvalFacilityChecklist {
  id: string
  title: string
  version: string
  grandTotalMax: number | null
  computedMaxScore: number
  sectionCount: number
  itemCount: number
  sections: SelfEvalSection[]
}

export interface ComplianceRankBand {
  id: ComplianceRankId
  minPercent: number
  maxPercent: number
  labelRw: string
}

export interface SelfEvalChecklistCatalog {
  meta: {
    source: string
    generatedAt: string
  }
  ranks: ComplianceRankBand[]
  facilityTypes: SelfEvalFacilityChecklist[]
}

/** itemId -> met (simple items) or indicatorId -> met (multi-indicator items) */
export type SelfEvalItemAnswers = Record<string, boolean>

export interface SelfEvalDraft {
  id: string
  centerId: string
  facilityTypeId: string
  assessmentDate: string
  answers: SelfEvalItemAnswers
  updatedAt: string
}

export interface SelfEvalSectionScore {
  sectionId: string
  title: string
  earned: number
  max: number
  percent: number
}

export interface SelfEvalScoreResult {
  earnedScore: number
  maxScore: number
  percent: number
  rank: ComplianceRankBand
  sections: SelfEvalSectionScore[]
}
