import { describe, expect, it, vi } from 'vitest'
import { createWorkbook, exportWorkbookToFile, parseIsoDate } from '@/lib/export/excel'
import type { ExcelWorkbookSpec } from '@/lib/export/types'

const spec: ExcelWorkbookSpec = {
  sheets: [
    {
      name: 'Incamake',
      title: "Raporo y'Abitabiriye",
      metadata: [
        { label: 'Ikigo', value: 'Ikigo Test' },
        { label: 'Kuva', value: '2026-08-01' },
      ],
      columns: [
        { header: 'Igipimo', kind: 'text' },
        { header: 'Agaciro', kind: 'number' },
      ],
      rows: [
        ['Abaje', 12],
        ["Ijanisha ry'ubwitabire", { value: 80, kind: 'percent' }],
      ],
    },
    {
      name: 'Ubwitabire',
      columns: [
        { header: 'Umwana', kind: 'text' },
        { header: 'Itariki', kind: 'date' },
      ],
      rows: [['Ange', '2026-08-05']],
      totals: ['Igiteranyo', 1],
    },
  ],
}

describe('createWorkbook', () => {
  it('creates named worksheets with localized headers', async () => {
    const workbook = await createWorkbook(spec)
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Incamake', 'Ubwitabire'])
    const summary = workbook.getWorksheet('Incamake')
    expect(summary).toBeDefined()
    let headerValues: unknown[] = []
    summary!.eachRow((row) => {
      const first = row.getCell(1).value
      const second = row.getCell(2).value
      if (first === 'Igipimo' && second === 'Agaciro') {
        headerValues = [first, second]
      }
    })
    expect(headerValues).toEqual(['Igipimo', 'Agaciro'])
  })

  it('writes percentages and counts as numeric cells', async () => {
    const workbook = await createWorkbook(spec)
    const summary = workbook.getWorksheet('Incamake')
    expect(summary).toBeDefined()
    let count: unknown
    let percent: unknown
    let percentFmt: unknown
    summary!.eachRow((row) => {
      if (row.getCell(1).value === 'Abaje') {
        count = row.getCell(2).value
      }
      if (row.getCell(1).value === "Ijanisha ry'ubwitabire") {
        percent = row.getCell(2).value
        percentFmt = row.getCell(2).numFmt
      }
    })
    expect(count).toBe(12)
    expect(percent).toBe(0.8)
    expect(percentFmt).toBe('0%')
  })

  it('writes ISO dates as date cells', async () => {
    const workbook = await createWorkbook(spec)
    const sheet = workbook.getWorksheet('Ubwitabire')
    const dateCell = sheet!.getRow(2).getCell(2)
    expect(dateCell.value).toBeInstanceOf(Date)
    expect(dateCell.numFmt).toBe('yyyy-mm-dd')
    const parsed = parseIsoDate('2026-08-05')
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(7)
    expect(parsed?.getDate()).toBe(5)
  })

  it('does not crash on empty rows or missing optional fields', async () => {
    const workbook = await createWorkbook({
      sheets: [
        {
          name: 'Incamake',
          columns: [{ header: 'Igipimo' }],
          rows: [],
        },
      ],
    })
    expect(workbook.getWorksheet('Incamake')).toBeDefined()
    await expect(
      createWorkbook({
        sheets: [
          {
            name: 'Incamake',
            columns: [{ header: 'A' }, { header: 'B' }],
            rows: [[undefined, null]],
          },
        ],
      }),
    ).resolves.toBeDefined()
  })
})

describe('exportWorkbookToFile', () => {
  it('invokes the download adapter after a workbook is generated', async () => {
    const download = vi.fn()
    await exportWorkbookToFile(spec, 'ubwitabire_test.xlsx', download)
    expect(download).toHaveBeenCalledTimes(1)
    expect(download.mock.calls[0]?.[1]).toBe('ubwitabire_test.xlsx')
    const buffer = download.mock.calls[0]?.[0] as ArrayBuffer
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  it('does not swallow download failures as success', async () => {
    await expect(
      exportWorkbookToFile(spec, 'x.xlsx', () => {
        throw new Error('download failed')
      }),
    ).rejects.toThrow('download failed')
  })
})
