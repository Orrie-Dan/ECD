import Dexie, { type Table } from 'dexie'
import {
  DB_NAME,
  DB_VERSION,
  DEXIE_STORES,
  DEXIE_STORES_V1,
  DEXIE_STORES_V2,
  DEXIE_STORES_V3,
  DEXIE_STORES_V4,
  DEXIE_STORES_V5,
} from '@/storage/schema'
import type {
  DeviceRecord,
  LocalAttendanceRecord,
  LocalChildRecord,
  LocalFeedingDayRecord,
  LocalFeedingMonthSummaryRecord,
  LocalNutritionScreeningRecord,
  LocalReferralRecord,
  LocalStedAssessmentRecord,
  MetaRecord,
  SyncOperationRecord,
  SyncSessionRecord,
  VillageCacheRecord,
} from '@/storage/types'
import { LEGACY_UNOWNED } from '@/storage/ownership'

export class EcdOfflineDatabase extends Dexie {
  meta!: Table<MetaRecord, string>
  device!: Table<DeviceRecord, string>
  sync_operations!: Table<SyncOperationRecord, string>
  sync_sessions!: Table<SyncSessionRecord, string>
  children!: Table<LocalChildRecord, string>
  attendance!: Table<LocalAttendanceRecord, string>
  nutrition_screenings!: Table<LocalNutritionScreeningRecord, string>
  referrals!: Table<LocalReferralRecord, string>
  feeding_days!: Table<LocalFeedingDayRecord, string>
  feeding_month_summaries!: Table<LocalFeedingMonthSummaryRecord, string>
  sted_assessments!: Table<LocalStedAssessmentRecord, string>
  village_cache!: Table<VillageCacheRecord, string>

  constructor(name = DB_NAME) {
    super(name)
    this.version(1).stores(DEXIE_STORES_V1)
    this.version(2).stores(DEXIE_STORES_V2)
    this.version(3).stores(DEXIE_STORES_V3)
    this.version(4).stores(DEXIE_STORES_V4)
    this.version(5).stores(DEXIE_STORES_V5)
    this.version(DB_VERSION)
      .stores(DEXIE_STORES)
      .upgrade(async (tx) => {
        // Stamp pre-4.8.6 outbox rows so ownership guards never treat them as
        // belonging to whichever user happens to be logged in next.
        const ops = tx.table('sync_operations')
        await ops.toCollection().modify((op: SyncOperationRecord) => {
          if (!op.ownerUserId) {
            op.ownerUserId = LEGACY_UNOWNED
          }
        })
      })
  }
}

let dbSingleton: EcdOfflineDatabase | null = null
let dbSingletonName: string | null = null

/**
 * Databases currently leased by an in-flight sync cycle.
 * Leased DBs must not be closed on account switch — that would either corrupt
 * the sync transaction or force a rebind that could write into the wrong user DB.
 */
const leasedDbNames = new Set<string>()
/** Connections kept alive after singleton switch until their sync lease ends. */
const parkedDbs = new Map<string, EcdOfflineDatabase>()

export function getOfflineDb(): EcdOfflineDatabase {
  if (!dbSingleton) {
    dbSingleton = new EcdOfflineDatabase()
    dbSingletonName = DB_NAME
  }
  return dbSingleton
}

export function getOfflineDbName(): string | null {
  return dbSingletonName
}

/** Pin a named DB open for the duration of a sync cycle. */
export function acquireSyncDbLease(name: string): void {
  leasedDbNames.add(name)
}

/** Release a sync lease; close the DB if it was parked off the singleton. */
export function releaseSyncDbLease(name: string): void {
  leasedDbNames.delete(name)
  const parked = parkedDbs.get(name)
  if (parked && dbSingletonName !== name) {
    parkedDbs.delete(name)
    try {
      parked.close()
    } catch {
      /* ignore */
    }
  }
}

export function isSyncDbLeased(name: string): boolean {
  return leasedDbNames.has(name)
}

/**
 * Switch the process-wide offline DB singleton to a named database.
 * Closes the previous connection when the name changes — unless a sync lease
 * holds it open (parked) so mid-cycle writes cannot land in another user's DB.
 */
export async function openOfflineDb(name: string): Promise<EcdOfflineDatabase> {
  if (dbSingleton && dbSingletonName === name) {
    return dbSingleton
  }

  const previous = dbSingleton
  const previousName = dbSingletonName

  if (previous && previousName) {
    if (leasedDbNames.has(previousName)) {
      // Keep the leased connection alive for the sync cycle; do not close it.
      parkedDbs.set(previousName, previous)
    } else {
      try {
        previous.close()
      } catch {
        /* ignore */
      }
      parkedDbs.delete(previousName)
    }
    dbSingleton = null
    dbSingletonName = null
  }

  const alreadyParked = parkedDbs.get(name)
  if (alreadyParked) {
    parkedDbs.delete(name)
    dbSingleton = alreadyParked
    dbSingletonName = name
    return dbSingleton
  }

  dbSingleton = new EcdOfflineDatabase(name)
  dbSingletonName = name
  await dbSingleton.open()
  return dbSingleton
}

/** Test helper — replace singleton with a fresh named DB. */
export function resetOfflineDbForTests(name = `${DB_NAME}-test-${Date.now()}`): EcdOfflineDatabase {
  for (const parked of parkedDbs.values()) {
    try {
      parked.close()
    } catch {
      /* ignore */
    }
  }
  parkedDbs.clear()
  leasedDbNames.clear()
  if (dbSingleton) {
    try {
      dbSingleton.close()
    } catch {
      /* ignore */
    }
  }
  dbSingleton = new EcdOfflineDatabase(name)
  dbSingletonName = name
  return dbSingleton
}

export async function closeOfflineDb(): Promise<void> {
  for (const parked of parkedDbs.values()) {
    try {
      parked.close()
    } catch {
      /* ignore */
    }
  }
  parkedDbs.clear()
  leasedDbNames.clear()
  if (dbSingleton) {
    await dbSingleton.close()
    dbSingleton = null
    dbSingletonName = null
  }
}

/** Delete a named IndexedDB (scoped wipe / test cleanup). */
export async function deleteOfflineDb(name: string): Promise<void> {
  if (dbSingletonName === name) {
    await closeOfflineDb()
  }
  await Dexie.delete(name)
}
