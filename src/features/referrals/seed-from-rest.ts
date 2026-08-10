import type { LocalStore } from '@/storage/local-store'
import type { LocalReferralRecord } from '@/storage/types'
import type { ReferralViewModel } from '@/models/referral'

/** Seed REST referral list/history items into IDB as clean records (bootstrap only). */
export async function mapReferralListToLocalSeed(
  store: LocalStore,
  items: ReferralViewModel[],
): Promise<void> {
  if (items.length === 0) return
  const now = new Date().toISOString()
  const rows: LocalReferralRecord[] = []

  for (const item of items) {
    const existing = await store.getReferral(item.id)
    if (existing?._localStatus === 'dirty' || existing?._localStatus === 'pending_delete') {
      continue
    }
    const bySource = await store.getReferralBySourceId(item.assessmentId)
    if (
      bySource &&
      bySource.id !== item.id &&
      (bySource._localStatus === 'dirty' || bySource._localStatus === 'pending_delete')
    ) {
      continue
    }

    rows.push({
      id: item.id,
      childId: item.childId,
      centerId: item.centerId,
      sourceType: item.sourceType,
      sourceId: item.assessmentId,
      referralDate: item.date,
      reason: item.reason,
      destination: item.destination,
      status: item.status,
      notes: item.notes ?? null,
      implementedAt: item.implementedAt ?? null,
      recordedById: item.recordedBy ?? '',
      version: item.version ?? 1,
      deletedAt: null,
      lastModifiedAt: item.updatedAt ?? item.createdAt ?? now,
      lastModifiedByDeviceId: null,
      _localStatus: 'clean',
      _updatedAtLocal: now,
    })
  }

  if (rows.length > 0) {
    await store.putReferrals(rows)
  }
}
