/**
 * Attendance domain feature module.
 *
 * LIVE path (Sprint 4.8.1):
 *   UI → repository → LocalStore (+ outbox) → SyncEngine → Nest sync API
 * React Query remains a projection/cache hydrated from LocalStore.
 *
 * MOCK path: unchanged in-memory MOCK_ATTENDANCE.
 */
export { useAttendanceList, useAttendanceWindow, useChildAttendance } from './queries'
export {
  useUpsertAttendance,
  useSoftDeleteAttendance,
  invalidateAttendanceQueries,
} from './mutations'
export { useAttendanceRepository } from './repository'
export {
  runAttendanceAutoAbsentIfDue,
  runMockAttendanceAutoAbsentIfDue,
  AUTO_ABSENT_REASON,
} from './auto-absent'
export { useAttendanceAutoAbsent } from './useAttendanceAutoAbsent'
export {
  upsertAttendanceLocalFirst,
  softDeleteAttendanceLocalFirst,
  listAttendanceFromLocal,
  localAttendanceToViewModel,
} from './local-attendance'
export { mapAttendanceListItemToLocalSeed } from './seed-from-rest'
export * from './mappers'
export type * from './models'
