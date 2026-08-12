# POST Endpoints & LIVE/MOCK Write Audit

**Date:** 2026-08-12  
**Scope:** All user-facing writes that should reach the Nest API in LIVE mode  
**Related issue:** Production Vercel builds without `VITE_API_MODE=live` silently used MOCK paths (no POST), while UI showed misleading errors (`formIncomplete`, fake success).

---

## Executive summary

| Category | Count | Status after fixes |
|----------|-------|-------------------|
| Direct REST POST (auth, device, transfers, user admin) | 8 active paths | Guarded + clearer errors |
| Caretaker field writes (local-first → `POST /sync/push`) | 7 entity types | Repository guards + error mapping |
| Generated POST wrappers unused by LIVE UI | 10+ | By design (sync path) |
| Production MOCK fake-persist | All caretaker writes | **Blocked** via `assertLiveApiWritesAvailable()` |

**Root cause of “no POST” reports:** Vite bakes `VITE_API_MODE` at build time. Missing env on Vercel → `apiMode: mock` → repositories never call Axios.

**Required production env (Vercel):**

| Variable | Value |
|----------|-------|
| `VITE_API_MODE` | `live` |
| `VITE_API_BASE_URL` | `https://ecd-backend-bda8.onrender.com` (no trailing slash) |

Redeploy after setting env vars.

---

## Architecture: two LIVE write patterns

### 1. Local-first → sync push (caretaker field data)

```
UI → DataProvider repository → LocalStore + outbox
     → SyncEngine.syncNow() → POST /api/v1/sync/push
```

Entity types in outbox: `child`, `attendance_record`, `child_nutrition_screening`, `center_feeding_day`, `center_feeding_month_summary`, `sted_assessment`, `referral`.

**Note:** You may not see entity POSTs in DevTools on button click. Expect `POST /sync/push` shortly after save when online + device registered.

### 2. Direct REST POST/PATCH

| Flow | Endpoint |
|------|----------|
| Login | `POST /api/v1/auth/login` |
| Refresh | `POST /api/v1/auth/refresh` |
| Device register | `POST /api/v1/devices/register` |
| Child demographics (online edit) | `PATCH /api/v1/children/:id` |
| Transfer out | `POST /api/v1/transfers` |
| District/NCDA user create | `POST /api/v1/users` |
| Password reset (admin) | `POST /api/v1/users/:id/reset-password` |

---

## Feature workflow matrix

| Feature | User action | LIVE POST path | MOCK behavior | Guard | Risk |
|---------|-------------|----------------|---------------|-------|------|
| **Login** | Sign in | `POST /auth/login` | Demo credentials only | `isProductionMock` → `api_unavailable` | P0 |
| **Device** | After login | `POST /devices/register` | Skipped | Toast on failure | P1 |
| **Sync** | After any local write | `POST /sync/push` | No-op | Requires LIVE + device | P0 |
| **Register child** | Wizard submit | Outbox → sync push | In-memory list | Repository guard | P1 |
| **Edit child** | Save | Outbox and/or `PATCH /children/:id` | In-memory | Repository guard | P1 |
| **Archive / reactivate** | Confirm | Outbox → sync push | In-memory | Repository guard + dialog errors | P1 |
| **Transfer out** | Submit | `POST /transfers` | In-memory | Repository guard | P1 |
| **Transfer accept** | Accept | `POST /transfers/:id/accept` | In-memory only | **Not implemented LIVE** | P0 gap |
| **Attendance** | Record / clear | Outbox → sync push | In-memory | Repository guard | P1 |
| **Growth** | Record / correct | Outbox → sync push | In-memory | Repository guard | P1 |
| **Feeding daily** | Save day | Outbox → sync push | In-memory | Repository guard | P1 |
| **Feeding monthly** | Save summary | Outbox → sync push | In-memory | Repository guard | P1 |
| **STED** | New assessment | Outbox → sync push | In-memory | Repository guard | P1 |
| **Referrals** | Status / notes | Outbox → sync push | In-memory | Repository guard | P1 |
| **District caregivers** | Create user | `POST /users` | Page shows mock-only | Page `env.isLive` gate | P2 |
| **NCDA users** | Create / reset | `POST /users`, reset-password | Page shows mock-only | Page `env.isLive` gate | P2 |
| **Settings** | Save profile | — | Fake save | LIVE blocked intentionally | P2 |
| **Compliance / WASH write** | — | Generated POST exists | Not wired | Future scope | P2 |

