# Self-Evaluation Tool — Digitization Spec

**Source:** `Self Evaluation Tool for Compliance with ECD Standards.docx`  
**Extract:** `docs/self-evaluation-tool-extract.txt` (generated)  
**Structured data:** `src/features/self-evaluation/data/checklists.generated.json` (via `scripts/parse-self-eval-doc.py`)  
**Status:** Caretaker wizard v1 (local draft); API sync pending

---

## 1. Purpose

Centers conduct **self-assessment** against the **National ECD Standards (2024)** before opening and during service delivery. The digitized tool must:

1. Capture **general facility information** (mapping fields, shared across types).
2. Present the **facility-type-specific checklist** (4 main types).
3. Score each item by **weight**, roll up **section subtotals**, compute **grand total as %**.
4. Assign a **color rank**: Green 90–100%, Blue 70–89%, Yellow 50–69%, Red &lt;50%.

---

## 2. Document structure

### 2.1 General information (items 1–27)

Shared mapping fields for all settings: name, GPS, admin location, start year, **facility type**, opening days, working hours, service pillars, age groups, ownership, caregivers, beneficiaries, fees, staff qualifications, grades, supervisor contact, SDMS, etc.

**App gap:** Center record has name, code, village, GPS, capacity — not facility type, license, opening days, grade breakdown, or general-info block. These belong on center profile + ArcGIS mapping integration (ToR 4.4).

### 2.2 Four facility-specific checklists

| ID | Document section | Sections | Items (parsed) | Max score |
|---|---|---:|---:|---:|
| `daycare` | A. Daycare / crèche | 16 | 130 | 195 |
| `home_based` | B. Home-based | 8 | 49 | 66 |
| `community_based` | C. Community-based | 15 | 119 | 161 |
| `school_model` | D. School-based & model | 22 | 171 | 251 |

Each section has a **subtotal** (e.g. Nutrition `/15`). **Grand total** is the sum of all section weights for that facility type.

### 2.3 Scoring rules (from document)

1. Each standard **item** has a default presence score; **weight** reflects what the standard entails.
2. Some items have **multiple indicators** (a/b/c or bullets) — each indicator can carry weight.
3. For **OR-type** items (e.g. qualification paths), meeting **any one** indicator earns the item score (`selectionMode: "any"` in generated JSON).
4. **Section subtotal** = sum of earned weights in that section.
5. **Grand total %** = `round(earned / max × 100)`.
6. **Rank** from percent bands (Green / Blue / Yellow / Red).

Implementation: `src/features/self-evaluation/scoring.ts`.

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
| DOCX text extract | `docs/self-evaluation-tool-extract.txt` |
| Parser script | `scripts/parse-self-eval-doc.py` |
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
