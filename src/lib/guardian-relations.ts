import type { GuardianRelation } from '@/types'

export const relations = {
  umubyeyi_mama: 'Umubyeyi (Mama)',
  umubyeyi_papa: 'Umubyeyi (Papa)',
  sekuru_nyirakuru: 'Sekuru/Nyirakuru',
  nyirasenge_marume: 'Nyirasenge/Marume',
  umuvandimwe: 'Umuvandimwe',
  umubyeyi_urera: 'Umubyeyi urera umwana utari uwe',
  umurinzi_wemewe: "Umurinzi wemewe n'amategeko",
  ikindi: 'Ikindi',
} as const satisfies Record<GuardianRelation, string>

export const GUARDIAN_RELATION_OPTIONS: { value: GuardianRelation; label: string }[] = [
  { value: 'umubyeyi_mama', label: relations.umubyeyi_mama },
  { value: 'umubyeyi_papa', label: relations.umubyeyi_papa },
  { value: 'sekuru_nyirakuru', label: relations.sekuru_nyirakuru },
  { value: 'nyirasenge_marume', label: relations.nyirasenge_marume },
  { value: 'umuvandimwe', label: relations.umuvandimwe },
  { value: 'umubyeyi_urera', label: relations.umubyeyi_urera },
  { value: 'umurinzi_wemewe', label: relations.umurinzi_wemewe },
  { value: 'ikindi', label: relations.ikindi },
]

export const OTHER_RELATION_VALUE: GuardianRelation = 'ikindi'

export function getGuardianRelationLabel(relation?: GuardianRelation | string): string {
  if (!relation) return ''
  return relations[relation as GuardianRelation] ?? relation
}

/** Maps legacy relation keys from earlier app versions. */
const LEGACY_RELATION_MAP: Record<string, GuardianRelation> = {
  mama: 'umubyeyi_mama',
  papa: 'umubyeyi_papa',
  umuturanyi: 'ikindi',
  undi: 'ikindi',
}

export function normalizeGuardianRelation(relation?: string): GuardianRelation | undefined {
  if (!relation) return undefined
  if (relation in relations) return relation as GuardianRelation
  return LEGACY_RELATION_MAP[relation]
}
