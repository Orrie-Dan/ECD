# Notification Frontend Integration

## 1. Before

| Area | Current state | Mock/live | Action |
| ---- | ------------- | --------- | ------ |
| Header bell | `NotificationBell` in Caretaker, District, NCDA layouts | LIVE only (`env.isLive`) | Kept; wired to backend with refinements |
| Unread badge | React Query `useUnreadCount` | LIVE | Kept; 60s polling + focus refresh |
| Inbox popover | Dropdown preview (~8 items) | LIVE | Refactored; uses `NotificationInboxPanel` |
| Full page | `/caretaker\|district\|ncda/amatangazo` via `NotificationsPageContent` | LIVE | Updated filters, context, action paths |
| Navigation on click | `getNotificationLink()` frontend mapping by type/entity | N/A (client-side) | **Replaced** with `notification.action.path` |
| Title/message display | `formatNotification()` Kinyarwanda templates from metadata | Mixed | **Replaced** in UI with API `title`/`message`; templates kept for legacy helper/tests |
| Context (child/center) | Parsed from metadata / local child roster | Partial | **Replaced** with structured `notification.context` |
| Priority | Not shown | N/A | Added subtle accent + badge for high/critical |
| Operational alerts | `/alerts/follow-up` via `useFollowUpAlerts` | LIVE or mock computation | **Unchanged — separate system** |
| API client | `src/api/resources/notifications.ts` (Axios) | LIVE | Kept |
| React Query | `src/features/notifications/queries.ts` | LIVE | Enhanced optimistic mark-read |

There was no mock notification inbox data; the bell was hidden in MOCK mode. Follow-up operational alerts (`/district/gukurikirana`, caretaker alerts pages) remain a distinct computed-alert surface.

## 2. Architecture

```text
Header (CaretakerLayout / DistrictLayout / NcdaLayout)
  ↓
useUnreadCount — GET /api/v1/notifications/unread-count (poll 60s, refetch on focus)

NotificationBell
  ↓
useNotifications (pageSize 8, enabled when open) — GET /api/v1/notifications

Notification click
  ↓
useMarkNotificationRead — POST /api/v1/notifications/:id/read (optimistic)
  ↓
navigate(notification.action.path) when present

Full inbox (/…/amatangazo)
  ↓
useNotifications (paginated, all/unread filter)
```

## 3. Components Changed

| File | Responsibility |
| ---- | -------------- |
| `src/models/notifications.ts` | Backend-aligned types: priority, context, action, entity |
| `src/api/resources/notifications.ts` | Axios calls (unchanged endpoints) |
| `src/features/notifications/queries.ts` | Queries, optimistic mark-read/all-read, polling |
| `src/lib/notification-utils.ts` | Badge, context formatting, action path, cache helpers |
| `src/components/notifications/NotificationBell.tsx` | Header trigger + badge |
| `src/components/notifications/NotificationInboxPanel.tsx` | Popover (desktop) / bottom sheet (mobile ≤767px) |
| `src/components/notifications/NotificationItem.tsx` | Shared row: title, message, context, priority |
| `src/pages/shared/NotificationsPage.tsx` | Paginated full inbox |
| `src/locales/rw/notifications.ts` | Kinyarwanda UI chrome strings |
| `src/lib/format-notification.ts` | Legacy localization helper (prefers `context` when present) |
| `src/lib/notification-links.ts` | **Deprecated for inbox UI**; retained for existing unit tests only |

## 4. API Integration

| Function | Endpoint |
| -------- | -------- |
| `fetchNotifications` | `GET /api/v1/notifications` (`page`, `pageSize`, `type`, `isRead`) |
| `fetchUnreadCount` | `GET /api/v1/notifications/unread-count` |
| `markNotificationRead` | `POST /api/v1/notifications/:id/read` |
| `markAllNotificationsRead` | `POST /api/v1/notifications/read-all` |

All calls use the shared authenticated `apiClient`. No client-side user filtering.

## 5. Cache Strategy

- **Unread count**: `queryKey: ['notifications', 'unread-count']`, stale 10s, polled every 60s.
- **Lists**: `queryKey: ['notifications', 'list', filters]`, stale 15s; fetched when bell opens or on full page.
- **Mark read (single)**: Optimistic decrement of unread count + mark item read in all cached lists; rollback on error; invalidate unread count on settle.
- **Mark all read**: Optimistic zero unread + mark all visible items read; rollback on error; invalidate all notification keys on settle.
- No full-app refetch on mark-read.

## 6. Polling

| Query | Interval | Focus |
| ----- | -------- | ----- |
| Unread count | 60 seconds | `refetchOnWindowFocus: true` |
| Notification lists | None | Refetch via invalidation after mutations; preview loads on bell open |

Only unread count is periodically polled.

## 7. Role Behavior

| Layout | Bell | Full inbox route |
| ------ | ---- | ---------------- |
| `CaretakerLayout` | Yes | `/caretaker/amatangazo` |
| `DistrictLayout` | Yes | `/district/amatangazo` |
| `NcdaLayout` | Yes | `/ncda/amatangazo` |

Backend returns role-aware `action.path` values; frontend does not rewrite paths per role.

## 8. Responsive Behavior

- **Desktop/tablet (>767px)**: Bell opens anchored popover (`max-w calc(100vw - 1.5rem)`).
- **Mobile (≤767px)**: Bell opens full-width bottom sheet with backdrop; body scroll locked; Escape closes.
- Unread count API failure: bell remains clickable; badge omitted.

## 9. Language

### New / updated frontend strings (Kinyarwanda)

| Key | Text |
| --- | ---- |
| `filterAll` | Byose |
| `empty` | Nta matangazo mashya ufite. |
| `newLabel` | Gishya |
| `retry` | Ongera ugerageze |
| `loadError` | Ntibyashoboye kubona amatangazo. Ongera ugerageze. |
| `priority.low/medium/high/critical` | Ntabwo byihutirwa / Hagati / Byihutirwa / Byihutirwa cyane |

### Backend content localization gap

Notification **titles and messages** are rendered as returned by the API (currently English in examples, e.g. "Severe nutrition status"). The frontend does not re-localize backend copy. A future pass may localize notification content at creation time on the backend.

Type labels in the full inbox still use existing Kinyarwanda `t.types.*` mapping where the type is known.

## 10. Operational Alerts

**Confirmed separate.**

- Follow-up alerts: `GET /api/v1/alerts/follow-up` via `useFollowUpAlerts` (`src/features/alerts/queries.ts`).
- District route: `/district/gukurikirana` (and related alert panels).
- These are computed operational conditions — **not** merged into the notification inbox, no read/unread semantics applied.

## 11. Tests

### Notification tests (all pass)

```
npx vitest run src/lib/notification-utils.test.ts \
  src/api/resources/notifications.test.ts \
  src/lib/format-notification.test.ts \
  src/lib/notification-links.test.ts
```

Result: **25 passed** (badge, zero state, context, priority, optimistic list helpers, API resource calls, legacy format helper).

### Full suite

`npm test`: **458 passed, 9 failed** — failures are pre-existing (NCDA contract tests, user-isolation sync, Excel export timeouts). None are notification-related.

### Build

`npm run build`: fails on **pre-existing** TypeScript errors in NCDA overview/children files. Notification changes introduce no new build errors.

## 12. Deferred

- WebSockets / real-time push
- Browser push notifications
- SMS / email delivery
- Unification of operational follow-up alerts with inbox notifications
- Backend localization of notification title/message content
- Removal of legacy `notification-links.ts` and `formatNotification()` once all consumers migrate
