# Offline Operations Guide (Sprint 4.9)

## Mental model

> **Saved here first. Sent to the server when there is internet.**

Caretakers should not need to understand IndexedDB, outbox, CAS, cursors, or device UUIDs.

## Architecture

```text
Service Worker (app shell only)
  → React SPA
  → Feature Repository
  → LocalStore (Dexie / per-user IndexedDB)
  → Outbox
  → SyncEngine (DB lease per cycle)
  → NestJS Sync API
```

React Query is an ephemeral UI projection. MOCK mode never uses LocalStore.

## Local-first domains

| Domain | Offline |
|--------|---------|
| Children (CREATE + READ + partial UPDATE) | Yes — DOB/gender/village edits require internet |
| Attendance | Yes |
| Growth / Nutrition | Yes |
| Feeding / Imirire | Yes |
| STED | Yes |
| Referrals | Yes |
| Transfers | No (online-only) |
| Monitoring / Reporting | No |
| WASH / Compliance | No |

Pilot readiness audit: [`docs/offline-pilot-readiness.md`](./offline-pilot-readiness.md).  
Human checklist: [`docs/offline-field-acceptance.md`](./offline-field-acceptance.md).

## User workspace isolation

Each authenticated user has `ecd-offline-u-{userId}`. Account B cannot see or push account A’s local data. Device registry id is shared. See `adr-offline-user-isolation.md`.

Sync cycles lease the active DB so a mid-cycle account switch cannot redirect pull/push writes into another user’s IndexedDB.

## Sync states (user-visible)

| State | Meaning |
|-------|---------|
| Ku murongo | Online / idle |
| Nta murongo | Offline |
| Turimo kongera guhuza… | Reconnecting |
| Birimo guhuza… | Sync in progress |
| Impinduka N zitegereje | Pending local changes |
| Byahujwe {time} | Last successful sync |
| Guhuza byanze | Sync failed (data kept) |
| Ongera winjire | Auth required (data kept) |
| Birakeneye kwitabwaho | Conflict present |

Shell: `SyncStatusIndicator`. Details + **Huza ubu** + failed/blocked/conflict lists: Settings → pending panel.

## Saved on device vs synced

LIVE mutations confirm **Byabitswe kuri iki gikoresho**. Server sync is reflected by shell pending count / last synced — never claimed as “saved to server” from a local write alone. Storage failures use **Ntabwo byabitswe**.

## Logout

When pending changes exist:

1. **Huza hanyuma usohoke** — sync first; if still pending, stay logged in and explain failure  
2. **Bika ku gikoresho** — logout; workspace retained for that user  
3. **Siba amakuru yo ku gikoresho** — explicit confirm → `clearUserLocalData(userId)` only (requires explicit userId)

## Offline startup

- With local snapshot + offline: LocalStore hydrates UI; no REST required  
- Without snapshot + offline: show “Nta makuru yabitswe…” — never MOCK fallback  
- Access token expired offline: data + outbox kept; sync = AUTH_REQUIRED  

## Reconnect

`OFFLINE → RECONNECTING → SYNCING → ONLINE`. `SyncEngine.syncNow()` is single-flight; network listener is debounced.

## PWA

- Precaches HTML/JS/CSS/icons/fonts  
- **Does not** cache `/api/**` authenticated responses  
- Update mode: `prompt` (no mid-session forced reload)  

## Conflicts

Server wins (CAS). Settings lists affected child/domain + server-wins explanation. Caretaker may **Nemera amakuru ya seriveri** to clear attention after reviewing. Full merge UI is post-pilot.

## Pilot diagnostics (Settings)

Safe local surface (no JWTs / refresh tokens / device secrets):

- Pending / failed / conflict / blocked counts  
- Last successful sync timestamp  
- Last sync error message  
- Conflict / failed / blocked item labels (child/domain)  
- Sync Now control  

## Known limitations

- IndexedDB at rest is readable on a shared device — **encryption is POST-PILOT / P2**
- Browser may evict storage under pressure; write failures must surface as errors (never “saved on device”)
- Full child edit of DOB / gender / home village still requires online REST (sync CAS payload does not apply those fields yet)
- Transfers / monitoring remain online-only
- Service worker updates wait for next cold start (`registerType: 'prompt'`) — no mid-session forced reload

## Controlled-pilot security policy

```text
One primary user per tablet
Device PIN required
No shared browser profiles
Discard data on device handoff
Lost/stolen tablet → disable account immediately
Do not use public/shared computers
Do not leave authenticated tablets unattended
```

## Field acceptance

Human device checklist: [`docs/offline-field-acceptance.md`](./offline-field-acceptance.md).  
Automated companion: `src/sync/field-readiness.test.ts`.

## Lint tooling note

`npm run lint` may report many **pre-existing** findings in Orval-generated clients and older auth/hooks patterns. Do not “fix” generated files by hand — regenerate via Orval when the generator is updated. Sprint 4.9 must not introduce new lint failures in touched offline files.

## Security notes

- Tokens stay in localStorage (session), not domain tables  
- Passwords / reset tokens are never stored in LocalStore  
- Explicit discard clears one user’s workspace only  
- Service worker must never cache authenticated API responses  
