/** Local durable entity sync hygiene. */
export type LocalRecordStatus = 'clean' | 'dirty' | 'pending_delete'

/** Frontend outbox statuses (superset of server SyncOperationStatus). */
export type OutboxStatus =
  | 'pending'
  | 'blocked'
  | 'syncing'
  | 'applied'
  | 'conflict'
  | 'failed'

export type SyncableEntityType =
  | 'child'
  | 'attendance_record'
  | 'child_nutrition_screening'
  | 'child_transfer'
  | 'ecd_center'
  | 'compliance_assessment'
  | 'compliance_assessment_item'
  | 'wash_indicator'
  | 'center_feeding_day'
  | 'center_feeding_month_summary'
  | 'sted_assessment'
  | 'referral'

export type SyncOperationKind = 'create' | 'update' | 'delete'

export interface MetaRecord {
  key: string
  value: string
}

export interface DeviceRecord {
  id: string
  deviceUuid: string
  userId: string
  centerId?: string
  registeredAt: string
  lastSeenAt?: string
}

export interface SyncOperationRecord {
  clientOperationId: string
  entityType: SyncableEntityType
  operation: SyncOperationKind
  entityId: string
  localId?: string
  payload?: Record<string, unknown>
  version: number
  clientTimestamp: string
  status: OutboxStatus
  dependsOn: string[]
  attempts: number
  lastError?: string
  sessionId?: string
  /**
   * Authenticated user that created this outbox row.
   * Required for multi-account isolation — never push under another JWT.
   */
  ownerUserId: string
  createdAt: string
  updatedAt: string
}

export interface SyncSessionRecord {
  sessionId: string
  status: string
  createdAt: string
  updatedAt: string
  error?: string
  /** User that started this sync session (local isolation). */
  ownerUserId?: string
}

/** Durable child projection for offline PoC (Sprint 4.8.0). */
export interface LocalChildRecord {
  id: string
  version: number
  deletedAt: string | null
  lastModifiedAt: string
  _localStatus: LocalRecordStatus
  registrationNumber: string
  firstName: string
  middleName?: string | null
  lastName?: string | null
  fullName: string
  centerId: string
  centerName: string
  dateOfBirth: string
  gender: string
  status: 'active' | 'transferred' | 'archived'
  specialNeeds?: string
  guardianName: string
  guardianPhone: string
  guardianRelation: string
  guardian2Name?: string
  guardian2Phone?: string
  guardian2Relation?: string
  homeVillageId: string
  registeredAt: string
  province: string
  district: string
  sector: string
  cell: string
  village: string
  archivedAt?: string
  archiveReason?: string
  notes?: string
}

/**
 * Durable attendance projection (Sprint 4.8.1).
 * Natural key: childId + date (YYYY-MM-DD), matching backend @@unique([childId, attendanceDate]).
 *
 * broughtBy / broughtByOther / arrivedAt are stored on the server (Prisma + sync apply/pull)
 * but are omitted from REST Attendance DTOs — sync path is authoritative for those fields.
 */
export interface LocalAttendanceRecord {
  id: string
  childId: string
  centerId: string
  /** YYYY-MM-DD calendar date (maps to attendanceDate). */
  date: string
  present: boolean
  absentReason?: string | null
  notes?: string | null
  recordedBy: string
  broughtBy?: string | null
  broughtByOther?: string | null
  arrivedAt?: string | null
  version: number
  deletedAt: string | null
  lastModifiedAt: string
  _localStatus: LocalRecordStatus
  _updatedAtLocal: string
}

/**
 * Durable nutrition/growth screening projection (Sprint 4.8.2).
 * Shared entity for Growth + Nutrition — maps to child_nutrition_screening.
 * Append-only: multiple rows per child are legitimate history (no natural-key uniqueness).
 * centerId is a local convenience for filtering (not on the Prisma screening model).
 */
export interface LocalNutritionScreeningRecord {
  id: string
  childId: string
  /** Local filter aid — resolved from child/user at create; may be empty after pull. */
  centerId: string
  /** YYYY-MM-DD (maps to screeningDate). */
  screeningDate: string
  weightKg: number
  muacCm: number
  heightCm?: number | null
  headCircumferenceCm?: number | null
  /** Persisted server field (client-classified on create; not re-derived as sole source of truth). */
  nutritionStatus: string
  requiresReferral: boolean
  mealQuality?: string | null
  feedingConcern: boolean
  dietNotes?: string | null
  recordedById: string
  version: number
  deletedAt: string | null
  lastModifiedAt: string
  createdAt?: string | null
  _localStatus: LocalRecordStatus
  _updatedAtLocal: string
}

