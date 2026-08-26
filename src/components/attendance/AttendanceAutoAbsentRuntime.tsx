import { useAttendanceAutoAbsent } from '@/features/attendance/useAttendanceAutoAbsent'

/** Headless runtime that closes the attendance day after cutoff. */
export function AttendanceAutoAbsentRuntime() {
  useAttendanceAutoAbsent()
  return null
}
