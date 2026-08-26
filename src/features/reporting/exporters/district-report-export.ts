import { caretaker } from '@/locales/rw/caretaker'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import type { MonitoringNutritionViewModel } from '@/models/monitoring'
import type {
  AttendanceReportCenterRowViewModel,
  AttendanceReportSummaryViewModel,
  CentersReportViewModel,
  DropoutsReportViewModel,
  EnrollmentReportViewModel,
  ReportPreviewKind,
} from '@/models/reporting'
import type { ExcelMetadataRow, ExcelSheetSpec, ExcelWorkbookSpec } from '@/lib/export'

export interface DistrictReportExportInput {
  kind: ReportPreviewKind
  title: string
  dateFrom: string
  dateTo: string
  generatedAt?: Date
  isMock: boolean
  filters?: Array<{ label: string; value: string }>
  attendance?: {
    summary: AttendanceReportSummaryViewModel
    rows: AttendanceReportCenterRowViewModel[]
  }
  enrollment?: EnrollmentReportViewModel | null
  dropouts?: DropoutsReportViewModel | null
  centers?: CentersReportViewModel | null
  nutrition?: MonitoringNutritionViewModel | null
}

export function districtExcelExportAvailable(kind: ReportPreviewKind): boolean {
  return kind !== 'sectors'
}

export function districtExcelFilenamePrefix(kind: ReportPreviewKind): string {
  switch (kind) {
    case 'attendance':
      return 'ubwitabire'
    case 'enrollment':
      return 'kwiyandikisha'
    case 'dropouts':
      return 'abaretse-gahunda'
    case 'centers':
      return 'ibigo'
    case 'nutritionCoverage':
    case 'nutritionStatus':
    case 'nutritionCenters':
    case 'nutritionTrends':
      return 'imikurire'
    case 'sectors':
      return 'imirenge'
  }
}

export function districtKindHasExportData(input: {
  kind: ReportPreviewKind
  loading: boolean
  enrollment?: EnrollmentReportViewModel | null
  dropouts?: DropoutsReportViewModel | null
  centers?: CentersReportViewModel | null
  nutrition?: MonitoringNutritionViewModel | null
}): boolean {
  if (!districtExcelExportAvailable(input.kind) || input.loading) return false
  switch (input.kind) {
    case 'attendance':
      return true
    case 'enrollment':
      return Boolean(input.enrollment)
    case 'dropouts':
      return Boolean(input.dropouts)
    case 'centers':
      return Boolean(input.centers)
    case 'nutritionCoverage':
    case 'nutritionStatus':
    case 'nutritionCenters':
    case 'nutritionTrends':
      return Boolean(input.nutrition)
    case 'sectors':
      return false
  }
}

export function buildDistrictReportWorkbook(input: DistrictReportExportInput): ExcelWorkbookSpec {
  const generatedAt = input.generatedAt ?? new Date()
  const metadata = buildSharedMetadata(input, generatedAt)
  const sheets = sheetsForKind(input, metadata)
  return {
    creator: common.appName,
    sheets: sheets.length > 0 ? sheets : [emptySummarySheet(input, metadata)],
  }
}

function buildSharedMetadata(
  input: DistrictReportExportInput,
  generatedAt: Date,
): ExcelMetadataRow[] {
  const rows: ExcelMetadataRow[] = [
    { label: common.reportPreview.reportTitle, value: input.title },
    { label: district.reports.dateFrom, value: input.dateFrom },
    { label: district.reports.dateTo, value: input.dateTo },
    { label: common.excelExport.generatedAt, value: generatedAt },
    {
      label: common.excelExport.dataSource,
      value: input.isMock ? common.excelExport.mockDataNote : common.excelExport.sourceLive,
    },
  ]
  for (const filter of input.filters ?? []) {
    rows.push({ label: filter.label, value: filter.value })
  }
  return rows
}

