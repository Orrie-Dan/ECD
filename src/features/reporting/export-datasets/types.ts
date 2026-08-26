/** Filter chip shown in Excel metadata — mirrors UI filter labels. */
export interface ExportFilterLabel {
  label: string
  value: string
}

/** Shared workbook header fields for scoped district monitoring exports. */
export interface ScopedMonitoringExportInput {
  title: string
  districtName?: string
  dateFrom: string
  dateTo: string
  generatedAt?: Date
  isMock: boolean
  filters?: ExportFilterLabel[]
}
