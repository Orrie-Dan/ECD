import type {
  AttendanceListFilter,
  FeedingDayListFilter,
  FeedingMonthSummaryListFilter,
  LocalStore,
  LocalStoreTableName,
  OutboxEnqueueInput,
  PullCursor,
  ReferralListFilter,
  ScreeningListFilter,
  StedListFilter,
} from '@/storage/local-store'
import { getOfflineDb, type EcdOfflineDatabase } from '@/storage/db'
import {
  LOCAL_SCHEMA_VERSION,
  META_KEYS,
  type MetaKey,
  type OutboxStatus,
  type SyncOperationRecord,
  type DeviceRecord,
  type LocalAttendanceRecord,
  type LocalChildRecord,
  type LocalFeedingDayRecord,
  type LocalFeedingMonthSummaryRecord,
  type LocalNutritionScreeningRecord,
  type LocalReferralRecord,
  type LocalStedAssessmentRecord,
  type LocalRecordStatus,
  type SyncSessionRecord,
  type VillageCacheRecord,
} from '@/storage/types'
import {
  getActiveOwnerUserId,
  LEGACY_UNOWNED,
} from '@/storage/ownership'
import { rethrowAsLocalWriteError } from '@/storage/local-write-error'

/**
 * Dexie-backed LocalStore. Feature code imports LocalStore only.
 */
export class DexieLocalStore implements LocalStore {
  private db: EcdOfflineDatabase

  constructor(db: EcdOfflineDatabase = getOfflineDb()) {
    this.db = db
  }

  /** Rebind this store instance to another opened database (account switch). */
  useDatabase(db: EcdOfflineDatabase): void {
    this.db = db
  }

  getDatabase(): EcdOfflineDatabase {
    return this.db
  }

  private async resolveOwnerUserId(explicit?: string): Promise<string> {
    if (explicit) return explicit
    const active = getActiveOwnerUserId()
    if (active) return active
    const metaUser = await this.getMeta(META_KEYS.userId)
    if (metaUser) return metaUser
    return LEGACY_UNOWNED
  }

  async runTransaction<T>(
    tables: LocalStoreTableName[],
    mode: 'r' | 'rw',
    fn: (store: LocalStore) => Promise<T>,
  ): Promise<T> {
    const dexieTables = tables.map((name) => this.db.table(name))
    try {
      return await this.db.transaction(mode, dexieTables, async () => fn(this))
    } catch (err) {
      // Never report a successful local save when IndexedDB rejects the write.
      if (mode === 'rw') rethrowAsLocalWriteError(err)
      throw err
    }
  }

  async getMeta(key: MetaKey | string): Promise<string | null> {
    const row = await this.db.meta.get(key)
    return row?.value ?? null
  }

  async setMeta(key: MetaKey | string, value: string): Promise<void> {
    await this.db.meta.put({ key, value })
  }

  async deleteMeta(key: MetaKey | string): Promise<void> {
    await this.db.meta.delete(key)
  }

  async getPullCursor(): Promise<PullCursor> {
    const lastModifiedAt = await this.getMeta(META_KEYS.lastPullCursor)
    const id = await this.getMeta(META_KEYS.lastPullCursorId)
    return { lastModifiedAt, id }
  }

  async setPullCursor(cursor: PullCursor): Promise<void> {
    if (cursor.lastModifiedAt) {
      await this.setMeta(META_KEYS.lastPullCursor, cursor.lastModifiedAt)
    } else {
      await this.deleteMeta(META_KEYS.lastPullCursor)
    }
    if (cursor.id) {
      await this.setMeta(META_KEYS.lastPullCursorId, cursor.id)
    } else {
      await this.deleteMeta(META_KEYS.lastPullCursorId)
    }
  }

  async upsertDevice(device: DeviceRecord): Promise<void> {
    await this.db.device.put(device)
    await this.setMeta(META_KEYS.deviceId, device.id)
    await this.setMeta(META_KEYS.deviceUuid, device.deviceUuid)
    await this.setMeta(META_KEYS.userId, device.userId)
    if (device.centerId) {
      await this.setMeta(META_KEYS.centerId, device.centerId)
    }
  }

