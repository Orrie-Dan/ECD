import type { Child } from '@/types'

type ChildRouteLike = Pick<Child, 'fullName'> & Partial<Pick<Child, 'id'>>

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuidLike(value: string | undefined | null): boolean {
  return Boolean(value && UUID_RE.test(value.trim()))
}

export function slugifyChildName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'umwana'
}

export function buildChildDetailPath(basePath: string, child: ChildRouteLike, tab?: string): string {
  // LIVE detail APIs require the database UUID. Prefer id when present so
  // district/NCDA pages can resolve without a hydrated roster. This is an
  // intentional remaining URL exposure until a stable child publicId exists.
  // Do not put nationalId in URLs (sensitive). Do not use bare name slugs as
  // the primary key (non-unique). Mock-only flows may fall back to a slug.
  const routeKey = child.id?.trim() || slugifyChildName(child.fullName)
  const path = `${basePath}/${encodeURIComponent(routeKey)}`
  return tab ? `${path}?tab=${encodeURIComponent(tab)}` : path
}

export function buildChildEditPath(basePath: string, child: ChildRouteLike): string {
  return `${buildChildDetailPath(basePath, child)}/hindura`
}

export function findChildByRouteKey(children: Child[], routeKey: string | undefined): Child | undefined {
  if (!routeKey) return undefined
  const normalizedKey = routeKey.trim()
  if (!normalizedKey) return undefined

  const slugKey = slugifyChildName(decodeURIComponent(normalizedKey))

  return children.find(
    (child) => child.id === normalizedKey || slugifyChildName(child.fullName) === slugKey,
  )
}
