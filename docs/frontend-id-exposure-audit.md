# Frontend ID exposure audit

**Date:** 2026-09-04  
**Scope:** ECD frontend (`d:\Esri\ECD`)  
**Security note:** Hiding IDs is a UX / information-exposure cleanup. Backend authorization and IDOR protections remain authoritative.

---

## 1. Current exposures

| Entity | URL exposure | UI exposure | Export exposure | Resolution |
| ------ | ------------ | ----------- | --------------- | ---------- |
| Center | Prefer `code` in SPA paths; UUID accepted with replace→code | Name + `code` (business) | Names only | **Remediated** via `buildCenterDetailPath` + `resolveCenterRouteKey` |
| District | Prefer `code` in SPA paths; UUID accepted with replace→code | Name + `code`; province **name** (not `provinceId`) | Names only | **Remediated** |
| Child | Database UUID in LIVE detail URLs | Name + `nationalId` (business); no DB UUID labels | Names only | **Partial** — no stable non-PII publicId yet |
| Sector / admin unit | Filter query params may still use UUID | Breadcrumbs use names; never UUID-as-label | N/A | **Partial** — query keys still internal |
| User | `/users/:userId` UUID | Lists show names | N/A | **Retained** (admin ops) |
| Audit log | `/audit-logs/:logId` UUID | Advanced filters may take entity/actor id | N/A | **Retained** (support) |
| Notification | Action paths remapped to role SPA; entity key may still be UUID | No notification row id in copy | N/A | **Partial** — awaiting producer codes / child publicId |
| Follow-up alert deep links | May still embed `childId` / `centerId` UUID when no code on DTO | Titles use names; scrubbers hide UUID-like labels | N/A | **Partial** |
| Device / sync / screening | Not in user routes | Not shown | N/A | OK |

---

## 2. Public identifier strategy

| Entity | Routing strategy | Notes |
| ------ | ---------------- | ----- |
| Center | Business `code` | Unique, searchable, already on API |
| District | Business `code` | Same |
| Sector | Internal id in filters for now | Prefer name in crumbs; consider `code` query later |
| Child | Internal UUID retained in LIVE URLs | Recommend server-generated immutable `publicId` (e.g. `CH-8F4K2Q`). Do **not** put `nationalId` in URLs. Do **not** use bare name slugs as primary keys. |
| Referral | List/follow-up hubs; no dedicated public ref in SPA | Prefer case/reference number when product adds one |
| Assessment / screening / notification | Technical only | Never user-facing |

---

## 3. Routes changed

| Before | After |
| ------ | ----- |
| `/ncda/centers/<uuid>` | `/ncda/centers/<code>` (UUID bookmarks replace→code) |
| `/district/ibigo/<uuid>` | `/district/ibigo/<code>` |
| `/ncda/districts/<uuid>` | `/ncda/districts/<code>` |
| `?centerId=<uuid>` (map) | Prefer `?center=<code>`; legacy `centerId` still resolved |
| Backend `/children/<uuid>` notification action | Remapped to `/ncda/children|…/abana/<uuid>` by role |

Central helpers:

- `src/lib/entity-routes.ts` — `buildCenterDetailPath`, `buildDistrictDetailPath`, `displayEntityLabel`
- `src/hooks/useResolvedEntityRoute.ts` — code/UUID resolve + replace
- `src/lib/notification-utils.ts` — `remapNotificationActionPath`

---

## 4. Internal IDs intentionally retained

| Where | Why |
| ----- | --- |
| API payloads (`id`, FKs) | Mutations, cache keys, scope checks |
| Child detail SPA segments (LIVE) | No safe publicId; API `GET /children/:id` is UUID |
| Follow-up / alert `centerId` / `childId` in some deep links | DTOs lack `code` today |
| Form `<option value={id}>` | Values are not visible labels |
| Audit advanced filters | Operator tooling |
| React `key={…id}` | Not user-visible |

---

## 5. Authorization verification

- Center/district resolve still calls scoped `GET /centers/:id` / `GET /districts/:id` (or search then detail).
- Map focus still rejects centers outside the officer’s `districtId`.
- Notification remapping only changes SPA prefixes; it does not grant access.
- **ID hiding is not treated as security.**

---

## 6. Remaining work (for FULL remediation)

1. Backend: child `publicId` (unique, immutable) + resolve endpoint / accept in `GET /children/:key`.
2. Backend: emit center/district `code` (not UUID) in notification `action.path` and follow-up alert DTOs.
3. Migrate remaining monitoring/compliance/report links that interpolate `centerId` without a `code` on hand.
4. Optional: query-string geo filters use `code` with explicit resolve (avoid ambiguous UUID-or-name lookup).

---

## Verdict

```text
VERDICT: FRONTEND ID EXPOSURE PARTIAL
```

Visible raw UUIDs removed from primary UI surfaces; center/district user-facing routes prefer business codes with UUID compatibility. Child LIVE URLs, some alert/notification deep links, and admin user/audit paths still use internal IDs until public identifiers exist.
