# Codebook — ECD operational system

**Audience:** M&E, analysts, interoperability, NCDA data teams  
**Source of truth:** `src/types/index.ts`, `src/lib/guardian-relations.ts`, `src/lib/nutrition/core.ts`, `src/lib/sted-utils.ts`, `src/api/generated/models/`  
**If this file and code disagree, code + OpenAPI win.**

All user-facing labels are Kinyarwanda. Codes stored in the API are the left-hand **Code** column unless noted.

---

## A. Users and roles

| Code (API) | UI role | Kinyarwanda | Portal |
|---|---|---|---|
| `caregiver` | `caretaker` | Umurezi | `/caretaker` |
| `district_focal_person` | `districtOfficer` | Umukozi w’Akarere | `/district` |
| `ncda_admin` | `ncda` | NCDA Admin | `/ncda` |

Unknown API roles are rejected. Caritas is not a stored role.

---

## B. Child register (ECD Book I — Umwirondoro)

| Field | Type | Code / values | Label (RW) |
|---|---|---|---|
| `id` | UUID | Client-generated on create | — |
| `fullName` | string | — | Amazina y’umwana |
| `dateOfBirth` | ISO date | Age rule in UI: 0–8 years | Itariki y’amavuko |
| `gender` | enum | `Umuhungu` \| `Umukobwa` | Igitsina |
| `specialNeeds` | string, optional | Free text | Ikibazo cyihariye (imirire, imibanire y’ababyeyi, n’ibindi) |
| `guardianName` | string | — | Amazina y’umubyeyi (1) |
| `guardianPhone` | string | Rwanda: `07xxxxxxxx` / `2507…` / `+2507…` | Telefoni |
| `guardianRelation` | enum | See § B.1 | Isano |
| `guardian2*` | optional | Same as guardian 1 | Umubyeyi wa kabiri |
| `province` `district` `sector` `cell` `village` | strings | Rwanda admin tree | Intara → Akarere → Umurenge → Akagari → Umudugudu |
| `homeVillageId` | UUID, live | Admin-unit id | — |
| `status` | enum | `active` \| `transferred` \| `archived` | Imiterere |
| `registrationNumber` | string | Issued / placeholder | Nimero yo kwiyandikisha |
| `centerId` / `centerName` | — | Scope | Ikigo |
| `version` | int | Optimistic lock | — |

### B.1 Guardian / brought-by relation

Used for parents on the child record **and** “Yazanywe na” on attendance.

| Code | Label (RW) |
|---|---|
| `umubyeyi_mama` | Umubyeyi (Mama) |
| `umubyeyi_papa` | Umubyeyi (Papa) |
| `sekuru_nyirakuru` | Sekuru/Nyirakuru |
| `nyirasenge_marume` | Nyirasenge/Marume |
| `umuvandimwe` | Umuvandimwe |
| `umubyeyi_urera` | Umubyeyi urera umwana utari uwe |
| `umurinzi_wemewe` | Umurinzi wemewe n’amategeko |
| `ikindi` | Ikindi |

Legacy UI keys `mama`, `papa`, `umuturanyi`, `undi` normalize into the table above.

### B.2 Child status and lifecycle

| Code | Meaning |
|---|---|
| `active` | Akora — appears on attendance |
| `transferred` | Yoherejwe ku kindi kigo |
| `archived` | Mu bubiko |

**Archive reason:** `age_out` \| `moved_away` \| `guardian_request` \| `duplicate` \| `other`  
**Transfer reason:** `relocation` \| `guardian_request` \| `centre_capacity` \| `other`

---

## C. Attendance (ECD Book V — Ubwitabire)

| Field | Type | Codes | Label (RW) |
|---|---|---|---|
| `date` | ISO date | One row per child per day | Itariki |
| `present` | boolean | true = Yaje, false = Ntiyaje | — |
| `broughtBy` | enum | Same as § B.1 | Yazanywe na |
| `broughtByOther` | string | When relation is `ikindi` | — |
| `arrivedAt` | ISO datetime | Optional | Igihe yaje |
| `absentReason` | enum | See below | Impamvu |
| `notes` | string | Optional | Ibisobanuro |
| `recordedBy` | string | Display name or user id | Yanditswe na |

**Absent reason**

| Code | Typical meaning |
|---|---|
| `sick` | Urwaye |
| `family` | Impamvu y’umuryango |
| `transport` | Gutwara |
| `weather` | Ibihe |
| `other` | Ikindi |

**UI day status** (derived): `present` \| `absent` \| `unrecorded`.

---

## D. Feeding (ECD Book VI — Imirire)

Center-level **day** (not per child):

| Field | Type | Label (RW) |
|---|---|---|
| `date` | ISO date | Umunsi |
| `milkServed` | boolean | Amata |
| `porridgeServed` | boolean | Igikoma |
| `balancedMealServed` | boolean | Ifunguro (indyo yuzuye) |
| `composition` | 6 booleans | See D.1 |

**Month summary**

