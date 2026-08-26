import { caretaker } from '@/locales/rw/caretaker'
import { common, relations } from '@/locales/rw/common'
import {
  formatArrivalTime,
  getAbsentReasonLabel,
  getBroughtByLabel,
  type AttendanceSummaryStats,
} from '@/lib/attendance-utils'
import { formatRecordedByLabel } from '@/lib/user-display'
import type { ExcelMetadataRow, ExcelSheetSpec, ExcelWorkbookSpec } from '@/lib/export'
import type { AttendanceDayStatus, AttendanceRecord, Child, User } from '@/types'

export interface AttendanceExportFilter {
  label: string
  value: string
}

export interface AttendanceExportRow {
  childName: string
  guardianName?: string
  date?: string
  statusLabel: string
  arrivalTime: string
  reason: string
  recordedBy?: string
}

export interface AttendanceExportInput {
  title: string
  centerName?: string
  classroomLabel?: string
  dateFrom: string
  dateTo: string
  generatedAt?: Date
  isMock: boolean
  filters?: AttendanceExportFilter[]
  summary: AttendanceSummaryStats
  summaryLabels: {
    total: string
    present: string
    absent: string
    rate: string
  }
  mode: 'single-day' | 'range'
  rows: AttendanceExportRow[]
}

const STATUS_LABEL: Record<AttendanceDayStatus, string> = {
  present: caretaker.attendance.statusPresent,
  absent: caretaker.attendance.statusAbsent,
  unrecorded: caretaker.attendance.statusUnrecorded,
}

export function attendanceStatusLabel(status: AttendanceDayStatus): string {
  return STATUS_LABEL[status]
}

export function mapSingleDayAttendanceRows(
  rows: Array<{ child: Child; status: AttendanceDayStatus; record?: AttendanceRecord | null }>,
): AttendanceExportRow[] {
  return rows.map(({ child, status, record }) => ({
    childName: child.fullName,
    guardianName: child.guardianName,
    date: record?.date,
    statusLabel: attendanceStatusLabel(status),
    arrivalTime: status === 'present' ? formatArrivalTime(record?.arrivedAt) : '—',
    reason: status === 'absent' ? getAbsentReasonLabel(record?.absentReason) : '—',
  }))
}

export function mapRangeAttendanceRows(
  records: AttendanceRecord[],
  childrenById: Map<string, Child>,
  user: User | null,
): AttendanceExportRow[] {
  return [...records]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || (b.arrivedAt ?? '').localeCompare(a.arrivedAt ?? ''),
    )
    .map((record) => {
      const child = childrenById.get(record.childId)
      return {
        childName: child?.fullName ?? '—',
        guardianName: child?.guardianName,
        date: record.date,
        statusLabel: attendanceStatusLabel(record.present ? 'present' : 'absent'),
        arrivalTime: record.present ? formatArrivalTime(record.arrivedAt) : '—',
        recordedBy: formatRecordedByLabel(record.recordedBy, user),
        reason: record.present
          ? getBroughtByLabel(record.broughtBy, record.broughtByOther, relations)
          : [getAbsentReasonLabel(record.absentReason), record.notes].filter(Boolean).join(' — ') ||
            '—',
      }
    })
}

export function buildAttendanceWorkbook(input: AttendanceExportInput): ExcelWorkbookSpec {
  const generatedAt = input.generatedAt ?? new Date()
  const metadata = buildAttendanceMetadata(input, generatedAt)
  const summarySheet = buildSummarySheet(input, metadata)
  const rowsSheet = input.mode === 'single-day' ? buildDayRowsSheet(input) : buildRangeRowsSheet(input)

  return {
    creator: common.appName,
    sheets: [summarySheet, rowsSheet],
  }
}

function buildAttendanceMetadata(
  input: AttendanceExportInput,
  generatedAt: Date,
): ExcelMetadataRow[] {
  const rows: ExcelMetadataRow[] = [
    { label: common.reportPreview.reportTitle, value: input.title },
    { label: common.excelExport.centre, value: input.centerName || '—' },
  ]
  if (input.classroomLabel) {
    rows.push({ label: common.excelExport.classroom, value: input.classroomLabel })
  }
  rows.push(
    { label: caretaker.report.dateFrom, value: input.dateFrom },
    { label: caretaker.report.dateTo, value: input.dateTo },
    { label: common.excelExport.generatedAt, value: generatedAt },
    {
      label: common.excelExport.dataSource,
      value: input.isMock ? common.excelExport.mockDataNote : common.excelExport.sourceLive,
    },
  )
  for (const filter of input.filters ?? []) {
    rows.push({ label: filter.label, value: filter.value })
  }
  return rows
}

function buildSummarySheet(
  input: AttendanceExportInput,
  metadata: ExcelMetadataRow[],
): ExcelSheetSpec {
  const labels = input.summaryLabels
  const summary = input.summary
  const rows: ExcelSheetSpec['rows'] = [
    [labels.total, summary.total],
    [labels.present, summary.present],
    [labels.absent, summary.absent],
    [caretaker.report.filterUnrecorded, summary.unrecorded],
    [labels.rate, { value: summary.rate, kind: 'percent' }],
  ]
  if (summary.lateArrivals != null) {
    rows.push([caretaker.attendance.lateArrivals, summary.lateArrivals])
  }

  return {
    name: common.excelExport.sheetSummary,
    title: input.title,
    metadata,
    columns: [
      { header: common.excelExport.metric, width: 36, kind: 'text' },
      { header: common.excelExport.value, width: 18, kind: 'number' },
    ],
    rows,
  }
}

function buildDayRowsSheet(input: AttendanceExportInput): ExcelSheetSpec {
  return {
    name: common.excelExport.sheetAttendance,
    title: caretaker.report.listTitle,
    columns: [
      { header: common.labels.child, width: 28, wrap: true },
      { header: common.labels.parent, width: 24, wrap: true },
      { header: common.labels.status, width: 16 },
      { header: caretaker.attendance.arrivalTime, width: 16 },
      { header: caretaker.report.reason, width: 28, wrap: true },
    ],
    rows: input.rows.map((row) => [
      row.childName,
      row.guardianName ?? '—',
      row.statusLabel,
      row.arrivalTime,
      row.reason,
    ]),
    totals: [
      common.excelExport.totals,
      input.rows.length,
      null,
      null,
      null,
    ],
  }
}

function buildRangeRowsSheet(input: AttendanceExportInput): ExcelSheetSpec {
  return {
    name: common.excelExport.sheetAttendance,
    title: caretaker.report.historyTitle,
    columns: [
      { header: common.labels.child, width: 28, wrap: true },
      { header: common.labels.date, width: 14, kind: 'date' },
      { header: common.labels.status, width: 16 },
      { header: caretaker.attendance.arrivalTime, width: 16 },
      { header: caretaker.attendance.recordedBy, width: 22, wrap: true },
      { header: caretaker.report.reason, width: 32, wrap: true },
    ],
    rows: input.rows.map((row) => [
      row.childName,
      row.date ?? null,
      row.statusLabel,
      row.arrivalTime,
      row.recordedBy ?? '—',
      row.reason,
    ]),
    totals: [common.excelExport.totals, input.rows.length, null, null, null, null],
  }
}
