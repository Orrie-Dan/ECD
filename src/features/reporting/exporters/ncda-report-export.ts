import { ncda } from '@/locales/rw/ncda'
import { common } from '@/locales/rw/common'
import { roundPct } from '@/features/reporting/utils/filters'
import type {
  CentersReportViewModel,
  DistrictReportViewModel,
  DropoutsReportViewModel,
  EnrollmentReportViewModel,
} from '@/models/reporting'
import type { ExcelMetadataRow, ExcelSheetSpec, ExcelWorkbookSpec } from '@/lib/export'

export type NcdaReportId = 'national' | 'enrollment' | 'dropouts' | 'centers'

export interface NcdaReportExportInput {
  reportId: NcdaReportId
  title: string
  periodLabel: string
  dateFrom?: string
  dateTo?: string
  districtLabel: string
  generatedAt?: Date
  district?: DistrictReportViewModel | null
  enrollment?: EnrollmentReportViewModel | null
  dropouts?: DropoutsReportViewModel | null
  centers?: CentersReportViewModel | null
}

export function ncdaExcelExportAvailable(input: {
  reportId: NcdaReportId | null
  loading: boolean
  district?: DistrictReportViewModel | null
  enrollment?: EnrollmentReportViewModel | null
  dropouts?: DropoutsReportViewModel | null
  centers?: CentersReportViewModel | null
}): boolean {
  if (!input.reportId || input.loading) return false
  switch (input.reportId) {
    case 'national':
      return Boolean(input.district)
    case 'enrollment':
      return Boolean(input.enrollment)
    case 'dropouts':
      return Boolean(input.dropouts)
    case 'centers':
      return Boolean(input.centers)
  }
}

export function buildNcdaReportWorkbook(input: NcdaReportExportInput): ExcelWorkbookSpec {
  const generatedAt = input.generatedAt ?? new Date()
  const metadata = buildMetadata(input, generatedAt)
  return {
    creator: common.appName,
    sheets: sheetsForReport(input, metadata),
  }
}

function buildMetadata(input: NcdaReportExportInput, generatedAt: Date): ExcelMetadataRow[] {
  const rows: ExcelMetadataRow[] = [
    { label: common.reportPreview.reportTitle, value: input.title },
    { label: ncda.reports.scopeLabel, value: input.districtLabel },
    { label: common.reportPreview.dateRange, value: input.periodLabel },
    { label: common.excelExport.generatedAt, value: generatedAt },
    { label: common.excelExport.dataSource, value: common.excelExport.sourceLive },
  ]
  if (input.dateFrom) rows.push({ label: common.labels.date, value: input.dateFrom })
  return rows
}

function sheetsForReport(input: NcdaReportExportInput, metadata: ExcelMetadataRow[]): ExcelSheetSpec[] {
  switch (input.reportId) {
    case 'national':
      return nationalSheets(input, metadata)
    case 'enrollment':
      return enrollmentSheets(input, metadata)
    case 'dropouts':
      return dropoutsSheets(input, metadata)
    case 'centers':
      return centersSheets(input, metadata)
  }
}

function formatRate(rate: number | null | undefined): number | null {
  if (rate == null) return null
  return roundPct(rate)
}

function nationalSheets(input: NcdaReportExportInput, metadata: ExcelMetadataRow[]): ExcelSheetSpec[] {
  const kpis = input.district?.kpis
  return [
    {
      name: common.excelExport.sheetSummary,
      title: input.title,
      metadata,
      columns: [
        { header: common.excelExport.metric, width: 36 },
        { header: common.excelExport.value, width: 18, kind: 'number' },
      ],
      rows: [
        [ncda.reports.centersInScope, kpis?.centersInScope ?? null],
        [ncda.reports.activeChildren, kpis?.activeChildren ?? null],
        [ncda.reports.attendanceRate, { value: formatRate(kpis?.attendanceRate), kind: 'percent' }],
        [ncda.reports.newRegistrations, kpis?.newRegistrations ?? null],
        [ncda.reports.dropouts, kpis?.dropouts ?? null],
        [ncda.reports.nutritionScreenings, kpis?.nutritionScreenings ?? null],
        [ncda.reports.stedAssessments, kpis?.stedAssessments ?? null],
      ],
    },
  ]
}