  async getDevice(): Promise<DeviceRecord | null> {
    const id = await this.getMeta(META_KEYS.deviceId)
    if (!id) {
      const all = await this.db.device.toArray()
      return all[0] ?? null
    }
    return (await this.db.device.get(id)) ?? null
  }

  /**
   * Upsert by clientOperationId. Retries reuse the same id and must not reset attempts
   * or createdAt when coalescing payload updates onto an existing outbox row.
   * ownerUserId is sticky — never silently rebind to another user on coalesce.
   */
  async enqueueOperation(input: OutboxEnqueueInput): Promise<SyncOperationRecord> {
    const now = new Date().toISOString()
    const existing = await this.getOperation(input.clientOperationId)
    const ownerUserId =
      existing?.ownerUserId && existing.ownerUserId !== LEGACY_UNOWNED
        ? existing.ownerUserId
        : await this.resolveOwnerUserId(input.ownerUserId)

    if (
      existing?.ownerUserId &&
      existing.ownerUserId !== LEGACY_UNOWNED &&
      input.ownerUserId &&
      input.ownerUserId !== existing.ownerUserId
    ) {
      throw new Error(
        `Refusing to rebind outbox operation ${input.clientOperationId} from ${existing.ownerUserId} to ${input.ownerUserId}`,
      )
    }

    const record: SyncOperationRecord = {
      clientOperationId: input.clientOperationId,
      entityType: input.entityType,
      operation: input.operation,
      entityId: input.entityId,
      localId: input.localId,
      payload: input.payload,
      version: input.version,
      clientTimestamp: input.clientTimestamp ?? existing?.clientTimestamp ?? now,
      status: input.status ?? 'pending',
      dependsOn: input.dependsOn ?? existing?.dependsOn ?? [],
      attempts: existing?.attempts ?? 0,
      lastError: input.lastError,
      sessionId: existing?.sessionId,
      ownerUserId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await this.db.sync_operations.put(record)
    return record
  }

  async getOperation(clientOperationId: string): Promise<SyncOperationRecord | null> {
    return (await this.db.sync_operations.get(clientOperationId)) ?? null
  }

  async listOperations(filter?: {
    status?: OutboxStatus | OutboxStatus[]
    ownerUserId?: string
    includeAllOwners?: boolean
  }): Promise<SyncOperationRecord[]> {
    let rows = await this.db.sync_operations.orderBy('createdAt').toArray()
    if (filter?.status) {
      const set = new Set(Array.isArray(filter.status) ? filter.status : [filter.status])
      rows = rows.filter((r) => set.has(r.status))
    }
    if (!filter?.includeAllOwners) {
      const owner =
        filter?.ownerUserId ?? getActiveOwnerUserId() ?? (await this.getMeta(META_KEYS.userId))
      if (owner) {
        rows = rows.filter((r) => r.ownerUserId === owner)
      }
    }
    return rows
  }

  async updateOperation(
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
  ): Promise<void> {
    const existing = await this.getOperation(clientOperationId)
    if (!existing) return
    // Never silently rebind a concrete owner to a different user.
    if (
      patch.ownerUserId &&
      existing.ownerUserId &&
      existing.ownerUserId !== LEGACY_UNOWNED &&
      patch.ownerUserId !== existing.ownerUserId
    ) {
      throw new Error(
        `Refusing to rebind outbox operation ${clientOperationId} from ${existing.ownerUserId} to ${patch.ownerUserId}`,
      )
    }
    await this.db.sync_operations.put({
      ...existing,
      ...patch,
      updatedAt: patch.updatedAt ?? new Date().toISOString(),
    })
  }

  async countOperations(
    statuses: OutboxStatus[],
    filter?: { ownerUserId?: string },
  ): Promise<number> {
    const set = new Set(statuses)
    const owner =
      filter?.ownerUserId ?? getActiveOwnerUserId() ?? (await this.getMeta(META_KEYS.userId))
    return this.db.sync_operations
      .filter((r) => {
        if (!set.has(r.status)) return false
        if (owner && r.ownerUserId !== owner) return false
        return true
      })
      .count()
  }

  async upsertSession(session: SyncSessionRecord): Promise<void> {
    const ownerUserId =
      session.ownerUserId ?? getActiveOwnerUserId() ?? (await this.getMeta(META_KEYS.userId)) ?? undefined
    await this.db.sync_sessions.put({ ...session, ownerUserId })
  }

  async getSession(sessionId: string): Promise<SyncSessionRecord | null> {
    return (await this.db.sync_sessions.get(sessionId)) ?? null
  }

  async putChild(child: LocalChildRecord): Promise<void> {
    await this.db.children.put(child)
  }

  async putChildren(children: LocalChildRecord[]): Promise<void> {
    await this.db.children.bulkPut(children)
  }

  async getChild(id: string): Promise<LocalChildRecord | null> {
    return (await this.db.children.get(id)) ?? null
  }

  async listChildren(filter?: {
    centerId?: string
    includeDeleted?: boolean
  }): Promise<LocalChildRecord[]> {
    let rows: LocalChildRecord[]
    if (filter?.centerId) {
      rows = await this.db.children.where('centerId').equals(filter.centerId).toArray()
    } else {
      rows = await this.db.children.toArray()
    }
    if (!filter?.includeDeleted) {
      rows = rows.filter((r) => !r.deletedAt)
    }
    return rows.sort((a, b) => a.fullName.localeCompare(b.fullName))
  }

  async markChildClean(id: string, version?: number): Promise<void> {
    const existing = await this.getChild(id)
    if (!existing) return
    await this.db.children.put({
      ...existing,
      _localStatus: 'clean',
      ...(typeof version === 'number' ? { version } : {}),
    })
  }

  async softDeleteChild(
    id: string,
    deletedAt: string,
    localStatus: LocalRecordStatus = 'clean',
  ): Promise<void> {
    const existing = await this.getChild(id)
    if (!existing) return
    await this.db.children.put({
      ...existing,
      deletedAt,
      _localStatus: localStatus,
    })
  }

  async putAttendance(row: LocalAttendanceRecord): Promise<void> {
    await this.db.attendance.put(row)
  }

  async putAttendances(rows: LocalAttendanceRecord[]): Promise<void> {
    await this.db.attendance.bulkPut(rows)
  }

  async getAttendance(id: string): Promise<LocalAttendanceRecord | null> {
    return (await this.db.attendance.get(id)) ?? null
  }

  async getAttendanceByNaturalKey(
    childId: string,
    date: string,
  ): Promise<LocalAttendanceRecord | null> {
    return (
      (await this.db.attendance.where('[childId+date]').equals([childId, date]).first()) ?? null
    )
  }

  async listAttendance(filter?: AttendanceListFilter): Promise<LocalAttendanceRecord[]> {
    let rows: LocalAttendanceRecord[]
    if (filter?.childId) {
      rows = await this.db.attendance.where('childId').equals(filter.childId).toArray()
    } else if (filter?.centerId) {
      rows = await this.db.attendance.where('centerId').equals(filter.centerId).toArray()
    } else {
      rows = await this.db.attendance.toArray()
    }

    if (!filter?.includeDeleted) {
      rows = rows.filter((r) => !r.deletedAt && r._localStatus !== 'pending_delete')
    }
    if (filter?.startDate) {
      rows = rows.filter((r) => r.date >= filter.startDate!)
    }
    if (filter?.endDate) {
      rows = rows.filter((r) => r.date <= filter.endDate!)
    }
    return rows.sort((a, b) => {
      const byDate = b.date.localeCompare(a.date)
      if (byDate !== 0) return byDate
      return a.childId.localeCompare(b.childId)
    })
  }

  async markAttendanceClean(id: string, version?: number): Promise<void> {
    const existing = await this.getAttendance(id)
    if (!existing) return
    await this.db.attendance.put({
      ...existing,
      _localStatus: 'clean',
      _updatedAtLocal: new Date().toISOString(),
      ...(typeof version === 'number' ? { version } : {}),
    })
  }

  async softDeleteAttendance(
    id: string,
    deletedAt: string,
    localStatus: LocalRecordStatus = 'clean',
  ): Promise<void> {
    const existing = await this.getAttendance(id)
    if (!existing) return
    await this.db.attendance.put({
      ...existing,
      deletedAt,
      _localStatus: localStatus,
      _updatedAtLocal: new Date().toISOString(),
    })
  }

  async putNutritionScreening(row: LocalNutritionScreeningRecord): Promise<void> {
    await this.db.nutrition_screenings.put(row)
  }

  async putNutritionScreenings(rows: LocalNutritionScreeningRecord[]): Promise<void> {
    await this.db.nutrition_screenings.bulkPut(rows)
  }

  async getNutritionScreening(id: string): Promise<LocalNutritionScreeningRecord | null> {
    return (await this.db.nutrition_screenings.get(id)) ?? null
  }

  async listNutritionScreenings(
    filter?: ScreeningListFilter,
  ): Promise<LocalNutritionScreeningRecord[]> {
    let rows: LocalNutritionScreeningRecord[]
    if (filter?.childId) {
      rows = await this.db.nutrition_screenings.where('childId').equals(filter.childId).toArray()
    } else if (filter?.centerId) {
      rows = await this.db.nutrition_screenings.where('centerId').equals(filter.centerId).toArray()
    } else {
      rows = await this.db.nutrition_screenings.toArray()
    }

    if (!filter?.includeDeleted) {
      rows = rows.filter((r) => !r.deletedAt && r._localStatus !== 'pending_delete')
    }
    if (filter?.startDate) {
      rows = rows.filter((r) => r.screeningDate >= filter.startDate!)
    }
    if (filter?.endDate) {
      rows = rows.filter((r) => r.screeningDate <= filter.endDate!)
    }
    // Newest first — matches REST nutrition history.
    return rows.sort((a, b) => {
      const byDate = b.screeningDate.localeCompare(a.screeningDate)
      if (byDate !== 0) return byDate
      return b.id.localeCompare(a.id)
    })
  }

  async markNutritionScreeningClean(id: string, version?: number): Promise<void> {
    const existing = await this.getNutritionScreening(id)
    if (!existing) return
    await this.db.nutrition_screenings.put({
      ...existing,
      _localStatus: 'clean',
      _updatedAtLocal: new Date().toISOString(),
      ...(typeof version === 'number' ? { version } : {}),
    })
  }

  async softDeleteNutritionScreening(
    id: string,
    deletedAt: string,
    localStatus: LocalRecordStatus = 'clean',
  ): Promise<void> {
    const existing = await this.getNutritionScreening(id)
    if (!existing) return
    await this.db.nutrition_screenings.put({
      ...existing,
      deletedAt,
      _localStatus: localStatus,
      _updatedAtLocal: new Date().toISOString(),
    })
  }

  async putReferral(row: LocalReferralRecord): Promise<void> {
    await this.db.referrals.put(row)
  }

  async putReferrals(rows: LocalReferralRecord[]): Promise<void> {
    await this.db.referrals.bulkPut(rows)
  }

  async getReferral(id: string): Promise<LocalReferralRecord | null> {
    return (await this.db.referrals.get(id)) ?? null
  }

  async getReferralBySourceId(sourceId: string): Promise<LocalReferralRecord | null> {
    const rows = await this.db.referrals.where('sourceId').equals(sourceId).toArray()
    const active = rows.filter((r) => !r.deletedAt && r._localStatus !== 'pending_delete')
    return active[0] ?? null
  }

  async listReferrals(filter?: ReferralListFilter): Promise<LocalReferralRecord[]> {
    let rows: LocalReferralRecord[]
    if (filter?.sourceId) {
      rows = await this.db.referrals.where('sourceId').equals(filter.sourceId).toArray()
    } else if (filter?.childId) {
      rows = await this.db.referrals.where('childId').equals(filter.childId).toArray()
    } else if (filter?.centerId) {
      rows = await this.db.referrals.where('centerId').equals(filter.centerId).toArray()
    } else {
      rows = await this.db.referrals.toArray()
    }

    if (!filter?.includeDeleted) {
      rows = rows.filter((r) => !r.deletedAt && r._localStatus !== 'pending_delete')
    }
    return rows.sort((a, b) => b.referralDate.localeCompare(a.referralDate))
  }

  async markReferralClean(id: string, version?: number): Promise<void> {
    const existing = await this.getReferral(id)
    if (!existing) return
    await this.db.referrals.put({
      ...existing,
      _localStatus: 'clean',
      _updatedAtLocal: new Date().toISOString(),
      ...(typeof version === 'number' ? { version } : {}),
    })
  }

  async softDeleteReferral(
    id: string,
    deletedAt: string,
    localStatus: LocalRecordStatus = 'clean',
  ): Promise<void> {
    const existing = await this.getReferral(id)
    if (!existing) return
    await this.db.referrals.put({
      ...existing,
      deletedAt,
      _localStatus: localStatus,
      _updatedAtLocal: new Date().toISOString(),
    })
  }

  async putFeedingDay(row: LocalFeedingDayRecord): Promise<void> {
    await this.db.feeding_days.put(row)
  }

  async putFeedingDays(rows: LocalFeedingDayRecord[]): Promise<void> {
    await this.db.feeding_days.bulkPut(rows)
  }

  async getFeedingDay(id: string): Promise<LocalFeedingDayRecord | null> {
    return (await this.db.feeding_days.get(id)) ?? null
  }

  async getFeedingDayByNaturalKey(
    centerId: string,
    date: string,
  ): Promise<LocalFeedingDayRecord | null> {
    return (
      (await this.db.feeding_days.where('[centerId+date]').equals([centerId, date]).first()) ??
      null
    )
  }

  async listFeedingDays(filter?: FeedingDayListFilter): Promise<LocalFeedingDayRecord[]> {
    let rows: LocalFeedingDayRecord[]
    if (filter?.centerId) {
      rows = await this.db.feeding_days.where('centerId').equals(filter.centerId).toArray()
    } else {
      rows = await this.db.feeding_days.toArray()
    }

    if (!filter?.includeDeleted) {
      rows = rows.filter((r) => !r.deletedAt && r._localStatus !== 'pending_delete')
    }
    if (filter?.yearMonth) {
      rows = rows.filter((r) => r.date.startsWith(filter.yearMonth!))
    }
    if (filter?.startDate) {
      rows = rows.filter((r) => r.date >= filter.startDate!)
    }
    if (filter?.endDate) {
      rows = rows.filter((r) => r.date <= filter.endDate!)
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date))
  }

