/**
 * Dexie table definitions for the ECD offline store.
 * Domain feature code must not import this — use LocalStore.
 *
 * Multi-account isolation (Sprint 4.8.6): each authenticated user gets a
 * dedicated IndexedDB name `ecd-offline-u-{userId}`. The legacy shared
 * `ecd-offline` DB is migrated once into the matching user's workspace.
 */

export const DB_NAME = 'ecd-offline'
export const DB_VERSION = 6

/** Dexie schema string map (version 1 — children PoC). */
export const DEXIE_STORES_V1 = {
  meta: 'key',
  device: 'id, deviceUuid, userId',
  sync_operations:
    'clientOperationId, status, entityType, entityId, createdAt, sessionId',
  sync_sessions: 'sessionId, status, updatedAt',
  children: 'id, centerId, status, lastModifiedAt, _localStatus, deletedAt',
  village_cache: 'key',
} as const

/**
 * Dexie schema string map (version 2 — attendance + compound natural key).
 * Compound index [childId+date] enforces local uniqueness for the backend natural key.
 */
export const DEXIE_STORES_V2 = {
  meta: 'key',
  device: 'id, deviceUuid, userId',
  sync_operations:
    'clientOperationId, status, entityType, entityId, createdAt, sessionId',
  sync_sessions: 'sessionId, status, updatedAt',
  children: 'id, centerId, status, lastModifiedAt, _localStatus, deletedAt',
  attendance:
    'id, [childId+date], childId, centerId, date, lastModifiedAt, _localStatus, deletedAt',
  village_cache: 'key',
} as const

/**
 * Dexie schema (version 3 — nutrition screenings + referral dependency table).
 */
export const DEXIE_STORES_V3 = {
  meta: 'key',
  device: 'id, deviceUuid, userId',
  sync_operations:
    'clientOperationId, status, entityType, entityId, createdAt, sessionId',
  sync_sessions: 'sessionId, status, updatedAt',
  children: 'id, centerId, status, lastModifiedAt, _localStatus, deletedAt',
  attendance:
    'id, [childId+date], childId, centerId, date, lastModifiedAt, _localStatus, deletedAt',
  nutrition_screenings:
    'id, childId, centerId, screeningDate, lastModifiedAt, _localStatus, deletedAt, [childId+screeningDate]',
  referrals:
    'id, childId, centerId, sourceId, sourceType, status, lastModifiedAt, _localStatus, deletedAt',
  village_cache: 'key',
} as const

/**
 * Dexie schema (version 4 — feeding days + month summaries).
 * Compound indexes enforce natural keys matching backend uniqueness.
 */
export const DEXIE_STORES_V4 = {
  meta: 'key',
  device: 'id, deviceUuid, userId',
  sync_operations:
    'clientOperationId, status, entityType, entityId, createdAt, sessionId',
  sync_sessions: 'sessionId, status, updatedAt',
  children: 'id, centerId, status, lastModifiedAt, _localStatus, deletedAt',
  attendance:
    'id, [childId+date], childId, centerId, date, lastModifiedAt, _localStatus, deletedAt',
  nutrition_screenings:
    'id, childId, centerId, screeningDate, lastModifiedAt, _localStatus, deletedAt, [childId+screeningDate]',
  referrals:
    'id, childId, centerId, sourceId, sourceType, status, lastModifiedAt, _localStatus, deletedAt',
  feeding_days:
    'id, [centerId+date], centerId, date, lastModifiedAt, _localStatus, deletedAt',
  feeding_month_summaries:
    'id, [centerId+yearMonth], centerId, yearMonth, lastModifiedAt, _localStatus, deletedAt',
  village_cache: 'key',
} as const

/**
 * Dexie schema (version 5 — STED assessments, append-only).
 * Compound [childId+assessmentDate] supports history queries (not uniqueness).
 */
export const DEXIE_STORES_V5 = {
  meta: 'key',
  device: 'id, deviceUuid, userId',
  sync_operations:
    'clientOperationId, status, entityType, entityId, createdAt, sessionId',
  sync_sessions: 'sessionId, status, updatedAt',
  children: 'id, centerId, status, lastModifiedAt, _localStatus, deletedAt',
  attendance:
    'id, [childId+date], childId, centerId, date, lastModifiedAt, _localStatus, deletedAt',
  nutrition_screenings:
    'id, childId, centerId, screeningDate, lastModifiedAt, _localStatus, deletedAt, [childId+screeningDate]',
  referrals:
    'id, childId, centerId, sourceId, sourceType, status, lastModifiedAt, _localStatus, deletedAt',
  feeding_days:
    'id, [centerId+date], centerId, date, lastModifiedAt, _localStatus, deletedAt',
  feeding_month_summaries:
    'id, [centerId+yearMonth], centerId, yearMonth, lastModifiedAt, _localStatus, deletedAt',
  sted_assessments:
    'id, childId, centerId, assessmentDate, lastModifiedAt, _localStatus, deletedAt, [childId+assessmentDate]',
  village_cache: 'key',
} as const

/**
 * Dexie schema (version 6 — outbox + session ownerUserId indexes).
 * Domain isolation is primarily via per-user DB names; ownerUserId is a hard guard.
 */
export const DEXIE_STORES = {
  meta: 'key',
  device: 'id, deviceUuid, userId',
  sync_operations:
    'clientOperationId, status, entityType, entityId, createdAt, sessionId, ownerUserId',
  sync_sessions: 'sessionId, status, updatedAt, ownerUserId',
  children: 'id, centerId, status, lastModifiedAt, _localStatus, deletedAt',
  attendance:
    'id, [childId+date], childId, centerId, date, lastModifiedAt, _localStatus, deletedAt',
  nutrition_screenings:
    'id, childId, centerId, screeningDate, lastModifiedAt, _localStatus, deletedAt, [childId+screeningDate]',
  referrals:
    'id, childId, centerId, sourceId, sourceType, status, lastModifiedAt, _localStatus, deletedAt',
  feeding_days:
    'id, [centerId+date], centerId, date, lastModifiedAt, _localStatus, deletedAt',
  feeding_month_summaries:
    'id, [centerId+yearMonth], centerId, yearMonth, lastModifiedAt, _localStatus, deletedAt',
  sted_assessments:
    'id, childId, centerId, assessmentDate, lastModifiedAt, _localStatus, deletedAt, [childId+assessmentDate]',
  village_cache: 'key',
} as const