function enrollmentSheets(input: NcdaReportExportInput, metadata: ExcelMetadataRow[]): ExcelSheetSpec[] {
  const summary = input.enrollment?.summary
  return [
    {
      name: common.excelExport.sheetSummary,
      title: input.title,
      metadata,
      columns: [
        { header: common.excelExport.metric, width: 36 },
        { header: common.excelExport.value, width: 18, kind: 'number' },
      ],
      rows: [
        [ncda.reports.enrolledTotal, summary?.totalEnrolled ?? null],
        [ncda.reports.enrolledActive, summary?.active ?? null],
        [ncda.reports.enrolledArchived, summary?.archived ?? null],
        [ncda.reports.newRegistrations, summary?.newRegistrations ?? null],
      ],
    },
  ]
}

function dropoutsSheets(input: NcdaReportExportInput, metadata: ExcelMetadataRow[]): ExcelSheetSpec[] {
  const dropouts = input.dropouts
  const paginationNote =
    dropouts && dropouts.totalPages > 1
      ? common.excelExport.pageScope
          .replace('{page}', String(dropouts.page))
          .replace('{totalPages}', String(dropouts.totalPages))
          .replace('{total}', String(dropouts.total))
      : null
  const extraMeta: ExcelMetadataRow[] = paginationNote
    ? [...metadata, { label: common.pagination.page, value: paginationNote }]
    : metadata

  const sheets: ExcelSheetSpec[] = [
    {
      name: common.excelExport.sheetSummary,
      title: input.title,
      metadata: extraMeta,
      columns: [
        { header: common.excelExport.metric, width: 36 },
        { header: common.excelExport.value, width: 18, kind: 'number' },
      ],
      rows: [
        [ncda.reports.dropouts, dropouts?.summary.dropouts ?? null],
        [ncda.reports.transfersOut, dropouts?.summary.transfersOut ?? null],
      ],
    },
  ]
  if (dropouts && dropouts.items.length > 0) {
    sheets.push({
      name: common.excelExport.sheetDropouts,
      title: ncda.reports.dropoutsTitle,
      columns: [
        { header: ncda.reports.colChild, width: 28, wrap: true },
        { header: ncda.reports.colCenter, width: 28, wrap: true },
        { header: ncda.reports.colArchived, width: 16, kind: 'date' },
        { header: ncda.reports.colReason, width: 28, wrap: true },
      ],
      rows: dropouts.items.map((row) => [
        row.childName,
        row.centerName,
        row.archivedAt ?? null,
        row.archiveReason ?? '—',
      ]),
    })
  }
  return sheets
}

function centersSheets(input: NcdaReportExportInput, metadata: ExcelMetadataRow[]): ExcelSheetSpec[] {
  const centers = input.centers
  const paginationNote =
    centers && centers.totalPages > 1
      ? common.excelExport.pageScope
          .replace('{page}', String(centers.page))
          .replace('{totalPages}', String(centers.totalPages))
          .replace('{total}', String(centers.total))
      : null
  const extraMeta: ExcelMetadataRow[] = paginationNote
    ? [...metadata, { label: common.pagination.page, value: paginationNote }]
    : metadata

  return [
    {
      name: common.excelExport.sheetCenters,
      title: input.title,
      metadata: extraMeta,
      columns: [
        { header: ncda.reports.colCenter, width: 32, wrap: true },
        { header: ncda.reports.colStatus, width: 14 },
        { header: ncda.reports.colEnrolled, width: 14, kind: 'number' },
        { header: ncda.reports.colAttendance, width: 16, kind: 'percent' },
        { header: ncda.reports.colNutrition, width: 18, kind: 'number' },
      ],
      rows: (centers?.items ?? []).map((row) => [
        row.centerName,
        row.status === 'active' ? ncda.centers.statusActive : ncda.centers.statusInactive,
        row.enrolledChildren,
        row.attendance.rate == null ? null : { value: roundPct(row.attendance.rate), kind: 'percent' },
        row.nutritionSevereScreenings,
      ]),
    },
  ]
}
