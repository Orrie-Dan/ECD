import { isSyntheticChildLabel } from '@/lib/follow-up-alerts'
import { notificationsLocale as t } from '@/locales/rw/notifications'
import type { NotificationType, NotificationViewModel } from '@/models/notifications'
import type { Child } from '@/types'

export interface FormattedNotification {
  title: string
  message: string
}

type ChildRef = Pick<Child, 'id' | 'fullName'>

function replaceTokens(
  template: string,
  tokens: Record<string, string>,
): string {
  return Object.entries(tokens).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  )
}

function metaString(
  metadata: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  // Nested objects commonly used by APIs: { child: { id, fullName } }
  for (const nestedKey of ['child', 'payload', 'data', 'entity']) {
    const nested = metadata[nestedKey]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const found = metaString(nested as Record<string, unknown>, ...keys)
      if (found) return found
    }
  }
  return null
}

function looksEnglish(text: string): boolean {
  return /\b(the|and|has|have|been|for|from|to|with|child|transfer|referral|attendance|assessment|screening|compliance|capacity|enrolled|archived|pending|requested|accepted|cancelled|warning|follow.?up|was|were)\b/i.test(
    text,
  )
}

/** Pull a person name out of English API copy when metadata is missing. */
function extractPersonNameFromText(text: string): string | null {
  if (!text?.trim()) return null

  const patterns = [
    /\b(?:for|of)\s+([A-ZÀ-ÖØ-öø-ÿ][\wÀ-ÖØ-öø-ÿ''.-]*(?:\s+[A-ZÀ-ÖØ-öø-ÿ][\wÀ-ÖØ-öø-ÿ''.-]*){1,3})\b/,
    /\b([A-ZÀ-ÖØ-öø-ÿ][\wÀ-ÖØ-öø-ÿ''.-]*(?:\s+[A-ZÀ-ÖØ-öø-ÿ][\wÀ-ÖØ-öø-ÿ''.-]*){1,3})(?:'s)?\s+transfer\b/i,
    /^([A-ZÀ-ÖØ-öø-ÿ][\wÀ-ÖØ-öø-ÿ''.-]*(?:\s+[A-ZÀ-ÖØ-öø-ÿ][\wÀ-ÖØ-öø-ÿ''.-]*){1,3})\b/,
  ]

  for (const pattern of patterns) {
    const match = text.trim().match(pattern)
    const name = match?.[1]?.trim()
    if (name && !isSyntheticChildLabel(name) && !looksEnglish(name)) {
      return name
    }
  }

  return null
}

function resolveChildId(n: NotificationViewModel): string | null {
  const fromMeta = metaString(n.metadata, 'childId', 'child_id', 'id')
  // Avoid treating transfer UUID as child id when nested under transfer entity
  if (fromMeta && n.entityType === 'child_transfer') {
    const explicit = metaString(n.metadata, 'childId', 'child_id')
    if (explicit) return explicit
    const nestedChild = n.metadata?.child
    if (nestedChild && typeof nestedChild === 'object' && !Array.isArray(nestedChild)) {
      const id = (nestedChild as Record<string, unknown>).id
      if (typeof id === 'string' && id.trim()) return id.trim()
    }
  } else if (fromMeta && n.entityType !== 'child_transfer') {
    return fromMeta
  }

  if (
    n.entityId &&
    (n.entityType === 'child' ||
      n.entityType === 'child_nutrition_screening' ||
      n.entityType === 'referral' ||
      n.entityType === 'sted_assessment')
  ) {
    return n.entityId
  }

  return metaString(n.metadata, 'childId', 'child_id')
}

function resolveChildName(
  n: NotificationViewModel,
  children?: readonly ChildRef[],
): string | null {
  const childId = resolveChildId(n)
  const local = childId ? children?.find((c) => c.id === childId) : undefined
  if (local?.fullName?.trim() && !isSyntheticChildLabel(local.fullName)) {
    return local.fullName.trim()
  }

  const fromMeta = metaString(
    n.metadata,
    'childName',
    'childFullName',
    'fullName',
    'name',
  )
  if (fromMeta && !isSyntheticChildLabel(fromMeta)) return fromMeta

  const fromTitle = extractPersonNameFromText(n.title)
  if (fromTitle) return fromTitle

  const fromMessage = extractPersonNameFromText(n.message)
  if (fromMessage) return fromMessage

  if (children?.length) {
    const blob = `${n.title} ${n.message}`.toLowerCase()
    const hit = children.find(
      (c) =>
        c.fullName.trim().length > 1 &&
        !isSyntheticChildLabel(c.fullName) &&
        blob.includes(c.fullName.trim().toLowerCase()),
    )
    if (hit) return hit.fullName.trim()
  }

  return null
}

function resolveCenterName(n: NotificationViewModel): string {
  const fromMeta = metaString(
    n.metadata,
    'centerName',
    'toCenterName',
    'fromCenterName',
    'ecdCenterName',
  )
  if (fromMeta) return fromMeta
  return t.alerts.unnamedCenter
}

function typeTitle(type: NotificationType): string {
  return t.types[type] ?? t.types.general
}

function messageTemplate(type: NotificationType, hasName: boolean): string {
  const messages = t.messages as Record<string, string>
  if (!hasName) {
    const noName = messages[`${type}NoName`]
    if (noName) return noName
  }
  return messages[type] ?? messages.general
}

function scrubSyntheticIds(text: string, replacement: string): string {
  if (!text) return text
  return text
    .replace(/\b[A-Z0-9]{2,}\s+Child-[A-Za-z0-9_-]+\b/gi, replacement)
    .replace(/\bChild-[A-Za-z0-9_-]+\b/gi, replacement)
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Localize notification title/body. Prefer a real child name; when missing,
 * use nameless Kinyarwanda templates (never "Kwimura kwa byemerewe").
 */
export function formatNotification(
  n: NotificationViewModel,
  children?: readonly ChildRef[],
): FormattedNotification {
  const type = (t.types[n.type] ? n.type : 'general') as NotificationType
  const name = resolveChildName(n, children)
  const center = resolveCenterName(n)
  const template = messageTemplate(type, Boolean(name))

  const scrubbedApi = scrubSyntheticIds(n.message || n.title || '', name ?? '')

  const message = replaceTokens(template, {
    name: name ?? '',
    center,
    message: scrubbedApi || typeTitle(type),
  })
    .replace(/\s{2,}/g, ' ')
    .trim()

  const title = name ? `${typeTitle(type)} — ${name}` : typeTitle(type)

  return { title, message }
}
