import { fetchChildDetail } from '@/api/resources/children'
import type { LocalStore } from '@/storage/local-store'
import { mapChildListItemToLocalSeed } from '@/features/children/seed-from-rest'

/** Source centre: child is leaving — stop counting them locally until sync confirms. */
export async function markChildPendingTransferLocal(
  store: LocalStore,
  childId: string,
): Promise<void> {
  const existing = await store.getChild(childId)
  if (!existing || existing.status !== 'active') return
  const now = new Date().toISOString()
  await store.putChild({
    ...existing,
    status: 'transferred',
    lastModifiedAt: now,
    _localStatus: 'clean',
  })
}

/** Pending transfer cancelled — restore active enrollment at source centre. */
export async function revertChildPendingTransferLocal(
  store: LocalStore,
  childId: string,
): Promise<void> {
  const existing = await store.getChild(childId)
  if (!existing || existing.status !== 'transferred') return
  const now = new Date().toISOString()
  await store.putChild({
    ...existing,
    status: 'active',
    lastModifiedAt: now,
    _localStatus: 'clean',
  })
}

/** Refresh a child row from REST after transfer accept/cancel (both centres). */
export async function refreshChildFromApiLocal(
  store: LocalStore,
  childId: string,
): Promise<void> {
  const detail = await fetchChildDetail(childId)
  await mapChildListItemToLocalSeed(store, [detail])
}