function sheetsForKind(input: DistrictReportExportInput, metadata: ExcelMetadataRow[]): ExcelSheetSpec[] {
  switch (input.kind) {
    case 'attendance':
      return attendanceSheets(input, metadata)
    case 'enrollment':
      return enrollmentSheets(input, metadata)
    case 'dropouts':
      return dropoutsSheets(input, metadata)
    case 'centers':
      return centersSheets(input, metadata)
    case 'nutritionCoverage':
    case 'nutritionStatus':
    case 'nutritionCenters':
    case 'nutritionTrends':
      return nutritionSheets(input, metadata)
    case 'sectors':
      return []
  }
}

function attendanceSheets(
  input: DistrictReportExportInput,
  metadata: ExcelMetadataRow[],
): ExcelSheetSpec[] {
  const data = input.attendance
  if (!data) return [emptySummarySheet(input, metadata)]
  const summary = data.summary
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
        [district.reports.totalRecords, summary.total],
        [district.reports.present, summary.present],
        [district.reports.absent, summary.absent],
        [district.reports.rate, { value: summary.rate, kind: 'percent' }],
      ],
    },
    {
      name: common.excelExport.sheetCenters,
      title: district.reports.centerComparison,
      columns: [
        { header: district.schools.tableSchool, width: 32, wrap: true },
        { header: district.schools.tableSector, width: 18 },
        { header: district.schools.tableChildren, width: 14, kind: 'number' },
        { header: district.reports.rate, width: 14, kind: 'percent' },
        { header: district.reports.present, width: 14, kind: 'number' },
        { header: district.reports.totalRecords, width: 16, kind: 'number' },
        { header: district.reports.submittedToday, width: 18 },
      ],
      rows: data.rows.map((row) => [
        row.centerName,
        row.sector || '—',
        row.enrolledChildren,
        { value: row.rate, kind: 'percent' },
        row.present,
        row.totalRecords,
        row.submittedToday ? common.yes : common.no,
      ]),
      totals: [
        common.excelExport.totals,
        data.rows.length,
        null,
        null,
        summary.present,
        summary.total,
        null,
      ],
    },
  ]
}

function enrollmentSheets(
  input: DistrictReportExportInput,
  metadata: ExcelMetadataRow[],
): ExcelSheetSpec[] {
  const enrollment = input.enrollment
  if (!enrollment) return [emptySummarySheet(input, metadata)]
  const s = enrollment.summary
  const sheets: ExcelSheetSpec[] = [
    {
      name: common.excelExport.sheetSummary,
      title: input.title,
      metadata,
      columns: [
        { header: common.excelExport.metric, width: 36 },
        { header: common.excelExport.value, width: 18, kind: 'number' },
      ],
      rows: [
        [district.reports.previewActive, s.active],
        [district.reports.previewNew, s.newRegistrations],
        [district.reports.previewArchived, s.archived],
        [common.excelExport.sheetTransfers, s.transferred],
      ],
    },
  ]
  if (enrollment.trend.length > 0) {
    sheets.push({
      name: common.excelExport.sheetEnrollment,
      title: district.reports.enrollment,
      columns: [
        { header: common.labels.date, width: 16, kind: 'date' },
        { header: district.reports.previewNew, width: 18, kind: 'number' },
      ],
      rows: enrollment.trend.map((point) => [point.date, point.newRegistrations]),
    })
  }
  return sheets
}

function dropoutsSheets(
  input: DistrictReportExportInput,
  metadata: ExcelMetadataRow[],
): ExcelSheetSpec[] {
  const dropouts = input.dropouts
  if (!dropouts) return [emptySummarySheet(input, metadata)]
  const sheets: ExcelSheetSpec[] = [
    {
      name: common.excelExport.sheetSummary,
      title: input.title,
      metadata,
      columns: [
        { header: common.excelExport.metric, width: 36 },
        { header: common.excelExport.value, width: 18, kind: 'number' },
      ],
      rows: [
        [district.reports.previewDropouts, dropouts.summary.dropouts],
        [common.excelExport.sheetTransfers, dropouts.summary.transfersOut],
      ],
    },
  ]
  if (dropouts.items.length > 0) {
    sheets.push({
      name: common.excelExport.sheetDropouts,
      title: district.reports.dropouts,
      columns: [
        { header: district.reports.previewChild, width: 28, wrap: true },
        { header: district.reports.previewCenter, width: 28, wrap: true },
        { header: common.labels.date, width: 16, kind: 'date' },
        { header: caretaker.report.reason, width: 28, wrap: true },
      ],
      rows: dropouts.items.map((item) => [
        item.childName,
        item.centerName,
        item.archivedAt ?? null,
        item.archiveReason ?? '—',
      ]),
    })
  }
  return sheets
}

