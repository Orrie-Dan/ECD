const INVALID_CHARS = /[<>:"/\\|?*]/g
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
const MAX_PART_LENGTH = 48
const MAX_BASENAME_LENGTH = 120

function stripControlChars(value: string): string {
  let result = ''
  for (const ch of value) {
    result += ch.charCodeAt(0) < 32 ? '-' : ch
  }
  return result
}

/** Safe Excel worksheet name (max 31 chars, no \ / * ? : [ ]). */
export function sanitizeSheetName(name: string, fallback = 'Sheet'): string {
  const cleaned = name
    .replace(/[:\\/?*[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const sliced = cleaned.slice(0, 31).trim()
  return sliced || fallback
}

export function sanitizeFilenamePart(value: string | null | undefined, fallback = 'raporo'): string {
  const raw = (value ?? '').trim()
  if (!raw) return fallback

  const normalized = stripControlChars(raw)
    .replace(INVALID_CHARS, '-')
    .replace(/[^\p{L}\p{N}_.-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, MAX_PART_LENGTH)

  if (!normalized || WINDOWS_RESERVED.test(normalized)) return fallback
  return normalized
}

export function buildExcelFilename(parts: Array<string | null | undefined>): string {
  const safe = parts
    .map((part) => (part == null || !String(part).trim() ? '' : sanitizeFilenamePart(part, '')))
    .filter(Boolean)
  const base = (safe.length > 0 ? safe.join('_') : 'raporo').slice(0, MAX_BASENAME_LENGTH)
  return `${base}.xlsx`
}
