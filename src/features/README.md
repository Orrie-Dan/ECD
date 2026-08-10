# Feature domains

Standard layout for migrated domains — see **`docs/frontend-api-pattern.md`**.

```
src/features/{domain}/
  queries.ts
  mutations.ts
  repository.ts
  mappers/
  models/
  utils/
  index.ts
```

Current:

- `auth/` — session login, logout, current user
- `children/` — list, detail, mutations
- `attendance/` — list, child history, upsert batch, soft-delete
- `growth/` — Form VII measurements (shared screening API)
- `nutrition/` — MUAC assessments + alerts (shared screening roster + alerts API)
- `feeding/` — Form VI / Imirire center feeding (daily + month summary)
- `sted/` — STED developmental assessments (create + child history)
- `referrals/` — referral workflow (create, list, child history, terminal status)
- `monitoring/` — district read-model aggregates (`/monitoring/*` + `/analytics/dashboard`)
- `reporting/` — district reports (`/reports/*` + monitoring for attendance/nutrition aggregates)

Note: **Imirire** pages are center *feeding* (Form VI), not the nutrition domain.
