# ADR: Offline User Isolation (Sprint 4.8.6)

## Status

Accepted — 2026-08-10

## Context

Sprint 4.8.0–4.8.5 delivered a working offline-first stack (LocalStore / Dexie / outbox / SyncEngine) for children, attendance, nutrition, feeding, STED, and referrals.

Audit of the pre-4.8.6 code showed the LocalStore was **device-scoped shared disk**, not user-scoped:

- One IndexedDB (`ecd-offline`) for every account on the browser
- Outbox rows had no `ownerUserId`
- Pull cursors / `lastSyncedAt` were global meta keys
- Logout defaulted to keep-on-device, so User B could hydrate User A’s data and push User A’s pending ops under User B’s JWT
- Device UUID / registry id correctly survived logout, but soft `userId` on the device row was not rebound

## Decision

### Ownership model

| Concern | Classification | Isolation mechanism |
|---------|----------------|---------------------|
| Domain tables (children, attendance, nutrition, feeding, STED, referrals) | User workspace (server is center-scoped) | Per-user IndexedDB `ecd-offline-u-{userId}` |
| `sync_operations` | User-owned | Same DB + required `ownerUserId` stamp + push guard |
| `sync_sessions` | User sync metadata | Same DB + optional `ownerUserId` |
| Pull cursor / lastSyncedAt / snapshot flags | User sync metadata | Live inside the per-user DB |
| `device` row + `ecd_device_uuid` / `ecd_device_id` | Device-owned (shared) | localStorage registry id reused; mirrored into active workspace |
| `village_cache` | Reference / global-ish | Per-user copy (low sensitivity) |

Canonical server ownership for operational entities remains **center-based**. Local isolation is stricter: each authenticated account gets a private offline workspace so cross-account leakage is impossible even when two caretakers share a center.

### Account switching

On login / `/auth/me` identity bind:

1. `activateLocalWorkspace(userId, centerId)` opens `ecd-offline-u-{userId}`
2. React Query cache is cleared when the owner changes
3. Legacy shared `ecd-offline` is migrated **once** into the matching user’s DB (never into a mismatched user)
4. Device registration reuses the existing registry UUID; local device meta is updated for the active user without minting a duplicate backend device

User A’s pending work stays dormant in A’s database while B is active. Sync never selects or pushes those rows.

### Outbox ownership (hard guard)

- Every enqueue stamps `ownerUserId` from the active owner (sticky on coalesce)
- `selectPushBatch` / `pushOutbox` require `ownerUserId` and filter strictly
- Rebinding an existing concrete owner to another user throws
- Never silently attach User A’s op to User B’s JWT

### Logout semantics

| Case | Behavior |
|------|----------|
| A. No pending | Safe logout → `keep_on_device` + deactivate active owner |
| B. Pending | Block cancel probe; require keep / discard / sync-then-logout |
| C. Offline | Same as B — never silent delete |
| D. Keep on device | Durable user DB retained; unavailable to other accounts |
| E. Discard | `clearUserLocalData(userId)` — scoped wipe only |
| F. Sync then logout | Sync first; logout only when pending clears |

UI minimum: Caretaker logout presents Sync then logout / Keep on device / Discard (with confirm) when pending work exists (Sprint 4.8.7).

### Auth expiry

- Access token expired offline → `AUTH_REQUIRED`; IndexedDB untouched
- Refresh succeeds → resume sync under the same owner
- Refresh expired → require login; preserve ownership + pending work
- Re-login as same user → `activateLocalWorkspace` restores data and outbox

### Dexie migration

- Schema version **6**: `ownerUserId` indexes on `sync_operations` / `sync_sessions`
- Upgrade stamps missing outbox owners as `__legacy_unowned__` (claimable, never auto-rebound to the wrong user)
- Existing unsynced data is copied into the first matching user’s per-user DB — no `indexedDB.deleteDatabase` / `clearAll` on upgrade

### React Query

Ephemeral projection only. Logout and account switch call `queryClient.clear()` so User B cannot flash User A’s cache while LocalStore hydrates.

### Security assumptions (deferred encryption)

- Local PII remains readable via XSS / shared-computer IndexedDB inspection
- Tokens remain in localStorage
- Isolation prevents **cross-account** leakage inside the app; it does not encrypt at rest
- Encryption is a future hardening sprint

## Consequences

- Multi-account shared browsers are safe for offline domains migrated to date
- Sync metadata cannot cross users
- Device registration stays stable across accounts
- Transfers / Monitoring / Reporting / encryption remain out of scope
- PWA app shell is implemented (Sprint 4.8.7); API responses are not SW-cached

## Related

- `docs/adr-offline-first-foundation.md` — foundation ADR (updated with ownership section)
