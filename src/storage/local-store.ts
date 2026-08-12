import type {
  DeviceRecord,
  LocalAttendanceRecord,
  LocalChildRecord,
  LocalFeedingDayRecord,
  LocalFeedingMonthSummaryRecord,
  LocalNutritionScreeningRecord,
  LocalReferralRecord,
  LocalStedAssessmentRecord,
  LocalRecordStatus,
  MetaKey,
  SyncOperationRecord,
  SyncSessionRecord,
  VillageCacheRecord,
  OutboxStatus,
} from '@/storage/types'

export interface PullCursor {
  lastModifiedAt: string | null
  id: string | null
}

export interface OutboxEnqueueInput {
  clientOperationId: string
  entityType: SyncOperationRecord['entityType']
  operation: SyncOperationRecord['operation']
  entityId: string
  localId?: string
  payload?: Record<string, unknown>
  version: number
  clientTimestamp?: string
  status?: OutboxStatus
  dependsOn?: string[]
  lastError?: string
  /** Authenticated owner; defaults to active local owner when omitted. */
  ownerUserId?: string
}

export type LocalStoreTableName =
  | 'meta'
  | 'device'
  | 'sync_operations'
  | 'sync_sessions'
  | 'children'
  | 'attendance'
  | 'nutrition_screenings'
  | 'referrals'
  | 'feeding_days'
  | 'feeding_month_summaries'
  | 'sted_assessments'
  | 'village_cache'

export interface AttendanceListFilter {
  centerId?: string
  childId?: string
  startDate?: string
  endDate?: string
  includeDeleted?: boolean
}

export interface ScreeningListFilter {
  centerId?: string
  childId?: string
  /** Inclusive YYYY-MM-DD lower bound on screeningDate. */
  startDate?: string
  /** Inclusive YYYY-MM-DD upper bound on screeningDate. */
  endDate?: string
  includeDeleted?: boolean
}

export interface ReferralListFilter {
  centerId?: string
  childId?: string
  sourceId?: string
  includeDeleted?: boolean
}

export interface FeedingDayListFilter {
  centerId?: string
  startDate?: string
  endDate?: string
  yearMonth?: string
  includeDeleted?: boolean
}

export interface FeedingMonthSummaryListFilter {
  centerId?: string
  yearMonth?: string
  includeDeleted?: boolean
}

export interface StedListFilter {
  centerId?: string
  childId?: string
  /** Inclusive YYYY-MM-DD lower bound on assessmentDate. */
  startDate?: string
  /** Inclusive YYYY-MM-DD upper bound on assessmentDate. */
  endDate?: string
  includeDeleted?: boolean
}

/**
 * Platform-agnostic durable store.
 * Dexie implements this on web; a future RN adapter can replace it.
 */
export interface LocalStore {
  /** Run multiple mutations in one IndexedDB transaction. */
  runTransaction<T>(
    tables: LocalStoreTableName[],
    mode: 'r' | 'rw',
    fn: (store: LocalStore) => Promise<T>,
  ): Promise<T>

  getMeta(key: MetaKey | string): Promise<string | null>
  setMeta(key: MetaKey | string, value: string): Promise<void>
  deleteMeta(key: MetaKey | string): Promise<void>

  getPullCursor(): Promise<PullCursor>
  setPullCursor(cursor: PullCursor): Promise<void>

  upsertDevice(device: DeviceRecord): Promise<void>
  getDevice(): Promise<DeviceRecord | null>

  enqueueOperation(input: OutboxEnqueueInput): Promise<SyncOperationRecord>
  getOperation(clientOperationId: string): Promise<SyncOperationRecord | null>
  listOperations(filter?: {
    status?: OutboxStatus | OutboxStatus[]
    ownerUserId?: string
    /** When true, skip active-owner filtering (admin/migration only). */
    includeAllOwners?: boolean
  }): Promise<SyncOperationRecord[]>
  updateOperation(
    clientOperationId: string,
    patch: Partial<
      Pick<
        SyncOperationRecord,
        | 'status'
        | 'attempts'
        | 'lastError'
        | 'sessionId'
        | 'payload'
        | 'version'
        | 'dependsOn'
        | 'updatedAt'
        | 'operation'
        | 'ownerUserId'
        | 'entityId'
        | 'localId'
      >
    >,
  ): Promise<void>
  countOperations(
    statuses: OutboxStatus[],
    filter?: { ownerUserId?: string },
  ): Promise<number>

  upsertSession(session: SyncSessionRecord): Promise<void>
  getSession(sessionId: string): Promise<SyncSessionRecord | null>

