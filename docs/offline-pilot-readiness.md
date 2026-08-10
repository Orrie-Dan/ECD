# Offline Field Pilot Readiness (Sprint 4.9)

Audit date: 2026-08-10  
Frontend: `D:\Esri\ECD`  
Backend: `D:\Esri\ECD Backend` (read-only — **no OpenAPI / backend changes in this sprint**)

## Verdict

**AMBER — PILOT READY WITH CONTROLS**

Code-side pilot blockers addressed in Sprint 4.9 (sync DB lease, discard guard, conflict acknowledge, diagnostics). A controlled 2–3 tablet pilot is appropriate **only if** operational controls below are accepted and **human tablet acceptance** passes.

## Decision summary

| Topic | Decision |
|-------|----------|
| Child DOB / gender / village offline | **Option B for pilot** — keep online-only; UI locks demographics offline. **Option A** (extend backend sync CAS) is a separate backend sprint if product requires full offline profile edits. |
| Conflict UX | Settings lists child/domain + server-wins + **Nemera amakuru ya seriveri** acknowledge |
| Encryption | **POST-PILOT / P2** — not solved; controlled custody required |
| Human tablet testing | **NOT EXECUTED** — required go/no-go gate |

## Offline capability matrix (verified in code)

| Domain | Offline Read | Offline Create | Offline Update | Offline Delete | Dependencies | Conflict Strategy | Pilot Status |
|--------|--------------|----------------|----------------|----------------|--------------|-------------------|--------------|
| Children | Yes | Yes | Partial (names/guardians/specialNeeds/archive); DOB/gender/village online-only | Soft archive/reactivate | Village may block create until resolved | CAS server-wins | Ready with controls |
| Attendance | Yes | Yes (upsert) | Yes (upsert) | Soft-delete | — | CAS server-wins | Ready |
| Growth | Yes | Append-only create | Correction = new create | No | May enqueue referral | Append-only | Ready |
| Nutrition | Same entity as Growth | Same | Same | No | Screening → referral `dependsOn` | Append-only | Ready |
| Feeding | Yes | Day/month upsert | Upsert coalesce | No | — | CAS on update | Ready |
| STED | Yes | Append-only create | Correction = new create | No | STED → referral `dependsOn` | Append-only | Ready |
| Referrals | Yes | Yes | Status + notes | No | Blocked until parent applied | CAS server-wins | Ready |

## Child contracts

### REST UPDATE
`version` + optional: names, **dateOfBirth**, **gender**, **centerId**, **homeVillageId**, guardians, specialNeeds/notes, archive fields.

### SYNC UPDATE (CAS)
names, status, specialNeeds/disabilityNotes, guardians, archive fields only.  
**Not applied:** dateOfBirth, gender, homeVillageId, centerId, registrationNumber.

### FRONTEND LOCAL UPDATE
`updateChildLocalFirst` matches sync CAS; `childPatchRequiresOnlineRest` refuses DOB/gender/village offline. Edit UI locks those fields when offline. Update payloads omit unsupported fields.

## Operational controls for AMBER pilot

1. **One primary user per tablet**
2. **Device PIN required**
3. **No shared browser profiles**
4. **Discard data on device handoff**
5. **Lost/stolen tablet → disable account immediately**
6. **Do not use public/shared computers**
7. **Do not leave authenticated tablets unattended**
8. Initial online sync required before first offline day
9. Train: offline guardian/name edits OK; DOB/gender/village need internet
10. Any **Birakeneye kwitabwaho** → Settings → note child → acknowledge or contact support
11. Complete `docs/offline-field-acceptance.md` on the **actual** tablet models

**IndexedDB PII encryption:** POST-PILOT / P2 — do not represent as solved.

## P0 / P1 / P2

### P0
- [x] Lock demographic fields offline on child edit
- [x] Conflict panel shows child/domain identity + server-wins copy
- [x] Storage failure messaging never claims “saved”
- [x] Sync DB lease — mid-cycle account switch cannot write pull rows into another user’s DB
- [x] `discard_local` refuses without explicit userId (no ambiguous wipe)
- [ ] **Human tablet acceptance executed and signed** ← remaining P0

### P1
- Backend sync CAS extend for DOB/gender/homeVillageId (separate backend sprint) **if** product requires full offline profile edit
- Remote sync error telemetry pipeline (Settings diagnostics cover local queue/conflicts/failed/blocked for pilot)

### P2
- Encryption at rest
- Full conflict merge UI
- Transfers / monitoring / WASH / compliance offline
- Lint debt cleanup (Orval/generated)
- Caretaker “new version available” banner (PWA stays `prompt`)

## Go / No-Go gate

Pilot allowed only if:

- [ ] Automated tests passing
- [ ] Production build passes
- [ ] PWA shell present (`dist/sw.js`, `dist/manifest.webmanifest`); no `/api/**` caching
- [ ] 2–3 real tablets pass acceptance checklist
- [ ] No P0 data-loss issues found on devices
- [ ] Account isolation verified on device
- [ ] Logout keep/discard/sync-then policy accepted by field lead
- [ ] Recovery (disconnect mid-sync + restart) passes
- [ ] Field team understands offline / pending / conflict indicators

## Recommendation

**GO for controlled pilot after human tablet sign-off.**  
Code readiness: **AMBER → ready with controls**.  
Human field readiness: **NOT EXECUTED**.