---

## Fixes applied (2026-08-12)

### Production MOCK blocking

- `src/lib/live-api-guard.ts` — `assertLiveApiWritesAvailable()`, `ProductionMockWritesBlockedError`
- All caretaker repository write functions call `assertLiveApiWritesAvailable()` before MOCK branch
- `CaretakerLayout` shows `ProductionMockBanner` on every caretaker page
- Login already returns `api_unavailable` in `AppContext`

### Error message accuracy

- `src/offline/mutation-error-message.ts` — maps centerId/user/session/API errors; no longer defaults all failures to child-registration copy
- `ArchiveDialog`, `ReactivateChildDialog`, `TransferDialog` use `messageForMutationFailure`
- `RegisterChildPage` validates all wizard steps on submit; jumps to first invalid step

### Device registration visibility

- `OfflineRuntimeProvider` emits `ecd:device-registration-failed` on network/error
- `DeviceRegistrationBridge` toasts when device POST fails (blocks sync push)

### Child registration validation

- `validateChildForm()` + `firstChildFormStepWithErrors()` in `src/lib/child-form.ts`
- Submit validates steps 1–3 (was step 3 only)

---

## Verification checklist (after Vercel redeploy)

1. **Bundle check** — built JS must contain `apiMode:"live"` and your API origin (not `yl(void 0)`).
2. **Login** — `POST …/api/v1/auth/login` with real credentials.
3. **Device** — `POST …/api/v1/devices/register` after login.
4. **Register child** — local save then `POST …/api/v1/sync/push` (Network tab, filter `push`).
5. **Attendance** — same sync push pattern.
6. **Production MOCK** — if env missing, yellow banner on all caretaker pages; writes blocked with clear message (no fake success).

### DevTools tips

- Filter Network by `api/v1` or your Render host.
- Caretaker saves may show `POST /sync/push` not `POST /children`.
- Hard refresh (`Ctrl+Shift+R`) after deploy to avoid stale service worker.

---

## Open gaps (not fixed in this pass)

| ID | Issue | Priority |
|----|-------|----------|
| G1 | LIVE transfer accept not implemented (`acceptTransfer` throws) | P0 |
| G2 | Transfer out has no offline queue (direct REST only) | P1 |
| G3 | Blocked child create (village unresolved) still shows generic local success | P1 |
| G4 | Dead mutation hooks (`useCreateChild`, etc.) — pages use repositories only | P2 cleanup |
| G5 | Password reset UI not wired to auth POST endpoints | P2 |
| G6 | NCDA compliance/WASH POST endpoints — read-only UI | P2 product |

---

## Key files

| Concern | Path |
|---------|------|
| Env / production mock | `src/config/env.ts` |
| Write guard | `src/lib/live-api-guard.ts` |
| Production banner | `src/components/offline/ProductionMockBanner.tsx` |
| Error mapping | `src/offline/mutation-error-message.ts` |
| Device failure toast | `src/offline/DeviceRegistrationBridge.tsx` |
| Auth branching | `src/contexts/AppContext.tsx` |
| Repositories | `src/features/*/repository.ts` |
| Sync push | `src/sync/push.ts`, `src/sync/sync-engine.ts` |
| REST wrappers | `src/api/resources/` |
| Generated clients | `src/api/generated/endpoints/` |