  async markFeedingDayClean(id: string, version?: number): Promise<void> {
    const existing = await this.getFeedingDay(id)
    if (!existing) return
    await this.db.feeding_days.put({
      ...existing,
      _localStatus: 'clean',
      _updatedAtLocal: new Date().toISOString(),
      ...(typeof version === 'number' ? { version } : {}),
    })
  }

  async softDeleteFeedingDay(
    id: string,
    deletedAt: string,
    localStatus: LocalRecordStatus = 'clean',
  ): Promise<void> {
    const existing = await this.getFeedingDay(id)
    if (!existing) return
    await this.db.feeding_days.put({
      ...existing,
      deletedAt,
      _localStatus: localStatus,
      _updatedAtLocal: new Date().toISOString(),
    })
  }

  async putFeedingMonthSummary(row: LocalFeedingMonthSummaryRecord): Promise<void> {
    await this.db.feeding_month_summaries.put(row)
  }

  async putFeedingMonthSummaries(rows: LocalFeedingMonthSummaryRecord[]): Promise<void> {
    await this.db.feeding_month_summaries.bulkPut(rows)
  }

  async getFeedingMonthSummary(id: string): Promise<LocalFeedingMonthSummaryRecord | null> {
    return (await this.db.feeding_month_summaries.get(id)) ?? null
  }

