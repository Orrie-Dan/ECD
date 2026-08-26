import type { Cell, Worksheet, Workbook } from 'exceljs'
import type {
  ExcelCellValue,
  ExcelColumn,
  ExcelSheetSpec,
  ExcelValueKind,
  ExcelWorkbookSpec,
} from './types'
import { isStyledCell } from './types'
import { sanitizeSheetName } from './filename'

const HEADER_FILL = 'FF0B6E4F'
const HEADER_FONT = 'FFFFFFFF'
const TITLE_FONT_SIZE = 14
const DATE_NUM_FMT = 'yyyy-mm-dd'
const NUMBER_NUM_FMT = '#,##0'
const PERCENT_NUM_FMT = '0%'
const THIN_BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FFD0D7D4' } },
  left: { style: 'thin' as const, color: { argb: 'FFD0D7D4' } },
  bottom: { style: 'thin' as const, color: { argb: 'FFD0D7D4' } },
  right: { style: 'thin' as const, color: { argb: 'FFD0D7D4' } },
}

export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return null
  return date
}

async function loadWorkbookCtor(): Promise<typeof import('exceljs').Workbook> {
  const mod = await import('exceljs')
  const fromNamed = mod.Workbook
  const fromDefault = (mod as { default?: { Workbook?: typeof mod.Workbook } }).default?.Workbook
  const ctor = fromNamed ?? fromDefault
  if (!ctor) {
    throw new Error('ExcelJS Workbook is unavailable')
  }
  return ctor
}

export async function createWorkbook(spec: ExcelWorkbookSpec): Promise<Workbook> {
  const WorkbookCtor = await loadWorkbookCtor()
  const workbook = new WorkbookCtor()
  workbook.creator = spec.creator ?? "Sisitemu y'Imbonezamikurire y'Abana Bato"
  workbook.created = new Date()
  workbook.modified = new Date()

  const usedNames = new Set<string>()
  for (const sheet of spec.sheets) {
    writeSheet(workbook, uniquifySheetName(sheet.name, usedNames), sheet)
  }

  if (workbook.worksheets.length === 0) {
    writeSheet(workbook, 'Incamake', {
      name: 'Incamake',
      columns: [{ header: '—' }],
      rows: [],
    })
  }

  return workbook
}

export async function workbookToBuffer(workbook: Workbook): Promise<ArrayBuffer> {
  const result = await workbook.xlsx.writeBuffer()
  if (result instanceof ArrayBuffer) return result
  const view = new Uint8Array(result as ArrayBuffer)
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
}

export async function exportWorkbookToFile(
  spec: ExcelWorkbookSpec,
  filename: string,
  download: (data: ArrayBuffer, filename: string) => void,
): Promise<void> {
  const workbook = await createWorkbook(spec)
  const buffer = await workbookToBuffer(workbook)
  download(buffer, filename)
}

function uniquifySheetName(name: string, used: Set<string>): string {
  const base = sanitizeSheetName(name)
  let candidate = base
  let n = 2
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` ${n}`
    candidate = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`
    n += 1
  }
  used.add(candidate.toLowerCase())
  return candidate
}

function writeSheet(workbook: Workbook, name: string, spec: ExcelSheetSpec): void {
  const worksheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 0, showGridLines: true }],
  })
  const columnCount = Math.max(spec.columns.length, 1)

  worksheet.columns = spec.columns.map((column) => ({
    width: column.width ?? Math.min(42, Math.max(14, column.header.length + 4)),
  }))

  let rowNumber = 1
  if (spec.title) {
    const titleRow = worksheet.getRow(rowNumber)
    titleRow.getCell(1).value = spec.title
    titleRow.getCell(1).font = { bold: true, size: TITLE_FONT_SIZE, color: { argb: 'FF1A1A1A' } }
    titleRow.height = 22
    if (columnCount > 1) {
      worksheet.mergeCells(rowNumber, 1, rowNumber, columnCount)
    }
    rowNumber += 1
  }

  if (spec.metadata && spec.metadata.length > 0) {
    if (spec.title) rowNumber += 1
    for (const item of spec.metadata) {
      const row = worksheet.getRow(rowNumber)
      row.getCell(1).value = item.label
      row.getCell(1).font = { bold: true, color: { argb: 'FF4A5568' } }
      applyCellValue(row.getCell(2), item.value, inferMetadataKind(item.value))
      rowNumber += 1
    }
  }

  rowNumber += spec.title || (spec.metadata && spec.metadata.length > 0) ? 1 : 0
  const headerRowNumber = rowNumber
  const headerRow = worksheet.getRow(headerRowNumber)
  spec.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = column.header
    cell.font = { bold: true, color: { argb: HEADER_FONT } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_FILL },
    }
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.border = THIN_BORDER
  })
  headerRow.height = 20

  spec.rows.forEach((values) => {
    rowNumber += 1
    writeDataRow(worksheet, rowNumber, spec.columns, values)
  })

  if (spec.totals && spec.totals.length > 0) {
    rowNumber += 1
    writeDataRow(worksheet, rowNumber, spec.columns, spec.totals, { bold: true })
  }

  worksheet.views = [{ state: 'frozen', ySplit: headerRowNumber, showGridLines: true }]
  worksheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: columnCount },
  }
}

function writeDataRow(
  worksheet: Worksheet,
  rowNumber: number,
  columns: ExcelColumn[],
  values: ExcelCellValue[],
  options?: { bold?: boolean },
): void {
  const row = worksheet.getRow(rowNumber)
  columns.forEach((column, index) => {
    const cell = row.getCell(index + 1)
    const raw = values[index]
    const styled = isStyledCell(raw) ? raw : null
    const value = styled ? styled.value : raw
    const kind = styled?.kind ?? column.kind ?? inferKind(value)
    applyCellValue(cell, value, kind)
    cell.border = THIN_BORDER
    cell.alignment = {
      vertical: 'middle',
      wrapText: column.wrap === true || kind === 'text',
    }
    if (options?.bold) {
      cell.font = { ...(cell.font ?? {}), bold: true }
    }
  })
}

function applyCellValue(cell: Cell, value: unknown, kind: ExcelValueKind): void {
  if (value == null || value === '') {
    cell.value = null
    return
  }

  if (kind === 'percent') {
    const numeric = toNumber(value)
    if (numeric == null) {
      cell.value = String(value)
      return
    }
    cell.value = numeric / 100
    cell.numFmt = PERCENT_NUM_FMT
    return
  }

  if (kind === 'number') {
    const numeric = toNumber(value)
    if (numeric == null) {
      cell.value = String(value)
      return
    }
    cell.value = numeric
    cell.numFmt = NUMBER_NUM_FMT
    return
  }

  if (kind === 'date') {
    const date = value instanceof Date ? value : typeof value === 'string' ? parseIsoDate(value) : null
    if (!date) {
      cell.value = typeof value === 'string' ? value : String(value)
      return
    }
    cell.value = date
    cell.numFmt = DATE_NUM_FMT
    return
  }

  if (typeof value === 'boolean') {
    cell.value = value
    return
  }

  cell.value = value instanceof Date ? value : String(value)
}

function inferKind(value: unknown): ExcelValueKind {
  if (value instanceof Date) return 'date'
  if (typeof value === 'number') return 'number'
  return 'text'
}

function inferMetadataKind(value: unknown): ExcelValueKind {
  if (value instanceof Date) return 'date'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string' && parseIsoDate(value)) return 'date'
  return 'text'
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}
