# User manual — NCDA administrator

**System:** ECD operational app  
**UI language:** Kinyarwanda (labels)  
**Role:** `ncda_admin`  
**Home:** `/ncda/dashboard` (Incamake y’Igihugu)

National portal for coordination: overview, monitoring, inspections, WASH, users, audit. It does **not** replace the ArcGIS ECD Mapping System.

---

## 1. Sign in

1. Open the app and sign in with an NCDA admin account.  
2. You must land on **NCDA**, not District. If you land on `/district`, the account role is wrong.  
3. Use the sidebar: **Igihugu** (command) then **Ubuyobozi**.

LIVE mode is required for most NCDA pages. In mock mode you will see **Ntabwo biboneka kuri murongo**.

---

## 2. Navigation

**Igihugu (command)**

| Menu (RW) | Path | Purpose |
|---|---|---|
| **Incamake** | `/ncda/dashboard` | National GIS-oriented overview |
| **Gukurikirana** | `/ncda/monitoring` | National monitoring |
| **Isuzuma** | `/ncda/inspections` | Compliance assessments |
| **Raporo** | `/ncda/reports` | Reports |

**Ubuyobozi**

| Menu | Path | Purpose |
|---|---|---|
| **Abakoresha** | `/ncda/users` | Users |
| **Inshingano n’uburenganzira** | `/ncda/roles` | Role descriptions |
| **Igenamiterere** | `/ncda/settings` | Settings, devices, sync |
| **Inyandiko z’ibikorwa** | `/ncda/audit-logs` | Audit logs |

**Contextual (not primary nav):** Uturere, Ibigo, Abana, WASH. Open them from overview, search, or direct URL.

---

## 3. Incamake (national overview)

Use this as the national command surface: where centers are, what needs attention.

Map **layers** are defined in product (centers, coverage, attendance, compliance, nutrition, growth, WASH, inspections). Only layers marked **live** have data. Others show as unavailable — that means no aggregate API, not “zero centers.”

Do not treat unavailable KPIs as 0% coverage.

---

## 4. Gukurikirana (national monitoring)

Filtered national monitoring of operational domains (attendance, nutrition, feeding, STED, compliance as the APIs allow). Always apply district/center/date filters. The UI is built to **avoid loading the entire country unpaged**.

---

## 5. Isuzuma (inspections / compliance)

This is the start of **ToR 4.3** (digitized standards workflow).

### 5.1 List

Filter by district, center, status, date range. Status buckets:

| Status | Meaning |
|---|---|
| `draft` | Not submitted |
| `submitted` | Awaiting verification |
| `verified` | Accepted |
| `rejected` | Sent back |

Assessment types: **self_assessment**, **supportive_supervision**, **external_audit**.

Classification (when set): **compliant** / **partially_compliant** / **non_compliant**.

### 5.2 Detail

Open an assessment to see items (met / partially met / not met / N/A), scores, and gap fields (severity, action, target date, status).

Optional: browse the **standards catalogue** (domains: WASH, safety, nutrition, learning_environment).

### 5.3 Honest limits

- This is **not** yet the four scored PDF tools (day-care, model/school, community, home-based).  
- National “% compliant” totals are **not** computed in the browser. If the page says aggregates are unavailable, that is a backend contract gap.  
- Caretaker self-assessment UI is not the primary data-entry path in the current SPA.

---

## 6. WASH

`/ncda/wash` — paginated WASH indicators:

- Water source available / type  
- Sanitation / latrine count  
- Handwashing  
- Waste management  

Filter by district/center. Same rule: no silent national rollup if the API does not provide one.

---

## 7. Geography and records

- **Uturere** — district list and district detail  
- **Ibigo** — centers; center detail sections can include operations / WASH / compliance when APIs exist  
- **Abana** — national child search (paginated). Do not export PII without policy.

---

## 8. Users, roles, settings

**Abakoresha** — create/list users (caregiver, district focal person, NCDA as the API allows). District focal persons need a district. Caregivers need a center.

**Inshingano** — explains what each role can do. There is no live role-matrix editor.

**Igenamiterere** — system settings; devices and sync deep-link here. Device/sync admin depends on live contracts.

---

## 9. Audit logs

`/ncda/audit-logs` — immutable activity browser.

- Always set a **from / to** date window.  
- Filter by action, entity type, entity id.  
- Never try to load “all history” in one page.

---

## 10. Raporo

National reports as provided by `/reports/*`. Preview on screen. Live **file export** may be unavailable until a download endpoint exists.

---

## 11. Handover / operations notes for NCDA IT

- Frontend env: `VITE_API_MODE=live`, `VITE_API_BASE_URL` = production API (not localhost).  
- Backend backups and TLS are API-ops, not this SPA.  
- Linking this app to the **ArcGIS ECD Mapping System** is the remaining ToR 4.4 item.  
- Training audiences named in the contract: **NCDA technical staff, District ECD Focal Persons, Caritas**. Use manuals 4–6.

---

## 12. What NCDA does *not* do in this UI

- Enter daily attendance / feeding / STED (caregiver).  
- Treat paper ECD Book sections VIII–XVI (parent contributions, visitors, etc.) as digital forms.  
- Score a home-based vs community-based inspection with the May 2024 PDF checklists (not encoded).  
- Compute national WASH or compliance coverage without an aggregate API.
