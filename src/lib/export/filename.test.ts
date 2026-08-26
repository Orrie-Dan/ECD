import { describe, expect, it } from 'vitest'
import { buildExcelFilename, sanitizeFilenamePart, sanitizeSheetName } from '@/lib/export/filename'

describe('sanitizeFilenamePart', () => {
  it('strips path separators and reserved characters', () => {
    expect(sanitizeFilenamePart('a/b\\c:d*e?f')).toBe('a-b-c-d-e-f')
    expect(sanitizeFilenamePart(`bad${String.fromCharCode(0)}name`)).toBe('bad-name')
  })

  it('does not crash on empty or missing values', () => {
    expect(sanitizeFilenamePart('')).toBe('raporo')
    expect(sanitizeFilenamePart(null)).toBe('raporo')
    expect(sanitizeFilenamePart(undefined)).toBe('raporo')
  })

  it('rejects windows reserved names', () => {
    expect(sanitizeFilenamePart('CON')).toBe('raporo')
    expect(sanitizeFilenamePart('nul')).toBe('raporo')
  })
})

describe('buildExcelFilename', () => {
  it('joins sanitized parts with an xlsx suffix', () => {
    expect(buildExcelFilename(['ubwitabire', "Ikigo cy'Abana", '2026-08-01', '2026-08-26'])).toBe(
      'ubwitabire_Ikigo-cy-Abana_2026-08-01_2026-08-26.xlsx',
    )
  })

  it('falls back when every part is empty', () => {
    expect(buildExcelFilename(['', null, undefined])).toBe('raporo.xlsx')
  })
})

describe('sanitizeSheetName', () => {
  it('caps length at 31 and strips illegal excel characters', () => {
    expect(sanitizeSheetName('A:B/C*D?E[F]G'.repeat(5)).length).toBeLessThanOrEqual(31)
    expect(sanitizeSheetName('A:B')).toBe('A B')
  })
})
