import { common } from '@/locales/rw/common'
import { district } from '@/locales/rw/district'
import type { ExcelSheetSpec, ExcelWorkbookSpec } from '@/lib/export'
import type { DistrictAttendanceMonitoringExportDataset } from '../export-datasets'
import { buildScopedMonitoringMetadata } from './export-metadata'

export function buildDistrictAttendanceMonitoringWorkbook(
  dataset: DistrictAttendanceMonitoringExportDataset,
): ExcelWorkbookSpec {
  const generatedAt = dataset.input.generatedAt ?? new Date()
  const metadata = buildScopedMonitoringMetadata(dataset.input, generatedAt)
  const includeSector = dataset.rows.some((row) => row.sector != null)

  const columns = [
    { header: district.attendanceMonitoring.dateLabel, width: 14, kind: 'date' as const },
    { header: district.growth.center, width: 32, wrap: true },
    ...(includeSector
      ? [{ header: district.growth.sector, width: 18, kind: 'text' as const }]
      : []),
    { header: district.schools.tableChildren, width: 16, kind: 'number' as const },
    { header: district.reports.present, width: 14, kind: 'number' as const },
    { header: district.reports.absent, width: 14, kind: 'number' as const },
    { header: district.reports.rate, width: 14, kind: 'percent' as const },
  ]

  const rowsSheet: ExcelSheetSpec = {
    name: common.excelExport.sheetAttendance,
    title: district.attendanceMonitoring.overviewTitle,
    metadata,
    columns,
    rows: dataset.rows.map((row) => [
      row.date,
      row.centerName,
      ...(includeSector ? [row.sector ?? '—'] : []),
      row.registeredChildren,
      row.present,
      row.absent,
      { value: row.attendanceRate, kind: 'percent' },
    ]),
    totals: [
      common.excelExport.totals,
      dataset.rows.length,
      ...(includeSector ? [null] : []),
      null,
      null,
      null,
      null,
    ],
  }

  return {
    creator: common.appName,
    sheets: [rowsSheet],
  }
}
