/**
 * Offline authentication cache.
 *
 * After a successful online login the credential hash, user profile, and
 * last-known tokens are persisted to localStorage. When a subsequent login
 * attempt fails due to a network error the cached hash is verified locally
 * so the user can continue working offline.
 *
 * The first login for any user must always be online.
 */

import { hashPassword, verifyPassword } from '@/lib/crypto'
import type { LoginSession } from '@/api/resources/auth'

const STORAGE_KEY = 'ecd_offline_auth_cache'

interface CachedCredential {
  username: string
  passwordHash: string
  session: LoginSession
  cachedAt: number
}

type CacheMap = Record<string, CachedCredential>

function readCache(): CacheMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CacheMap) : {}
  } catch {
    return {}
  }
}

function writeCache(cache: CacheMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
}

/**
 * Store credentials after a successful online login.
 * Keyed by lowercase username so lookup is case-insensitive.
 */
export async function cacheLoginSession(
  username: string,
  password: string,
  session: LoginSession,
): Promise<void> {
  const cache = readCache()
  cache[username.toLowerCase()] = {
    username,
    passwordHash: await hashPassword(password),
    session,
    cachedAt: Date.now(),
  }
  writeCache(cache)
}

/**
 * Attempt offline credential verification.
 * Returns the cached session on success, null if no cache or wrong password.
 */
export async function verifyOfflineLogin(
  username: string,
  password: string,
): Promise<LoginSession | null> {
  const entry = readCache()[username.toLowerCase()]
  if (!entry) return null
  const valid = await verifyPassword(password, entry.passwordHash)
  return valid ? entry.session : null
}

/** Remove cached credentials for a specific user. */
export function clearCachedLogin(username: string): void {
  const cache = readCache()
  delete cache[username.toLowerCase()]
  writeCache(cache)
}

/** Remove all cached credentials (used on explicit logout). */
export function clearAllCachedLogins(): void {
  localStorage.removeItem(STORAGE_KEY)
}