  async getFeedingMonthSummaryByNaturalKey(
    centerId: string,
    yearMonth: string,
  ): Promise<LocalFeedingMonthSummaryRecord | null> {
    return (
      (await this.db.feeding_month_summaries
        .where('[centerId+yearMonth]')
        .equals([centerId, yearMonth])
        .first()) ?? null
    )
  }

  async listFeedingMonthSummaries(
    filter?: FeedingMonthSummaryListFilter,
  ): Promise<LocalFeedingMonthSummaryRecord[]> {
    let rows: LocalFeedingMonthSummaryRecord[]
    if (filter?.centerId) {
      rows = await this.db.feeding_month_summaries
        .where('centerId')
        .equals(filter.centerId)
        .toArray()
    } else {
      rows = await this.db.feeding_month_summaries.toArray()
    }

    if (!filter?.includeDeleted) {
      rows = rows.filter((r) => !r.deletedAt && r._localStatus !== 'pending_delete')
    }
    if (filter?.yearMonth) {
      rows = rows.filter((r) => r.yearMonth === filter.yearMonth)
    }
    return rows.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
  }

  async markFeedingMonthSummaryClean(id: string, version?: number): Promise<void> {
    const existing = await this.getFeedingMonthSummary(id)
    if (!existing) return
    await this.db.feeding_month_summaries.put({
      ...existing,
      _localStatus: 'clean',
      _updatedAtLocal: new Date().toISOString(),
      ...(typeof version === 'number' ? { version } : {}),
    })
  }