| Field | Type | Notes |
|---|---|---|
| `yearMonth` | `YYYY-MM` | — |
| `milkLiters` | number | Amata (liters) |
| `flourKg` | number | Ifu (kg) |
| `foodSource` | string | Free text (not a parent-contribution ledger) |

### D.1 Indyo yuzuye — six food groups

Paper Icyitonderwa. All six should be true when `balancedMealServed` is true.

| Field | Paper group |
|---|---|
| `cerealsOrTubers` | 1. Ibinyampeke cg ibinyabijumba |
| `legumes` | 2. Ibinyamisogwe |
| `dairy` | 3. Ibikomoka ku mata |
| `animalProducts` | 4. Ibikomoka ku matungo (indagara/inyama/amafi/amagi) |
| `fruitsVegetables` | 5. Imbuto n’imboga |
| `addedFat` | 6. Ifunguro ryongewemo amavuta |

---

## E. Growth and nutrition (ECD Book VII — Gupima imikurire)

### E.1 Measurement

| Field | Collected in Form VII UI? | Notes |
|---|---|---|
| `weightKg` | Yes | Ibiro |
| `muacCm` | Yes | MUAC |
| `heightCm` | **No** (type only) | Paper: Tuyaze |
| `headCircumferenceCm` | No | Reserved |
| `date` | Yes | Monthly roster |

### E.2 Nutrition status (MUAC cm)

MVP thresholds — **not WHO z-scores** (`src/lib/nutrition/core.ts`).

| Code | Rule | Paper analog |
|---|---|---|
| `severe` | MUAC &lt; 11.5 | Mutuku |
| `moderate` | 11.5 ≤ MUAC &lt; 12.5 | Mutuku / gukurikirana |
| `at_risk` | 12.5 ≤ MUAC &lt; 13.5 | Muhondo |
| `normal` | MUAC ≥ 13.5 | Cyatsi |

**Referral from nutrition:** `severe` or `moderate`.

**Due status** (days since last measurement):

| Code | Rule |
|---|---|
| `never` | No measurement |
| `up_to_date` | &lt; 30 days |
| `due` | ≥ 30 and &lt; 45 days |
| `overdue` | ≥ 45 days |

Constants: `ASSESSMENT_INTERVAL_DAYS = 30`, `ASSESSMENT_OVERDUE_DAYS = 45`.

---

## F. STED (ECD Book II–IV)

Early development / disability screen. Eligible ages: **1–6 years**.

| Field | Codes |
|---|---|
| `ageBand` | `1_3` (umwaka 1–3) \| `4_6` (imyaka 4–6) |
| `consentObtained` | boolean — required |
| Physical part status | `normal` \| `problem` |
| Milestone answer | `yego` \| `oya` |

### F.1 Physical parts (Itegereze ibice by’umwana)

| Code | Label (RW) |
|---|---|
| `headFace` | Umutwe no mu maso |
| `neck` | Ijosi |
| `arms` | Amaboko / intoki |
| `chest` | Igituza |
| `abdomenBack` | Inda n’umugongo |
| `hips` | Urukenyerero |
| `legsFeet` | Amaguru n’ibirenge |
| `genitals` | Igitsina |
| `skinHair` | Uruhu n’ubwoya / umusatsi |

Plus derived `noProblem` when all parts are `normal`.

### F.2 Milestones 1–3 (`1_3`)

| Code | Question (RW) |
|---|---|
| `pickStandStep` | Ashobora gufata akantu hasi, agahaguruka agatera intambwe? |
| `chooseStack` | Umwana ashobora gutandukanya ibintu binini n’ibito kandi akarundanura utuntu? |
| `imitatePicture` | Umwana agerageza kwigana abandi kandi yishimira kureba amafoto? |
| `scribble` | Iyo umuhaye ikaramu, ashobora gushwaratura ku rupapuro? |
| `knowsTools` | Amenya ibikoresho by’ibanze byo mu rugo? |
| `understandsCommands` | Ashobora kumva amabwiriza yoroshye kandi akerekana ibice by’umubiri? |
| `socialPlay` | Asabana kandi agakina n’abandi? |

### F.3 Milestones 4–6 (`4_6`)

| Code | Question (RW) |
|---|---|
| `grossMotorPeers` | Abasha kugenda, gukina, kwiruka nk’abandi b’ikigero kimwe? |
| `selfCare` | Abasha kwiyitaho (kwigaburira / kwiyambika)? |
| `sensory` | Abasha kumva, kubona cyangwa kunukirwa? |
| `canLearn` | Abasha kwiga ugereranyije n’abandi? |
| `emotionControl` | Abasha kugenzura amarangamutima? |
| `speechClarity` | Abandi bumva ibyo avuga? |
| `attention` | Abasha kuguma ku cyo ari gukora? |
| `receptiveLanguage` | Abasha gusobanukirwa ibyo abandi bavuga? |
| `peerFriends` | Ashobora gukina n’abandi akagira inshuti? |
| `toiletHygiene` | Azi kwijyana ku musarani n’isuku nyuma yo kwituma? |

