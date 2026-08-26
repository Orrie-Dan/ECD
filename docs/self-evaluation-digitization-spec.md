# Self-Evaluation Tool — Digitization Spec

**Source:** `docs/ECD Standard Question Draft.xlsx` (Survey123 XLSForm)  
**Structured data:** `src/features/self-evaluation/data/checklists.generated.json` (via `scripts/parse-self-eval-xlsx.py`)  
**Legacy:** `docs/self-evaluation-tool-extract.txt` + `scripts/parse-self-eval-doc.py` (older DOCX, 4 facility types)  
**Status:** Caretaker wizard v1 (local draft); API sync pending

---

## 1. Purpose

Centers conduct **self-assessment** against the **National ECD Standards (2024)** before opening and during service delivery. The digitized tool must:

1. Capture **general facility information** (mapping fields, shared across types).
2. Present the **facility-type-specific checklist** (2 types from ECD Standards inspection form).
3. Score each item by **weight**, roll up **section subtotals**, compute **grand total as %**.
4. Assign a **color rank**: Green 90–100%, Blue 70–89%, Yellow 50–69%, Red &lt;50%.

---

## 2. Document structure

### 2.1 General information (items 1–27)

Shared mapping fields for all settings: name, GPS, admin location, start year, **facility type**, opening days, working hours, service pillars, age groups, ownership, caregivers, beneficiaries, fees, staff qualifications, grades, supervisor contact, SDMS, etc.

**App gap:** Center record has name, code, village, GPS, capacity — not facility type, license, opening days, grade breakdown, or general-info block. These belong on center profile + ArcGIS mapping integration (ToR 4.4).

### 2.2 Facility-specific checklists (from XLSX)

| ID | Facility type | Sections | Items | Max score |
|---|---|---:|---:|---:|
| `daycare` | Day Care ECD (0–3 years) | 16 | 199 | 199 |
| `ecd_3_5` | ECD Facility (3–5 years) | 22 | 271 | 271 |

Each section groups related yes/no standards (e.g. 7.1.1 Care and Support for the Mother and Child During Pregnancy). All items carry **weight 1** in the current XLSX; grand total % = earned / total items × 100.

### 2.3 Scoring rules (from document)

1. Each standard **item** has a default presence score; **weight** reflects what the standard entails.
2. Some items have **multiple indicators** (a/b/c or bullets) — each indicator can carry weight.
3. For **OR-type** items (e.g. qualification paths), meeting **any one** indicator earns the item score (`selectionMode: "any"` in generated JSON).
4. **Section subtotal** = sum of earned weights in that section.
5. **Grand total %** = `round(earned / max × 100)`.
6. **Rank** from percent bands (Green / Blue / Yellow / Red).

Implementation: `src/features/self-evaluation/scoring.ts`.

### 2.4 Bilingual text format

Questions and section titles use `English / Kinyarwanda` in checklist JSON. The UI shows Kinyarwanda prominently with English as secondary (`src/lib/self-eval-text.ts`).

To translate: fill `label_rw` in `docs/ECD-self-eval-translations.xlsx`, then run `python scripts/self-eval-translations.py apply`.

---

## 3. Mapping to existing API

Current backend (`EcdStandard`, `ComplianceAssessment`, `ComplianceAssessmentItem`):

| DOCX concept | Current API | Gap |
|---|---|---|
| Facility-type checklist | Generic 4 domains (`wash`, `safety`, `nutrition`, `learning_environment`) | Need facility-scoped standards catalogue or client-side catalogue v1 |
| Item weight | `EcdStandard.weight`, `AssessmentItem.score` | Seed ~470 items × 4 types or store checklist version client-side |
| Yego/Oya per item | `ItemResponse`: met / partially_met / not_met / not_applicable | Map **met** → full weight, else 0 |
| Percent + color rank | `overallClassification`: compliant / partially_compliant / non_compliant | Map Green/Blue → compliant, Yellow → partially, Red → non_compliant |
| Self-assessment type | `assessmentType: self_assessment` | Supported |
| Submit → verify | `draft` → `submitted` → `verified` | NCDA browse exists; caretaker submit not wired |

**Recommended phase 2:** Backend seed `ecd_standard` rows with codes like `DAYCARE-S02-I01`, `facilityType`, section metadata; POST assessment + items on submit; sync offline like STED.

---

## 4. What was built (v1)

| Piece | Path |
|---|---|
| Source XLSX | `docs/ECD Standard Question Draft.xlsx` |
| Translation workbook (CSV) | `docs/ECD-self-eval-questions-for-translation.csv` |
| Translation workbook (Excel) | `docs/ECD-self-eval-translations.xlsx` |
| Parser script | `scripts/parse-self-eval-xlsx.py` |
| Translation merge | `scripts/self-eval-translations.py apply` |
| Checklist JSON | `src/features/self-evaluation/data/checklists.generated.json` |
| Scoring + ranks | `src/features/self-evaluation/scoring.ts` |
| Local draft storage | `src/features/self-evaluation/draft-storage.ts` |
| Caretaker hub | `/caretaker/isuzuma` → `SelfEvalPage` |
| Section wizard | `/caretaker/isuzuma/new` → `SelfEvalWizardPage` |
| Entry from Ibindi | `MorePage` |

---

## 5. Known parser / content limitations

- Re-run parser after DOCX edits: `python scripts/parse-self-eval-doc.py`
- Some **subtotals in DOCX** may not match sum of parsed item weights (manual DOCX formatting); use `grandTotalMax` from document when present, else `computedMaxScore`.
- **School/model** computed 250 vs document 251 — review one item in section 2 numbering (document repeats “2.” for two sections).
- **General information** block not yet in wizard (mapping fields).
- **Evidence notes / proof** mentioned in item text — not captured as uploads yet.
- **API submit** and **offline sync** not implemented in v1.

---

## 6. Open questions for NCDA / David

1. Confirm **OR vs AND** scoring for multi-indicator qualification items (parser assumes OR when subtotal implies single point).
2. Should **partially met** earn fractional weight or 0/ full only?
3. Align **color ranks** with API `ComplianceClassification` enum for national dashboards.
4. When to capture **general information** — center profile, first wizard step, or ArcGIS mapping system?
5. **Improvement cycle** — same assessment revised in place vs new assessment per term?

---

## 7. Test plan

- [ ] Select each facility type; walk all sections; confirm max scores match table in §2.2.
- [ ] All Yego → 100% Green; all Oya → 0% Red.
- [ ] Section subtotals on review screen sum to grand total.
- [ ] Draft persists across refresh; clear draft works.
- [ ] Mobile layout on section forms (long Kinyarwanda text).
