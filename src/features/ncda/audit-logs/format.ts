import type { AuditLogResponseDto } from '@/api/generated/models'
import { ncda } from '@/locales/rw/ncda'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const NAME_KEYS = [
  'fullName',
  'name',
  'childFullName',
  'childName',
  'centerName',
  'districtName',
  'username',
  'label',
  'title',
] as const

const SKIP_KEYS = new Set([
  'id',
  'entityid',
  'entity_id',
  'password',
  'passwordhash',
  'password_hash',
  'refreshtoken',
  'refresh_token',
  'token',
  'accesstoken',
  'deviceid',
  'deviceuuid',
  'device_id',
])

export type AuditNameMap = Map<string, string>

export interface AuditFieldRow {
  key: string
  label: string
  value: string
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim())
}

export function actionLabel(action: string): string {
  const map = ncda.auditLogs.actions as Record<string, string>
  return map[action] ?? action
}

export function entityTypeLabel(entityType: string): string {
  const map = ncda.auditLogs.entityTypes as Record<string, string>
  return map[entityType] ?? map[entityType.toLowerCase()] ?? humanizeKey(entityType)
}

export function fieldLabel(key: string): string {
  const map = ncda.auditLogs.fields as Record<string, string>
  return map[key] ?? map[key.toLowerCase()] ?? humanizeKey(key)
}

export function pickDisplayName(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed && !isUuid(trimmed)) return trimmed
    return null
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const rec = value as Record<string, unknown>
  for (const key of NAME_KEYS) {
    const v = rec[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

export function entityDisplayName(log: AuditLogResponseDto): string {
  return (
    pickDisplayName(log.newValues) ??
    pickDisplayName(log.oldValues) ??
    pickDisplayName(log.metadata) ??
    entityTypeLabel(log.entityType)
  )
}

export function isUserIdKey(key: string): boolean {
  const k = key.toLowerCase().replace(/_/g, '')
  return (
    k === 'changedbyid' ||
    k === 'createdbyid' ||
    k === 'updatedbyid' ||
    k === 'recordedbyid' ||
    k === 'userid' ||
    k === 'actorid' ||
    k === 'changedby' ||
    k === 'createdby' ||
    k.endsWith('byid')
  )
}

export function collectUserIds(log: AuditLogResponseDto): string[] {
  const ids = new Set<string>()
  if (log.changedById && isUuid(log.changedById)) ids.add(log.changedById)

  const walk = (value: unknown, key?: string) => {
    if (value == null) return
    if (isUuid(value) && key && isUserIdKey(key)) ids.add(value)
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, key))
      return
    }
    if (typeof value === 'object') {
      const rec = value as Record<string, unknown>
      if (key && isUserIdKey(key) && typeof rec.id === 'string' && isUuid(rec.id)) {
        ids.add(rec.id)
      }
      for (const [nestedKey, nested] of Object.entries(rec)) walk(nested, nestedKey)
    }
  }

  walk(log.oldValues)
  walk(log.newValues)
  walk(log.metadata)
  return [...ids]
}

export function snapshotToRows(
  snapshot: Record<string, unknown> | null | undefined,
  names: AuditNameMap,
): AuditFieldRow[] {
  if (!snapshot) return []
  const rows: AuditFieldRow[] = []
  for (const [key, raw] of Object.entries(snapshot)) {
    const row = toFieldRow(key, raw, snapshot, names)
    if (row) rows.push(row)
  }
  return rows
}

function toFieldRow(
  key: string,
  raw: unknown,
  parent: Record<string, unknown>,
  names: AuditNameMap,
): AuditFieldRow | null {
  const normalized = key.toLowerCase().replace(/_/g, '')
  if (SKIP_KEYS.has(normalized) || normalized === 'id') return null
  if (raw == null || raw === '') return null

  if (looksLikeIdKey(key)) {
    const resolved = resolveIdValue(key, raw, parent, names)
    if (!resolved) return null
    return { key, label: fieldLabel(displayKeyForId(key)), value: resolved }
  }

  const formatted = formatValue(raw, names)
  if (!formatted) return null
  return { key, label: fieldLabel(key), value: formatted }
}

function looksLikeIdKey(key: string): boolean {
  const k = key.toLowerCase().replace(/_/g, '')
  if (SKIP_KEYS.has(k) || k === 'id') return true
  return k.endsWith('id')
}

function displayKeyForId(key: string): string {
  return key.replace(/[_-]?id$/i, '').replace(/Id$/, '')
}

function resolveIdValue(
  key: string,
  raw: unknown,
  parent: Record<string, unknown>,
  names: AuditNameMap,
): string | null {
  if (raw && typeof raw === 'object') {
    return pickDisplayName(raw) ?? formatValue(raw, names)
  }
  if (typeof raw !== 'string') return null
  if (names.has(raw)) return names.get(raw) ?? null
  const companion = companionName(key, parent)
  if (companion) return companion
  if (!isUuid(raw)) return raw
  return null
}

function companionName(key: string, parent: Record<string, unknown>): string | null {
  const base = displayKeyForId(key)
  const candidates = [
    `${base}Name`,
    `${base}FullName`,
    `${base}Label`,
    base,
    `${key.replace(/Id$/, '')}Name`,
  ]
  for (const candidate of candidates) {
    const value = parent[candidate]
    const name = pickDisplayName(value)
    if (name) return name
  }
  return null
}

function formatValue(value: unknown, names: AuditNameMap): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'boolean') return value ? ncda.auditLogs.yes : ncda.auditLogs.no
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    if (isUuid(value)) return names.get(value) ?? null
    if (isIsoDate(value)) return formatDateTime(value)
    return value
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatValue(item, names) ?? pickDisplayName(item))
      .filter((item): item is string => Boolean(item))
    return parts.length ? parts.join(', ') : null
  }
  if (typeof value === 'object') {
    const named = pickDisplayName(value)
    if (named) return named
    const nested = snapshotToRows(value as Record<string, unknown>, names)
      .map((row) => `${row.label}: ${row.value}`)
      .join(' · ')
    return nested || null
  }
  return String(value)
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}(T|\s|$)/.test(value)) return false
  return !Number.isNaN(Date.parse(value))
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso.slice(0, 19)
  }
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase())
}

const STASH_PREFIX = 'ncda-audit-log:'

export function stashAuditLog(log: AuditLogResponseDto): void {
  try {
    sessionStorage.setItem(`${STASH_PREFIX}${log.id}`, JSON.stringify(log))
  } catch {
    /* ignore quota / private mode */
  }
}

export function readStashedAuditLog(id: string): AuditLogResponseDto | null {
  try {
    const raw = sessionStorage.getItem(`${STASH_PREFIX}${id}`)
    if (!raw) return null
    return JSON.parse(raw) as AuditLogResponseDto
  } catch {
    return null
  }
}