### F.4 Outcome (Umwanzuro)

| Flag | Label (RW) |
|---|---|
| `normal` | Nta kibazo |
| `referred` | Yoherejwe ku Kigo Nderabuzima |
| `counseling` | Yagiriwe inama |
| `other` + `otherText` | Ibindi |
| `followUpIn6Months` + `followUpDueDate` | Kongera gusurwa mu mezi 6 |

Default rule: any physical `problem` or any milestone `oya` → referred + counseling; else normal + counseling + 6-month follow-up.

---

## G. Referrals

| Field | Codes | Label (RW) |
|---|---|---|
| `sourceType` | `nutrition` \| `sted` | Imirire / MUAC \| STED |
| `status` | `pending` \| `completed` \| `cancelled` | Bitegereje \| Byakozwe \| Byahagaritswe |
| `destination` | string | Aho baherejwe |
| `reason` | string | Impamvu |
| `implementedAt` | ISO date, optional | Itariki yashyizwe mu bikorwa |

---

## H. Center, WASH, compliance

### H.1 Center

| Field | Codes |
|---|---|
| `status` | `active` \| `inactive` |
| `code` | Center code (paper cover: kode) |
| `capacity` | number, optional |
| `villageId` | Admin unit |
| `latitude` / `longitude` | optional |

Facility **type** (ubwoko: day-care / model / school / community / home-based) and **accreditation year** are **not** stored as first-class fields in this frontend contract.

### H.2 WASH indicator

| Field | Type |
|---|---|
| `recordedDate` | ISO date |
| `waterSourceAvailable` | boolean |
| `waterSourceType` | string, optional |
| `sanitationFacilityAvailable` | boolean |
| `latrineCount` | number ≥ 0, optional |
| `handwashingFacilityAvailable` | boolean |
| `wasteManagementAvailable` | boolean |
| `notes` | string, optional |

### H.3 Compliance assessment

| Field | Codes |
|---|---|
| `assessmentType` | `self_assessment` \| `supportive_supervision` \| `external_audit` |
| `status` | `draft` \| `submitted` \| `verified` \| `rejected` |
| `overallClassification` | `compliant` \| `partially_compliant` \| `non_compliant` |
| Standard `domain` | `wash` \| `safety` \| `nutrition` \| `learning_environment` |
| Item `response` | `met` \| `partially_met` \| `not_met` \| `not_applicable` |
| `gapSeverity` | `low` \| `medium` \| `high` |
| `gapStatus` | `open` \| `in_progress` \| `resolved` |

These four domains are **not** the four facility-typed PDF inspection tools (day-care, model/school, community, home-based).

---

## I. District alerts (Gukurikirana)

**Category:** `attendance` \| `enrollment` \| `data_quality` \| `operational` \| `nutrition`  
**Priority:** `high` \| `medium` \| `low`

**Type (examples):** `low_attendance`, `attendance_decreasing`, `no_submission`, `high_dropout`, `declining_enrollment`, `no_new_registrations`, `missing_info`, `incomplete_registration`, `records_verification`, `stale_records`, `unusual_activity`, `missed_assessment`, `high_risk_nutrition`, `referral_required`.

---

## J. Sync and local record hygiene

**Outbox status:** `pending` \| `blocked` \| `syncing` \| `applied` \| `conflict` \| `failed`  
**Local record:** `clean` \| `dirty` \| `pending_delete`  
**Engine:** `IDLE` \| `SYNCING` \| `PENDING` \| `SYNC_ERROR` \| `CONFLICT_PRESENT` \| `AUTH_REQUIRED` \| `OFFLINE` \| `SERVER_UNAVAILABLE` \| `DEVICE_BLOCKED` \| `DEVICE_PENDING`  
**Operation:** `create` \| `update` \| `delete`

**Syncable entity types:** `child`, `attendance_record`, `child_nutrition_screening`, `child_transfer`, `ecd_center`, `compliance_assessment`, `compliance_assessment_item`, `wash_indicator`, `center_feeding_day`, `center_feeding_month_summary`, `sted_assessment`, `referral`.

Conflicts: **server wins** (CAS `version`).

---

## K. API conventions

- Dates: ISO `YYYY-MM-DD` or full ISO datetime.
- Pagination: `page`, `pageSize`, `total`, `totalPages`, `items`.
- Optimistic lock: `version` required on updates; conflict returns `currentVersion`.
- IDs: UUID. Creates from the caretaker app use `crypto.randomUUID()` (same id on server).

---

## L. Paper book sections **not** in this codebook

Not implemented as entities (ToR 4.2 simplified the book):

- VIII Umusanzu w’ababyeyi  
- IX Ibiganiro ku burere  
- X Komite  
- XI Abarezi (center staff register — users exist at district/NCDA, not this form)  
- XII Ubufasha  
- XIII Abashyitsi  
- XIV Amahugurwa  
- XV–XVI Example weekly menu / daily timetable  