  async softDeleteFeedingMonthSummary(
    id: string,
    deletedAt: string,
    localStatus: LocalRecordStatus = 'clean',
  ): Promise<void> {
    const existing = await this.getFeedingMonthSummary(id)
    if (!existing) return
    await this.db.feeding_month_summaries.put({
      ...existing,
      deletedAt,
      _localStatus: localStatus,
      _updatedAtLocal: new Date().toISOString(),
    })
  }

  async putStedAssessment(row: LocalStedAssessmentRecord): Promise<void> {
    await this.db.sted_assessments.put(row)
  }

  async putStedAssessments(rows: LocalStedAssessmentRecord[]): Promise<void> {
    await this.db.sted_assessments.bulkPut(rows)
  }

  async getStedAssessment(id: string): Promise<LocalStedAssessmentRecord | null> {
    return (await this.db.sted_assessments.get(id)) ?? null
  }

  async listStedAssessments(
    filter?: StedListFilter,
  ): Promise<LocalStedAssessmentRecord[]> {
    let rows: LocalStedAssessmentRecord[]
    if (filter?.childId) {
      rows = await this.db.sted_assessments.where('childId').equals(filter.childId).toArray()
    } else if (filter?.centerId) {
      rows = await this.db.sted_assessments.where('centerId').equals(filter.centerId).toArray()
    } else {
      rows = await this.db.sted_assessments.toArray()
    }

    if (!filter?.includeDeleted) {
      rows = rows.filter((r) => !r.deletedAt && r._localStatus !== 'pending_delete')
    }
    if (filter?.startDate) {
      rows = rows.filter((r) => r.assessmentDate >= filter.startDate!)
    }
    if (filter?.endDate) {
      rows = rows.filter((r) => r.assessmentDate <= filter.endDate!)
    }
    // Newest first — matches REST STED history.
    return rows.sort((a, b) => {
      const byDate = b.assessmentDate.localeCompare(a.assessmentDate)
      if (byDate !== 0) return byDate
      return b.id.localeCompare(a.id)
    })
  }