function centersSheets(
  input: DistrictReportExportInput,
  metadata: ExcelMetadataRow[],
): ExcelSheetSpec[] {
  const centers = input.centers
  if (!centers) return [emptySummarySheet(input, metadata)]
  return [
    {
      name: common.excelExport.sheetCenters,
      title: input.title,
      metadata,
      columns: [
        { header: district.reports.previewCenter, width: 32, wrap: true },
        { header: common.labels.status, width: 14 },
        { header: district.reports.previewChildren, width: 14, kind: 'number' },
        { header: district.reports.previewRate, width: 14, kind: 'percent' },
        { header: district.reports.present, width: 14, kind: 'number' },
        { header: district.reports.absent, width: 14, kind: 'number' },
        { header: district.reports.previewSevere, width: 16, kind: 'number' },
      ],
      rows: centers.items.map((item) => [
        item.centerName,
        item.status === 'active'
          ? district.reports.centerStatusActive
          : district.reports.centerStatusInactive,
        item.enrolledChildren,
        item.attendance.rate == null ? null : { value: item.attendance.rate, kind: 'percent' },
        item.attendance.present,
        item.attendance.absent,
        item.nutritionSevereScreenings,
      ]),
    },
  ]
}

function nutritionSheets(
  input: DistrictReportExportInput,
  metadata: ExcelMetadataRow[],
): ExcelSheetSpec[] {
  const nutrition = input.nutrition
  if (!nutrition) return [emptySummarySheet(input, metadata)]
  const s = nutrition.summary
  const sheets: ExcelSheetSpec[] = [
    {
      name: common.excelExport.sheetSummary,
      title: input.title,
      metadata,
      columns: [
        { header: common.excelExport.metric, width: 36 },
        { header: common.excelExport.value, width: 18, kind: 'number' },
      ],
      rows: [
        [district.reports.previewCoverage, { value: s.screeningCoverage ?? 0, kind: 'percent' }],
        [district.reports.previewScreenings, s.screenings],
        [district.reports.previewSevere, s.severe],
        [district.reports.previewModerate, s.moderate],
        [district.reports.previewAtRisk, s.atRisk],
        [district.reports.previewNormal, s.normal],
        [district.reports.previewOverdue, s.overdueScreenings],
        [district.reports.previewNever, s.neverScreened],
      ],
    },
  ]
  if (nutrition.items.length > 0) {
    sheets.push({
      name: common.excelExport.sheetNutrition,
      title: district.reports.nutritionCenters,
      columns: [
        { header: district.reports.previewCenter, width: 32, wrap: true },
        { header: district.reports.previewScreenings, width: 16, kind: 'number' },
        { header: district.reports.previewSevere, width: 16, kind: 'number' },
        { header: district.reports.previewModerate, width: 16, kind: 'number' },
        { header: district.reports.previewAtRisk, width: 18, kind: 'number' },
        { header: district.reports.previewNormal, width: 14, kind: 'number' },
      ],
      rows: nutrition.items.map((item) => [
        item.centerName,
        item.screenings,
        item.severe,
        item.moderate,
        item.atRisk,
        item.normal,
      ]),
    })
  }
  return sheets
}

function emptySummarySheet(
  input: DistrictReportExportInput,
  metadata: ExcelMetadataRow[],
): ExcelSheetSpec {
  return {
    name: common.excelExport.sheetSummary,
    title: input.title,
    metadata,
    columns: [
      { header: common.excelExport.metric, width: 36 },
      { header: common.excelExport.value, width: 18 },
    ],
    rows: [[common.reportPreview.emptyPreview, '—']],
  }
}
