import type { LocalStore } from '@/storage/local-store'
import type { LocalStedAssessmentRecord } from '@/storage/types'
import type { StedAssessmentViewModel } from '@/models/sted'

/** Seed REST STED history/roster items into IDB as clean records (bootstrap only). */
export async function mapStedRosterToLocalSeed(
  store: LocalStore,
  items: StedAssessmentViewModel[],
): Promise<void> {
  if (items.length === 0) return
  const now = new Date().toISOString()
  const rows: LocalStedAssessmentRecord[] = []

  for (const item of items) {
    const existing = await store.getStedAssessment(item.id)
    if (existing?._localStatus === 'dirty' || existing?._localStatus === 'pending_delete') {
      continue
    }

    const outcomePayload: Record<string, unknown> = {
      normal: item.outcome.normal,
      referred: item.outcome.referred,
      counseling: item.outcome.counseling,
      other: item.outcome.other,
      ...(item.outcome.otherText ? { otherText: item.outcome.otherText } : {}),
      followUpIn6Months: item.outcome.followUpIn6Months,
      ...(item.outcome.followUpDueDate
        ? { followUpDueDate: item.outcome.followUpDueDate }
        : {}),
    }

    rows.push({
      id: item.id,
      childId: item.childId,
      centerId: item.centerId,
      assessmentDate: item.assessmentDate,
      ageBand: item.ageBand,
      consentObtained: item.consentObtained,
      physicalAssessment: { ...item.physical },
      milestoneResults: { ...item.milestones },
      outcome: outcomePayload,
      followUpIn6Months: item.outcome.followUpIn6Months,
      followUpDueDate: item.outcome.followUpDueDate ?? null,
      notes: item.notes ?? null,
      assessedById: item.assessedById ?? item.assessedBy ?? '',
      version: item.version ?? 1,
      deletedAt: null,
      lastModifiedAt: item.updatedAt ?? item.createdAt ?? now,
      lastModifiedByDeviceId: null,
      _localStatus: 'clean',
      _updatedAtLocal: now,
    })
  }

  if (rows.length > 0) {
    await store.putStedAssessments(rows)
  }
}