  putChild(child: LocalChildRecord): Promise<void>
  putChildren(children: LocalChildRecord[]): Promise<void>
  getChild(id: string): Promise<LocalChildRecord | null>
  listChildren(filter?: { centerId?: string; includeDeleted?: boolean }): Promise<LocalChildRecord[]>
  markChildClean(id: string, version?: number): Promise<void>
  softDeleteChild(
    id: string,
    deletedAt: string,
    localStatus?: LocalRecordStatus,
  ): Promise<void>

  putAttendance(row: LocalAttendanceRecord): Promise<void>
  putAttendances(rows: LocalAttendanceRecord[]): Promise<void>
  getAttendance(id: string): Promise<LocalAttendanceRecord | null>
  getAttendanceByNaturalKey(
    childId: string,
    date: string,
  ): Promise<LocalAttendanceRecord | null>
  listAttendance(filter?: AttendanceListFilter): Promise<LocalAttendanceRecord[]>
  markAttendanceClean(id: string, version?: number): Promise<void>
  softDeleteAttendance(
    id: string,
    deletedAt: string,
    localStatus?: LocalRecordStatus,
  ): Promise<void>

  putNutritionScreening(row: LocalNutritionScreeningRecord): Promise<void>
  putNutritionScreenings(rows: LocalNutritionScreeningRecord[]): Promise<void>
  getNutritionScreening(id: string): Promise<LocalNutritionScreeningRecord | null>
  listNutritionScreenings(
    filter?: ScreeningListFilter,
  ): Promise<LocalNutritionScreeningRecord[]>
  markNutritionScreeningClean(id: string, version?: number): Promise<void>
  softDeleteNutritionScreening(
    id: string,
    deletedAt: string,
    localStatus?: LocalRecordStatus,
  ): Promise<void>

  putReferral(row: LocalReferralRecord): Promise<void>
  putReferrals(rows: LocalReferralRecord[]): Promise<void>
  getReferral(id: string): Promise<LocalReferralRecord | null>
  getReferralBySourceId(sourceId: string): Promise<LocalReferralRecord | null>
  listReferrals(filter?: ReferralListFilter): Promise<LocalReferralRecord[]>
  markReferralClean(id: string, version?: number): Promise<void>
  softDeleteReferral(
    id: string,
    deletedAt: string,
    localStatus?: LocalRecordStatus,
  ): Promise<void>

  putFeedingDay(row: LocalFeedingDayRecord): Promise<void>
  putFeedingDays(rows: LocalFeedingDayRecord[]): Promise<void>
  getFeedingDay(id: string): Promise<LocalFeedingDayRecord | null>
  getFeedingDayByNaturalKey(
    centerId: string,
    date: string,
  ): Promise<LocalFeedingDayRecord | null>
  listFeedingDays(filter?: FeedingDayListFilter): Promise<LocalFeedingDayRecord[]>
  markFeedingDayClean(id: string, version?: number): Promise<void>
  softDeleteFeedingDay(
    id: string,
    deletedAt: string,
    localStatus?: LocalRecordStatus,
  ): Promise<void>

  putFeedingMonthSummary(row: LocalFeedingMonthSummaryRecord): Promise<void>
  putFeedingMonthSummaries(rows: LocalFeedingMonthSummaryRecord[]): Promise<void>
  getFeedingMonthSummary(id: string): Promise<LocalFeedingMonthSummaryRecord | null>
  getFeedingMonthSummaryByNaturalKey(
    centerId: string,
    yearMonth: string,
  ): Promise<LocalFeedingMonthSummaryRecord | null>
  listFeedingMonthSummaries(
    filter?: FeedingMonthSummaryListFilter,
  ): Promise<LocalFeedingMonthSummaryRecord[]>
  markFeedingMonthSummaryClean(id: string, version?: number): Promise<void>
  softDeleteFeedingMonthSummary(
    id: string,
    deletedAt: string,
    localStatus?: LocalRecordStatus,
  ): Promise<void>

  putStedAssessment(row: LocalStedAssessmentRecord): Promise<void>
  putStedAssessments(rows: LocalStedAssessmentRecord[]): Promise<void>
  getStedAssessment(id: string): Promise<LocalStedAssessmentRecord | null>
  listStedAssessments(filter?: StedListFilter): Promise<LocalStedAssessmentRecord[]>
  markStedAssessmentClean(id: string, version?: number): Promise<void>
  softDeleteStedAssessment(
    id: string,
    deletedAt: string,
    localStatus?: LocalRecordStatus,
  ): Promise<void>

  getVillageCache(key: string): Promise<VillageCacheRecord | null>
  putVillageCache(record: VillageCacheRecord): Promise<void>

  /**
   * Wipe all offline domain + outbox data in the *current* database.
   * Prefer clearUserLocalData(userId) for multi-account discard.
   */
  clearAllDomainData(): Promise<void>

  /** Scoped wipe for one user's workspace (current DB must belong to that user). */
  clearUserLocalData(userId: string): Promise<void>
}
