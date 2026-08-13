# ECD Rwanda — Handover package

**Product:** Sisitemu y'Ubwitabire bw'Abana (ECD operational app)  
**Implementer:** ESRI Rwanda Ltd  
**Client:** Catholic Relief Services (CRS) / National Child Development Agency (NCDA)  
**Package date:** August 2026  
**Scope:** Frontend application in this repository (`D:\Esri\ECD`). NestJS backend and ArcGIS ECD Mapping System are separate systems.

This pack is **ToR deliverable 8** (technical documentation, codebook, architecture, user manuals). It describes **what was built**, mapped to the July 2026 consulting agreement and to the paper ECD Book / National ECD Standards.

---

## Documents

| # | File | Audience |
|---|---|---|
| 1 | [Technical documentation](./01-technical-documentation.md) | NCDA IT, ESRI maintainers |
| 2 | [System architecture](./02-system-architecture.md) | Technical review (NCDA, CRS, ESRI) |
| 3 | [Codebook](./03-codebook.md) | M&E, analysts, interoperability |
| 4 | [User manual — Umurezi](./04-user-manual-caretaker.md) | Frontline caregivers |
| 5 | [User manual — Akarere](./05-user-manual-district.md) | District ECD focal persons |
| 6 | [User manual — NCDA](./06-user-manual-ncda.md) | NCDA administrators |

Related engineering records (not rewritten here): `docs/adr-*.md`, `docs/frontend-api-pattern.md`, `docs/offline-operations.md`, `docs/sprint-5.*`.

---

## ToR mapping (what this pack covers)

| ToR item | Status in product | Where documented |
|---|---|---|
| 4.2 Digital ECD Book (children, parents, attendance, development, wellbeing) | Implemented as caretaker workflows | Manual 4, codebook §§ B–F |
| 4.3 Standards compliance workflows | Skeleton: assessments, statuses, 4 domains | Architecture, codebook § H, NCDA manual |
| 4.4 Link to ArcGIS ECD Mapping System | Placeholder GIS slots; not wired | Architecture § GIS |
| 4.5 Dashboards (district + national) | District operational dashboards; NCDA overview + monitoring | Manuals 5–6 |
| 5 Roles, audit, low-literacy UI, live API | Implemented | Technical doc, codebook § A |
| 6 Training package / attendance evidence | Out of repo — delivery activity | — |
| 8 This handover pack | This folder | — |

---

## How to use

1. **Maintainers** start with technical documentation + architecture.  
2. **M&E / data** use the codebook as the field dictionary.  
3. **Trainers** use the three user manuals; caretaker manual is Kinyarwanda-first.  
4. Do **not** treat sprint gate reports as user-facing manuals.

Canonical enums live in code: `src/types/index.ts` and `src/api/generated/models/`. If code and this pack disagree, **code + OpenAPI win** — update this pack.
