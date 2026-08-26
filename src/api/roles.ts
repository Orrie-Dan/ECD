import type { UserRole } from '@/types'

/**
 * Centralized API ↔ UI role normalization.
 *
 * Backend roles must never be compared in UI components.
 * Always normalize first, then use `hasRole` / helpers.
 *
 * Mapping:
 *   caregiver              → caretaker
 *   ecd_director           → ecdDirector  (same ECD center pages as caregiver)
 *   district_focal_person  → districtOfficer
 *   ncda_admin             → ncda
 *
 * Unknown API roles fail closed (never default to District or NCDA).
 */

export type BackendUserRole =
  | 'caregiver'
  | 'ecd_director'
  | 'district_focal_person'
  | 'ncda_admin'

export type UiUserRole = UserRole

export type AppHomePath = '/caretaker' | '/district' | '/ncda'

const API_TO_UI_ROLE: Record<BackendUserRole, UiUserRole> = {
  caregiver: 'caretaker',
  ecd_director: 'ecdDirector',
  district_focal_person: 'districtOfficer',
  ncda_admin: 'ncda',
}

/** Reverse map for requests that need a backend role. */
const UI_TO_API_ROLE: Record<UiUserRole, BackendUserRole> = {
  caretaker: 'caregiver',
  ecdDirector: 'ecd_director',
  districtOfficer: 'district_focal_person',
  ncda: 'ncda_admin',
}

const HOME_PATH: Record<UiUserRole, AppHomePath> = {
  caretaker: '/caretaker',
  ecdDirector: '/caretaker',
  districtOfficer: '/district',
  ncda: '/ncda',
}

/** Already-normalized UI role strings accepted for passthrough (e.g. mock session). */
const UI_ROLE_PASSTHROUGH = new Set<string>([
  'caretaker',
  'ecdDirector',
  'districtOfficer',
  'ncda',
])

/** Caregiver + ECD director share the center (Umurezi) portal. */
export const ECD_CENTER_ROLES: UiUserRole[] = ['caretaker', 'ecdDirector']

export function isBackendUserRole(value: string): value is BackendUserRole {
  return value in API_TO_UI_ROLE
}

export class UnknownUserRoleError extends Error {
  readonly apiRole: string

  constructor(apiRole: string) {
    super(`Unsupported user role: ${apiRole}`)
    this.name = 'UnknownUserRoleError'
    this.apiRole = apiRole
  }
}

/** Map an API / JWT role string to the UI role used by routes and guards. */
export function normalizeRole(apiRole: string): UiUserRole {
  if (isBackendUserRole(apiRole)) {
    return API_TO_UI_ROLE[apiRole]
  }
  if (UI_ROLE_PASSTHROUGH.has(apiRole)) {
    return apiRole as UiUserRole
  }
  // Fail closed — never grant District or NCDA access to unrecognized roles.
  throw new UnknownUserRoleError(apiRole)
}

/** Map a UI role back to the primary backend role for outbound DTOs. */
export function denormalizeRole(uiRole: UiUserRole): BackendUserRole {
  return UI_TO_API_ROLE[uiRole]
}

/** Alias matching the sprint vocabulary. */
export const mapApiRoleToUi = normalizeRole
export const mapUiRoleToApi = denormalizeRole

type RoleBearer = { role: UiUserRole } | null | undefined

/** True when the user has one of the given UI roles. */
export function hasRole(user: RoleBearer, role: UiUserRole | UiUserRole[]): boolean {
  if (!user) return false
  const allowed = Array.isArray(role) ? role : [role]
  return allowed.includes(user.role)
}

export function isCaretaker(user: RoleBearer): boolean {
  return hasRole(user, 'caretaker')
}

export function isEcdDirector(user: RoleBearer): boolean {
  return hasRole(user, 'ecdDirector')
}

/** Director-only ECD book registers and center management mutations. */
export function canDirectorMutate(user: RoleBearer): boolean {
  return isEcdDirector(user)
}

/** Caregiver or ECD director — same center operational pages. */
export function isEcdCenterUser(user: RoleBearer): boolean {
  return hasRole(user, ECD_CENTER_ROLES)
}

export function isDistrictOfficer(user: RoleBearer): boolean {
  return hasRole(user, 'districtOfficer')
}

export function isNcda(user: RoleBearer): boolean {
  return hasRole(user, 'ncda')
}

/**
 * ECD login (`/login/caretaker`) accepts both caregiver and ECD director.
 * District / NCDA logins remain exact-role.
 */
export function loginRoleMatches(actual: UiUserRole, expected: UiUserRole): boolean {
  if (hasRole({ role: expected }, ECD_CENTER_ROLES)) {
    return hasRole({ role: actual }, ECD_CENTER_ROLES)
  }
  return actual === expected
}

/** Default post-login / wrong-role redirect for a UI role. */
export function homePathForRole(role: UiUserRole): AppHomePath {
  return HOME_PATH[role]
}

export function homePathForUser(user: RoleBearer): AppHomePath | '/' {
  if (!user) return '/'
  return homePathForRole(user.role)
}
