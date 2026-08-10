# ADR: Offline-First Foundation (Sprint 4.8.0)

## Status

Accepted — 2026-08-10

## Context

ECD caretakers operate with unreliable connectivity. Sprint 4.7 established that the NestJS backend already provides device registration, async sync push, session polling, keyset pull `(lastModifiedAt, id)`, `clientOperationId` idempotency, and CAS/`version` conflict handling.

The frontend was online-first: repositories awaited REST success, React Query held volatile cache, and generated sync/device clients were unused.

## Decision

### 1. IndexedDB via Dexie as durable source of truth

Domain offline data and the sync outbox live in IndexedDB. Dexie is used only behind a `LocalStore` interface so a future React Native adapter can replace it without touching feature repositories.

**React Query is not the durable store.** It remains a UI projection/cache hydrated from `LocalStore`.

### 2. LocalStore abstraction

```text
src/storage/
  local-store.ts      # interface
  dexie-local-store.ts
  db.ts / schema.ts / types.ts
```

Feature code imports `LocalStore` / `getLocalStore()`, never `Dexie`.

### 3. Outbox design

Table `sync_operations` stores pending mutations with:

- stable `clientOperationId` (UUID, never regenerated on retry)
- client-generated `entityId` (UUID) for creates
- `dependsOn[]` for cross-entity ordering
- statuses: `pending | blocked | syncing | applied | conflict | failed`

Entity write + outbox insert must be atomic (Dexie transaction).

### 4. Sync state machine

Engine statuses: `IDLE | SYNCING | SYNC_ERROR | CONFLICT_PRESENT | AUTH_REQUIRED | OFFLINE`.

Network statuses (separate): `ONLINE | OFFLINE | RECONNECTING`.

### 5. Push / pull

Reuse Orval clients:

- `POST /api/v1/sync/push` — max 500 ops, dependency-ready only, ordered by `createdAt`
- `GET /api/v1/sync/sessions/:id` — poll until terminal
- `GET /api/v1/sync/pull` — keyset `cursor` + `cursorId`; advance cursor **only after** successful local apply

### 6. Client-generated UUIDs

Creates use `crypto.randomUUID()` (via `createUuid()`). Never `Date.now()` for entity or operation identity. The same UUID is the server entity id (no remapping).

### 7. Dependency ordering

Frontend blocks ops whose `dependsOn` are not `applied`. Backend applies a session in `createdAt` order; clients must not push blocked ops.

### 8. Conflict strategy

Server wins (backend CAS). Conflict ops are marked `conflict` with reason; client must pull and decide (manual/auto per domain in later sprints). No silent last-write-wins on the client.

### 9. Authentication while offline

Access-token expiry must **not** clear IndexedDB or the outbox. Sync enters `AUTH_REQUIRED`. Local reads/writes continue when a snapshot exists. On reconnect, refresh tokens then sync; if refresh is dead, prompt sign-in while keeping local work.

### 10. Logout policy

Default: block logout while unsynced ops exist unless the user explicitly chooses keep-on-device, sync-then-logout, or discard. Never silently wipe pending work.

### 11. MOCK vs OFFLINE

| Mode | Meaning |
|------|---------|
| MOCK (`VITE_API_MODE=mock`) | In-memory demo data; unchanged |
| OFFLINE | Runtime network state with durable IndexedDB + outbox |

Never `if (!online) return MOCK_DATA`.

### 12. Device registration

On LIVE login: ensure device via `devicesControllerRegister`, persist registry UUID as `ecd_device_id` (Axios `x-device-id`) and in LocalStore. Idempotent per browser `deviceUuid`. Failure must not delete offline data.

### 13. Domain migration status

Migrated local-first (LocalStore + outbox + SyncEngine):

| Domain | Notes |
|--------|--------|
| Children | CREATE + READ PoC |
| Attendance | Natural-key upsert |
| Growth/Nutrition | Append-only screening + referral `dependsOn` |
| Feeding | Day/month upsert |
| STED | Append-only + referral `dependsOn` |
| Referrals | CREATE + status UPDATE (CAS) + local-first reads (Sprint 4.8.5) |

Still online-only / deferred: Transfers, Monitoring aggregates, Reporting, encryption.

PWA / offline shell: **implemented in Sprint 4.8.7** (app-shell caching only). See `offline-operations.md`.

## User / Device / Local Data Ownership

Sprint **4.8.6** hardened multi-account safety. Full write-up: [`adr-offline-user-isolation.md`](./adr-offline-user-isolation.md).

### Ownership model

- **Per-user IndexedDB** `ecd-offline-u-{userId}` holds that account’s domain rows, outbox, sync sessions, and pull cursor.
- **Shared device identity** (`ecd_device_uuid`, `ecd_device_id`) survives logout and is reused across accounts — no duplicate backend devices on account switch.
- Outbox rows carry sticky `ownerUserId`. Push/select refuse foreign owners; rebind throws.

### User switching

`activateLocalWorkspace(userId)` opens the user DB, binds the active owner, clears React Query when the owner changes, and optionally migrates the legacy shared `ecd-offline` DB only when it belongs to that user.

### Logout semantics

Never silently destroy pending work. Supported actions: `keep_on_device` (default safe path), `discard_local` (scoped wipe via `clearUserLocalData`), `sync_then_logout`. Keep leaves the user’s durable DB intact but unavailable to other accounts.

### Auth expiration

Access/refresh expiry → `AUTH_REQUIRED` without wiping LocalStore. Re-login restores the same user’s workspace and pending ops.

### Scoped wipe

`clearUserLocalData(userId)` removes that user’s domain + outbox + sync meta. It does not delete other users’ databases or shared device localStorage keys.

### Security assumptions

Isolation prevents cross-account app leakage. At-rest encryption of IndexedDB PII remains deferred.

## Consequences

- LIVE children create no longer awaits REST; it writes locally and syncs.
- First online session still bootstraps empty IDB via REST list or sync pull.
- Village geo resolution may block sync until online/cached (`homeVillageId`).
- Referral status/notes are durable offline; conflict = server wins via pull.
- Monitoring/reporting/transfers remain online-only.
- Multiple authenticated users may share one browser without seeing each other’s offline datasets.