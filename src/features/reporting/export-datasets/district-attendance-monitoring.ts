import type { CenterDailyAttendanceRow } from '@/lib/district-attendance'
import { district } from '@/locales/rw/district'
import type { ScopedMonitoringExportInput } from './types'

export interface DistrictAttendanceMonitoringExportRow {
  date: string
  centerName: string
  sector: string | null
  registeredChildren: number
  present: number
  absent: number
  attendanceRate: number
}

export interface DistrictAttendanceMonitoringExportDataset {
  input: ScopedMonitoringExportInput
  rows: DistrictAttendanceMonitoringExportRow[]
}

export function mapCenterDailyRowsToExport(
  rows: CenterDailyAttendanceRow[],
  date: string,
  includeSector: boolean,
): DistrictAttendanceMonitoringExportRow[] {
  return rows.map((row) => ({
    date,
    centerName: row.center.name,
    sector: includeSector ? row.center.sector || '—' : null,
    registeredChildren: row.childrenCount,
    present: row.present,
    absent: row.absent,
    attendanceRate: row.rate,
  }))
}

export function districtAttendanceMonitoringExportAvailable(
  rows: DistrictAttendanceMonitoringExportRow[],
): boolean {
  return rows.length > 0
}

export function districtAttendanceMonitoringFilenamePrefix(): string {
  return 'ubwitabire'
}

export function districtAttendanceMonitoringTitle(): string {
  return district.attendanceMonitoring.title
}
