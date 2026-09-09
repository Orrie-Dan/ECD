import { env } from '@/config/env'
import { submitSelfEvaluation } from '@/api/resources/compliance'
import type { AssessmentResponseDto } from '@/api/generated/models'
import { clearSelfEvalDraft } from '@/features/self-evaluation/draft-storage'
import type {
  ComplianceRankId,
  SelfEvalDraft,
  SelfEvalScoreResult,
} from '@/features/self-evaluation/types'

export type SubmitSelfEvalDraftInput = {
  draft: SelfEvalDraft
  score: SelfEvalScoreResult
  standardsVersion: string
}

/**
 * Push a localStorage self-eval draft to POST /compliance/self-evaluations,
 * then clear the on-device draft on success.
 */
export async function submitLocalSelfEvalDraft(
  input: SubmitSelfEvalDraftInput,
): Promise<AssessmentResponseDto> {
  if (!env.isLive) {
    throw new Error('LIVE_REQUIRED')
  }

  const result = await submitSelfEvaluation({
    centerId: input.draft.centerId,
    facilityTypeId: input.draft.facilityTypeId,
    standardsVersion: input.standardsVersion,
    assessmentDate: input.draft.assessmentDate,
    earnedScore: input.score.earnedScore,
    maxScore: input.score.maxScore,
    percent: input.score.percent,
    rank: input.score.rank.id as ComplianceRankId,
    clientDraftId: input.draft.id,
  })

  clearSelfEvalDraft(input.draft.centerId)
  return result
}