  async markStedAssessmentClean(id: string, version?: number): Promise<void> {
    const existing = await this.getStedAssessment(id)
    if (!existing) return
    await this.db.sted_assessments.put({
      ...existing,
      _localStatus: 'clean',
      _updatedAtLocal: new Date().toISOString(),
      ...(typeof version === 'number' ? { version } : {}),
    })
  }

  async softDeleteStedAssessment(
    id: string,
    deletedAt: string,
    localStatus: LocalRecordStatus = 'clean',
  ): Promise<void> {
    const existing = await this.getStedAssessment(id)
    if (!existing) return
    await this.db.sted_assessments.put({
      ...existing,
      deletedAt,
      _localStatus: localStatus,
      _updatedAtLocal: new Date().toISOString(),
    })
  }

  async getVillageCache(key: string): Promise<VillageCacheRecord | null> {
    return (await this.db.village_cache.get(key)) ?? null
  }

  async putVillageCache(record: VillageCacheRecord): Promise<void> {
    await this.db.village_cache.put(record)
  }

  async clearAllDomainData(): Promise<void> {
    await this.db.transaction(
      'rw',
      [
        this.db.meta,
        this.db.device,
        this.db.sync_operations,
        this.db.sync_sessions,
        this.db.children,
        this.db.attendance,
        this.db.nutrition_screenings,
        this.db.referrals,
        this.db.feeding_days,
        this.db.feeding_month_summaries,
        this.db.sted_assessments,
        this.db.village_cache,
      ],
      async () => {
        await Promise.all([
          this.db.meta.clear(),
          this.db.device.clear(),
          this.db.sync_operations.clear(),
          this.db.sync_sessions.clear(),
          this.db.children.clear(),
          this.db.attendance.clear(),
          this.db.nutrition_screenings.clear(),
          this.db.referrals.clear(),
          this.db.feeding_days.clear(),
          this.db.feeding_month_summaries.clear(),
          this.db.sted_assessments.clear(),
          this.db.village_cache.clear(),
        ])
      },
    )
  }

