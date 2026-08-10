import type { UserRole } from '@/types'

/**
 * Centralized API ↔ UI role normalization.
 *
 * Backend roles must never be compared in UI components.
 * Always normalize first, then use `hasRole` / helpers.
 *
 * Mapping:
 *   caregiver              → caretaker
 *   district_focal_person  → districtOfficer
 *   ncda_admin             → districtOfficer
 */

export type BackendUserRole = 'caregiver' | 'district_focal_person' | 'ncda_admin'

export type UiUserRole = UserRole

const API_TO_UI_ROLE: Record<BackendUserRole, UiUserRole> = {
  caregiver: 'caretaker',
  district_focal_person: 'districtOfficer',
  ncda_admin: 'districtOfficer',
}

/** Reverse map for requests that need a backend role. NCDA collapses to district officer UI-side. */
const UI_TO_API_ROLE: Record<UiUserRole, BackendUserRole> = {
  caretaker: 'caregiver',
  districtOfficer: 'district_focal_person',
}

const HOME_PATH: Record<UiUserRole, '/caretaker' | '/district'> = {
  caretaker: '/caretaker',
  districtOfficer: '/district',
}

export function isBackendUserRole(value: string): value is BackendUserRole {
  return value in API_TO_UI_ROLE
}

/** Map an API / JWT role string to the UI role used by routes and guards. */
export function normalizeRole(apiRole: string): UiUserRole {
  if (isBackendUserRole(apiRole)) {
    return API_TO_UI_ROLE[apiRole]
  }
  if (apiRole === 'caretaker' || apiRole === 'districtOfficer') {
    return apiRole
  }
  return 'districtOfficer'
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

export function isDistrictOfficer(user: RoleBearer): boolean {
  return hasRole(user, 'districtOfficer')
}

/** Default post-login / wrong-role redirect for a UI role. */
export function homePathForRole(role: UiUserRole): '/caretaker' | '/district' {
  return HOME_PATH[role]
}

export function homePathForUser(user: RoleBearer): '/caretaker' | '/district' {
  if (!user) return '/district'
  return homePathForRole(user.role)
}
