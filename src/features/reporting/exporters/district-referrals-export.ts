import { common } from '@/locales/rw/common'
import { district } from '@/locales/rw/district'
import type { ExcelSheetSpec, ExcelWorkbookSpec } from '@/lib/export'
import type { DistrictReferralExportDataset } from '../export-datasets'
import { buildScopedMonitoringMetadata } from './export-metadata'

export function buildDistrictReferralsWorkbook(
  dataset: DistrictReferralExportDataset,
): ExcelWorkbookSpec {
  const generatedAt = dataset.input.generatedAt ?? new Date()
  const metadata = buildScopedMonitoringMetadata(dataset.input, generatedAt)

  const rowsSheet: ExcelSheetSpec = {
    name: common.excelExport.sheetReferrals,
    title: district.referrals.listTitle,
    metadata,
    columns: [
      { header: district.referrals.child, width: 28, wrap: true },
      { header: district.growth.center, width: 28, wrap: true },
      { header: district.referrals.date, width: 16, kind: 'date' },
      { header: district.referrals.source, width: 18 },
      { header: district.referrals.reason, width: 32, wrap: true },
      { header: district.referrals.status, width: 18 },
      { header: district.referrals.followUp, width: 22, wrap: true },
      { header: district.referrals.resolvedDate, width: 18, kind: 'date' },
    ],
    rows: dataset.rows.map((row) => [
      row.childName,
      row.centerName,
      row.referralDate,
      row.sourceLabel,
      row.reason,
      row.statusLabel,
      row.followUpLabel,
      row.resolvedDate,
    ]),
    totals: [common.excelExport.totals, dataset.rows.length, null, null, null, null, null, null, null],
  }

  return {
    creator: common.appName,
    sheets: [rowsSheet],
  }
}
