import { common } from '@/locales/rw/common'
import { district } from '@/locales/rw/district'
import type { ExcelMetadataRow, ExcelSheetSpec, ExcelWorkbookSpec } from '@/lib/export'
import type { DistrictGrowthExportDataset } from '../export-datasets'
import { buildScopedMonitoringMetadata } from './export-metadata'

export function buildDistrictGrowthWorkbook(dataset: DistrictGrowthExportDataset): ExcelWorkbookSpec {
  const generatedAt = dataset.input.generatedAt ?? new Date()
  const extra: ExcelMetadataRow[] = []
  if (dataset.partial && dataset.partialNote) {
    extra.push({ label: common.excelExport.pageScope, value: dataset.partialNote })
  }
  const metadata = buildScopedMonitoringMetadata(dataset.input, generatedAt, extra)

  const rowsSheet: ExcelSheetSpec = {
    name: common.excelExport.sheetNutrition,
    title: district.growth.tableTitle,
    metadata,
    columns: [
      { header: common.labels.child, width: 28, wrap: true },
      { header: district.growth.center, width: 28, wrap: true },
      { header: district.growth.lastScreening, width: 16, kind: 'date' },
      { header: district.growth.weightKg, width: 14, kind: 'number' },
      { header: district.growth.muacCm, width: 14, kind: 'number' },
      { header: district.growth.statusFilterLabel, width: 22, wrap: true },
      { header: district.growth.due, width: 22, wrap: true },
      { header: district.growth.childAge, width: 10, kind: 'number' },
    ],
    rows: dataset.rows.map((row) => [
      row.childName,
      row.centerName,
      row.measurementDate,
      row.weightKg,
      row.muacCm,
      row.nutritionStatusLabel,
      row.measurementStatusLabel,
      row.age,
    ]),
    totals: [common.excelExport.totals, dataset.rows.length, null, null, null, null, null, null, null],
  }

  return {
    creator: common.appName,
    sheets: [rowsSheet],
  }
}
