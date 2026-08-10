import type { AbsentReason, AttendanceRecord, BroughtBy } from '@/types'

/**
 * UI-facing attendance model.
 * Extends existing `AttendanceRecord` with API-only fields (optimistic lock + center).
 * Components continue to consume `AttendanceRecord`; feature hooks expose `AttendanceViewModel`.
 *
 * Field persistence (Sprint 4.8.1):
 * - REST Attendance DTOs: present/absentReason/notes/version/… (no broughtBy/arrivedAt)
 * - Sync + Prisma: broughtBy / broughtByOther / arrivedAt ARE server fields via SyncEngine
 * - MOCK: all fields in-memory only
 */
export interface AttendanceViewModel extends AttendanceRecord {
  /** Optimistic-lock version from the API (required for LIVE update/delete). */
  version: number
  centerId: string
}

export interface AttendanceListResult {
  items: AttendanceViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AttendanceListFilters {
  centerId?: string
  childId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export type AttendanceUpsertInput = Omit<AttendanceRecord, 'id'> & {
  version?: number
  centerId?: string
  broughtBy?: BroughtBy
  broughtByOther?: string
  arrivedAt?: string
  absentReason?: AbsentReason
}