  /**
   * Scoped wipe for the current user workspace.
   * Clears domain + outbox + sync sessions + user sync meta.
   * Preserves device registration rows when they belong to the shared device identity,
   * and preserves schemaVersion.
   */
  async clearUserLocalData(userId: string): Promise<void> {
    const schemaVersion = await this.getMeta(META_KEYS.schemaVersion)
    const deviceId = await this.getMeta(META_KEYS.deviceId)
    const deviceUuid = await this.getMeta(META_KEYS.deviceUuid)
    const device = await this.getDevice()

    await this.db.transaction(
      'rw',
      [
        this.db.meta,
        this.db.device,
        this.db.sync_operations,
        this.db.sync_sessions,
        this.db.children,
        this.db.attendance,
        this.db.nutrition_screenings,
        this.db.referrals,
        this.db.feeding_days,
        this.db.feeding_month_summaries,
        this.db.sted_assessments,
        this.db.village_cache,
      ],
      async () => {
        await Promise.all([
          this.db.sync_operations.clear(),
          this.db.sync_sessions.clear(),
          this.db.children.clear(),
          this.db.attendance.clear(),
          this.db.nutrition_screenings.clear(),
          this.db.referrals.clear(),
          this.db.feeding_days.clear(),
          this.db.feeding_month_summaries.clear(),
          this.db.sted_assessments.clear(),
          this.db.village_cache.clear(),
          this.db.meta.clear(),
          this.db.device.clear(),
        ])
      },
    )

    if (schemaVersion) {
      await this.setMeta(META_KEYS.schemaVersion, schemaVersion)
    } else {
      await this.setMeta(META_KEYS.schemaVersion, String(LOCAL_SCHEMA_VERSION))
    }

    // Restore shared device binding into this workspace (registry id stays in localStorage).
    if (device && deviceId && deviceUuid) {
      await this.upsertDevice({
        ...device,
        id: deviceId,
        deviceUuid,
        userId,
      })
    } else {
      await this.setMeta(META_KEYS.userId, userId)
      if (deviceId) await this.setMeta(META_KEYS.deviceId, deviceId)
      if (deviceUuid) await this.setMeta(META_KEYS.deviceUuid, deviceUuid)
    }
  }
}

let storeSingleton: DexieLocalStore | null = null

export function getLocalStore(): LocalStore {
  if (!storeSingleton) {
    storeSingleton = new DexieLocalStore()
  }
  return storeSingleton
}

export function getDexieLocalStore(): DexieLocalStore {
  return getLocalStore() as DexieLocalStore
}

/** Ensure schema version meta is written once / upgraded when LOCAL_SCHEMA_VERSION bumps. */
export async function ensureLocalStoreInitialized(store: LocalStore = getLocalStore()): Promise<void> {
  const version = await store.getMeta(META_KEYS.schemaVersion)
  const expected = String(LOCAL_SCHEMA_VERSION)
  if (version !== expected) {
    await store.setMeta(META_KEYS.schemaVersion, expected)
  }
}

/** Test helper. */
export function resetLocalStoreForTests(db?: EcdOfflineDatabase): LocalStore {
  storeSingleton = new DexieLocalStore(db ?? getOfflineDb())
  return storeSingleton
}

/** Rebind singleton store to an already-opened database (account switch). */
export function rebindLocalStore(db: EcdOfflineDatabase): LocalStore {
  if (!storeSingleton) {
    storeSingleton = new DexieLocalStore(db)
  } else {
    storeSingleton.useDatabase(db)
  }
  return storeSingleton
}
