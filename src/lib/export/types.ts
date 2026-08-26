export type ExcelValueKind = 'text' | 'number' | 'percent' | 'date'

export interface ExcelStyledCell {
  value: string | number | Date | boolean | null | undefined
  kind?: ExcelValueKind
}

export type ExcelCellValue =
  | string
  | number
  | Date
  | boolean
  | null
  | undefined
  | ExcelStyledCell

export interface ExcelColumn {
  header: string
  width?: number
  kind?: ExcelValueKind
  wrap?: boolean
}

export interface ExcelMetadataRow {
  label: string
  value: string | number | Date | null | undefined
}

export interface ExcelSheetSpec {
  name: string
  title?: string
  metadata?: ExcelMetadataRow[]
  columns: ExcelColumn[]
  rows: ExcelCellValue[][]
  totals?: ExcelCellValue[]
}

export interface ExcelWorkbookSpec {
  creator?: string
  sheets: ExcelSheetSpec[]
}

export function isStyledCell(value: ExcelCellValue): value is ExcelStyledCell {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof Date) &&
    'value' in value
  )
}