/**
 * Durable referral projection (Sprint 4.8.2 CREATE+pull; Sprint 4.8.5 full offline).
 * assessmentId (UI) maps to sourceId (API/sync).
 * Status UPDATE payload is restricted to status / notes / implementedAt (CAS).
 */
export interface LocalReferralRecord {
  id: string
  childId: string
  centerId: string
  sourceType: string
  sourceId: string
  referralDate: string
  reason: string
  destination: string
  status: string
  notes?: string | null
  implementedAt?: string | null
  recordedById: string
  version: number
  deletedAt: string | null
  lastModifiedAt: string
  lastModifiedByDeviceId?: string | null
  _localStatus: LocalRecordStatus
  _updatedAtLocal: string
}

/**
 * Durable daily feeding projection (Sprint 4.8.3).
 * Natural key: centerId + date (YYYY-MM-DD) ↔ backend @@unique([centerId, recordedDate]).
 * Food groups stored flat (Prisma/sync), nested as composition in UI view models.
 */
export interface LocalFeedingDayRecord {
  id: string
  centerId: string
  /** YYYY-MM-DD (maps to recordedDate). */
  date: string
  milkServed: boolean
  porridgeServed: boolean
  balancedMealServed: boolean
  cerealsOrTubers: boolean
  legumes: boolean
  dairy: boolean
  animalProducts: boolean
  fruitsVegetables: boolean
  addedFat: boolean
  /** Authenticated user UUID (sync recordedById). */
  recordedById: string
  version: number
  deletedAt: string | null
  lastModifiedAt: string
  _localStatus: LocalRecordStatus
  _updatedAtLocal: string
}

/**
 * Durable monthly feeding summary (Sprint 4.8.3).
 * Natural key: centerId + yearMonth (YYYY-MM) ↔ backend @@unique([centerId, yearMonth]).
 * Day counts are NOT stored — UI derives them from feeding days.
 */
export interface LocalFeedingMonthSummaryRecord {
  id: string
  centerId: string
  yearMonth: string
  milkLiters: number
  flourKg: number
  foodSource: string
  /** Authenticated user UUID (sync updatedById); optional on server. */
  updatedById: string | null
  version: number
  deletedAt: string | null
  lastModifiedAt: string
  _localStatus: LocalRecordStatus
  _updatedAtLocal: string
}

/**
 * Durable STED assessment projection (Sprint 4.8.4).
 * Append-only: multiple rows per child are legitimate history (no natural-key uniqueness).
 * Field names match sync/Prisma (physicalAssessment / milestoneResults).
 * referralReason / referralDestination are NOT stored here — they seed referral CREATE only.
 */
export interface LocalStedAssessmentRecord {
  id: string
  childId: string
  centerId: string
  /** YYYY-MM-DD */
  assessmentDate: string
  ageBand: string
  consentObtained: boolean
  physicalAssessment: Record<string, unknown>
  milestoneResults: Record<string, unknown>
  outcome: Record<string, unknown>
  followUpIn6Months: boolean
  followUpDueDate?: string | null
  notes?: string | null
  /** Authenticated user UUID (sync assessedById). */
  assessedById: string
  version: number
  deletedAt: string | null
  lastModifiedAt: string
  lastModifiedByDeviceId?: string | null
  _localStatus: LocalRecordStatus
  _updatedAtLocal: string
}

export interface VillageCacheRecord {
  /** district|sector|cell|village (normalized) */
  key: string
  homeVillageId: string
  updatedAt: string
}

export const META_KEYS = {
  schemaVersion: 'schemaVersion',
  userId: 'userId',
  centerId: 'centerId',
  deviceId: 'deviceId',
  deviceUuid: 'deviceUuid',
  lastPullCursor: 'lastPullCursor',
  lastPullCursorId: 'lastPullCursorId',
  lastSyncedAt: 'lastSyncedAt',
  hasLocalSnapshot: 'hasLocalSnapshot',
  /** Durable pointer to the currently bound local owner (cleared on logout). */
  activeOwnerUserId: 'activeOwnerUserId',
} as const

export type MetaKey = (typeof META_KEYS)[keyof typeof META_KEYS]

/** Sprint 4.8.6 — ownership / multi-account isolation. */
export const LOCAL_SCHEMA_VERSION = 6
