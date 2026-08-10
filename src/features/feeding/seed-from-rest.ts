import type { LocalStore } from '@/storage/local-store'
import type {
  LocalFeedingDayRecord,
  LocalFeedingMonthSummaryRecord,
} from '@/storage/types'
import type {
  FeedingDayViewModel,
  FeedingMonthSummaryViewModel,
} from '@/models/feeding'
import { emptyComposition } from '@/lib/feeding-utils'

/** Seed REST feeding day items into IDB as clean records (bootstrap only). */
export async function mapFeedingDayListToLocalSeed(
  store: LocalStore,
  items: FeedingDayViewModel[],
): Promise<void> {
  if (items.length === 0) return
  const now = new Date().toISOString()
  const rows: LocalFeedingDayRecord[] = []

  for (const item of items) {
    const existing = await store.getFeedingDay(item.id)
    if (existing?._localStatus === 'dirty' || existing?._localStatus === 'pending_delete') {
      continue
    }
    const byKey = await store.getFeedingDayByNaturalKey(item.centerId, item.date)
    if (
      byKey &&
      byKey.id !== item.id &&
      (byKey._localStatus === 'dirty' || byKey._localStatus === 'pending_delete')
    ) {
      continue
    }

    const composition = item.composition ?? emptyComposition()
    rows.push({
      id: item.id,
      centerId: item.centerId,
      date: item.date,
      milkServed: item.milkServed,
      porridgeServed: item.porridgeServed,
      balancedMealServed: item.balancedMealServed,
      cerealsOrTubers: composition.cerealsOrTubers,
      legumes: composition.legumes,
      dairy: composition.dairy,
      animalProducts: composition.animalProducts,
      fruitsVegetables: composition.fruitsVegetables,
      addedFat: composition.addedFat,
      recordedById: item.recordedBy ?? '',
      version: item.version,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'clean',
      _updatedAtLocal: now,
    })
  }

  if (rows.length > 0) {
    await store.putFeedingDays(rows)
  }
}

/** Seed REST month summary items into IDB as clean records (bootstrap only). */
export async function mapFeedingMonthSummaryListToLocalSeed(
  store: LocalStore,
  items: FeedingMonthSummaryViewModel[],
): Promise<void> {
  if (items.length === 0) return
  const now = new Date().toISOString()
  const rows: LocalFeedingMonthSummaryRecord[] = []

  for (const item of items) {
    const existing = await store.getFeedingMonthSummary(item.id)
    if (existing?._localStatus === 'dirty' || existing?._localStatus === 'pending_delete') {
      continue
    }
    const byKey = await store.getFeedingMonthSummaryByNaturalKey(
      item.centerId,
      item.yearMonth,
    )
    if (
      byKey &&
      byKey.id !== item.id &&
      (byKey._localStatus === 'dirty' || byKey._localStatus === 'pending_delete')
    ) {
      continue
    }

    rows.push({
      id: item.id,
      centerId: item.centerId,
      yearMonth: item.yearMonth,
      milkLiters: item.milkLiters,
      flourKg: item.flourKg,
      foodSource: item.foodSource,
      updatedById: item.updatedBy ?? null,
      version: item.version,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'clean',
      _updatedAtLocal: now,
    })
  }

  if (rows.length > 0) {
    await store.putFeedingMonthSummaries(rows)
  }
}
