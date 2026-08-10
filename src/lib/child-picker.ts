import type { Child } from '@/types'

const RECENT_PREFIX = 'ecd-child-picker-recent:'
const FREQ_PREFIX = 'ecd-child-picker-freq:'
const MAX_RECENT = 6
const MAX_FREQUENT = 5

export type ChildPickerQuickFilter =
  | 'all'
  | 'age_1_3'
  | 'age_4_6'
  | 'needs_follow_up'
  | 'overdue_growth'
  | 'at_nutritional_risk'

export interface ChildPickerMeta {
  /** ISO date of latest growth measurement, if any */
  lastGrowthDate?: string
  overdueGrowth?: boolean
  atNutritionalRisk?: boolean
  needsFollowUp?: boolean
  /** STED age band when applicable */
  ageBand?: '1_3' | '4_6' | null
}

function storageKey(prefix: string, scope: string): string {
  return `${prefix}${scope || 'default'}`
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota / private mode
  }
}

/** Normalize and tokenize a full name for search (first / middle / last). */
export function tokenizeChildName(fullName: string): string[] {
  return fullName
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Case-insensitive match against full name and individual name parts.
 * Query tokens must all appear somewhere in the name (order-independent).
 */
export function matchesChildSearch(child: Child, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  const full = child.fullName.toLowerCase()
  if (full.includes(normalized)) return true

  const nameTokens = tokenizeChildName(child.fullName)
  const queryTokens = normalized.split(/\s+/).filter(Boolean)
  return queryTokens.every((qt) => nameTokens.some((nt) => nt.includes(qt)))
}

export function getRecentChildIds(scope: string): string[] {
  return readJson<string[]>(storageKey(RECENT_PREFIX, scope), [])
}

export function getFrequentChildIds(scope: string): string[] {
  const counts = readJson<Record<string, number>>(storageKey(FREQ_PREFIX, scope), {})
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_FREQUENT)
    .map(([id]) => id)
}

/** Record a selection for recent + frequency ranking. */
export function recordChildSelection(scope: string, childId: string): void {
  const recent = getRecentChildIds(scope).filter((id) => id !== childId)
  recent.unshift(childId)
  writeJson(storageKey(RECENT_PREFIX, scope), recent.slice(0, MAX_RECENT))

  const counts = readJson<Record<string, number>>(storageKey(FREQ_PREFIX, scope), {})
  counts[childId] = (counts[childId] ?? 0) + 1
  writeJson(storageKey(FREQ_PREFIX, scope), counts)
}

export function passesQuickFilter(
  _child: Child,
  filter: ChildPickerQuickFilter,
  meta?: ChildPickerMeta,
  ageYears?: number,
): boolean {
  if (filter === 'all') return true
  if (filter === 'age_1_3') {
    if (meta?.ageBand != null) return meta.ageBand === '1_3'
    return ageYears != null && ageYears >= 1 && ageYears <= 3
  }
  if (filter === 'age_4_6') {
    if (meta?.ageBand != null) return meta.ageBand === '4_6'
    return ageYears != null && ageYears >= 4 && ageYears <= 6
  }
  if (filter === 'needs_follow_up') return !!meta?.needsFollowUp
  if (filter === 'overdue_growth') return !!meta?.overdueGrowth
  if (filter === 'at_nutritional_risk') return !!meta?.atNutritionalRisk
  return true
}

/** Highlight matching query segments within a name (case-insensitive). */
export function splitHighlightParts(
  text: string,
  query: string,
): { text: string; match: boolean }[] {
  const q = query.trim()
  if (!q) return [{ text, match: false }]

  const lowerText = text.toLowerCase()
  const lowerQuery = q.toLowerCase()
  const parts: { text: string; match: boolean }[] = []
  let cursor = 0

  while (cursor < text.length) {
    const idx = lowerText.indexOf(lowerQuery, cursor)
    if (idx === -1) {
      parts.push({ text: text.slice(cursor), match: false })
      break
    }
    if (idx > cursor) {
      parts.push({ text: text.slice(cursor, idx), match: false })
    }
    parts.push({ text: text.slice(idx, idx + q.length), match: true })
    cursor = idx + q.length
  }

  return parts.length > 0 ? parts : [{ text, match: false }]
}

export function formatRelativeGrowthLabel(
  isoDate: string | undefined,
  today: string,
  labels: {
    never: string
    today: string
    yesterday: string
    daysAgo: string
    weeksAgo: string
  },
): string {
  if (!isoDate) return labels.never
  const from = new Date(isoDate)
  const to = new Date(today)
  const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return labels.today
  if (days === 1) return labels.yesterday
  if (days < 14) return labels.daysAgo.replace('{n}', String(days))
  const weeks = Math.floor(days / 7)
  return labels.weeksAgo.replace('{n}', String(weeks))
}

export function sortChildrenForPicker(
  list: Child[],
  recentIds: string[],
  frequentIds: string[],
): Child[] {
  const recentRank = new Map(recentIds.map((id, i) => [id, i]))
  const freqRank = new Map(frequentIds.map((id, i) => [id, i]))

  return [...list].sort((a, b) => {
    const ar = recentRank.has(a.id) ? recentRank.get(a.id)! : 999
    const br = recentRank.has(b.id) ? recentRank.get(b.id)! : 999
    if (ar !== br) return ar - br
    const af = freqRank.has(a.id) ? freqRank.get(a.id)! : 999
    const bf = freqRank.has(b.id) ? freqRank.get(b.id)! : 999
    if (af !== bf) return af - bf
    return a.fullName.localeCompare(b.fullName)
  })
}
