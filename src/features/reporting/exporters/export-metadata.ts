import { common } from '@/locales/rw/common'
import { district } from '@/locales/rw/district'
import type { ExcelMetadataRow } from '@/lib/export'
import type { ScopedMonitoringExportInput } from '../export-datasets'

export function buildScopedMonitoringMetadata(
  input: ScopedMonitoringExportInput,
  generatedAt: Date,
  extra?: ExcelMetadataRow[],
): ExcelMetadataRow[] {
  const rows: ExcelMetadataRow[] = [
    { label: common.reportPreview.reportTitle, value: input.title },
  ]
  if (input.districtName) {
    rows.push({ label: common.excelExport.districtScope, value: input.districtName })
  }
  rows.push(
    { label: district.reports.dateFrom, value: input.dateFrom },
    { label: district.reports.dateTo, value: input.dateTo },
    { label: common.excelExport.generatedAt, value: generatedAt },
    {
      label: common.excelExport.dataSource,
      value: input.isMock ? common.excelExport.mockDataNote : common.excelExport.sourceLive,
    },
  )
  for (const filter of input.filters ?? []) {
    rows.push({ label: filter.label, value: filter.value })
  }
  for (const row of extra ?? []) {
    rows.push(row)
  }
  return rows
}
