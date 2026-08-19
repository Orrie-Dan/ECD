# Classrooms (Grades) — Backend Specification

**Status:** Backend implemented (2026-08-19)  
**Date:** 2026-08-19  
**Depends on:** Children, Centers modules

---

## 1. Overview

ECD centers in Rwanda operate a 3-grade cycle (Grade 1, Grade 2, Grade 3). Children enroll in Grade 1 at age 3 and progress through grades annually. The system currently stores children as a flat list per center with no grade/classroom assignment. This spec adds a **Classroom** entity so children can be grouped by grade within a center.

---

## 2. Domain Rules

1. Every center has a **fixed set of 3 classrooms**: Grade 1, Grade 2, Grade 3.
2. Classrooms are **auto-created** when a center is created (or via a migration for existing centers).
3. A child belongs to **exactly one classroom** at a time (nullable for backward compat during migration).
4. Children move from one grade to the next at the **start of a new school year** (promotion).
5. Children completing Grade 3 are typically archived (age-out).
6. Classroom names/labels are **not user-editable** — they are system-defined.

---

## 3. Data Model

### 3.1 `Classroom` entity

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `centerId` | UUID | FK → `Center.id`, NOT NULL | |
| `grade` | ENUM(`grade_1`, `grade_2`, `grade_3`) | NOT NULL | |
| `createdAt` | TIMESTAMP | NOT NULL, default NOW | |
| `updatedAt` | TIMESTAMP | NOT NULL, default NOW | |

**Unique constraint:** `(centerId, grade)` — one classroom per grade per center.

### 3.2 Changes to `Child` entity

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `classroomId` | UUID | FK → `Classroom.id`, NULLABLE | Nullable for backward compat; new registrations should require it |

### 3.3 `ClassroomAssignmentHistory` entity (audit)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `childId` | UUID | FK → `Child.id`, NOT NULL | |
| `fromClassroomId` | UUID | FK → `Classroom.id`, NULLABLE | NULL for initial assignment |
| `toClassroomId` | UUID | FK → `Classroom.id`, NOT NULL | |
| `reason` | ENUM(`initial_enrollment`, `promotion`, `manual_reassignment`) | NOT NULL | |
| `effectiveDate` | DATE | NOT NULL | |
| `createdAt` | TIMESTAMP | NOT NULL, default NOW | |
| `createdBy` | UUID | FK → `User.id` | |

---

## 4. Migration

1. **Create** `classroom` table.
2. **Seed** 3 classrooms (grade_1, grade_2, grade_3) for every existing center.
3. **Add** `classroomId` column to `child` table (nullable).
4. **Create** `classroom_assignment_history` table.
5. **Auto-assign existing children** (optional/recommended): compute grade from `dateOfBirth` and current school year, assign each active child to the appropriate classroom. Log as `initial_enrollment` in history.

---

## 5. API Endpoints

### 5.1 Classrooms (read-only, system-managed)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/centers/:centerId/classrooms` | List classrooms for a center (returns 3 items with child counts) |
| `GET` | `/api/v1/classrooms/:id` | Get classroom detail (includes enrolled children summary) |

#### `GET /api/v1/centers/:centerId/classrooms` response

```json
[
  {
    "id": "uuid",
    "centerId": "uuid",
    "grade": "grade_1",
    "label": "Grade 1 / Umwaka wa 1",
    "childrenCount": 25,
    "createdAt": "2026-01-15T00:00:00Z"
  }
]
```

### 5.2 Child Classroom Assignment

| Method | Path | Description |
|---|---|---|
| `PATCH` | `/api/v1/children/:id` | Existing update endpoint — now accepts `classroomId` |
| `POST` | `/api/v1/children/:id/promote` | Promote child to next grade |

#### `POST /api/v1/children/:id/promote`

**Request body:**
```json
{
  "effectiveDate": "2027-01-15"
}
```

**Behavior:**
- Moves child from current grade to the next (grade_1 → grade_2, grade_2 → grade_3).
- If child is in grade_3, returns `400` — child should be archived instead.
- Creates a `ClassroomAssignmentHistory` record with reason `promotion`.
- Returns updated child.

#### Bulk promotion

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/centers/:centerId/promote` | Promote all children in a center to the next grade |

**Request body:**
```json
{
  "effectiveDate": "2027-01-15",
  "excludeChildIds": ["uuid"]
}
```

**Behavior:**
- Grade 1 → Grade 2, Grade 2 → Grade 3.
- Grade 3 children are **not** auto-archived — returns them in the response so the caretaker can archive manually.
- Creates history records for each promoted child.

### 5.3 Filter Support

Add `classroomId` as an optional query parameter to:

| Endpoint | Parameter |
|---|---|
| `GET /api/v1/children` | `?classroomId=uuid` |
| `GET /api/v1/attendance` | `?classroomId=uuid` |
| `GET /api/v1/feeding/daily` | (if per-child feeding is added later) |
| `GET /api/v1/nutrition` | `?classroomId=uuid` |

### 5.4 Registration

`POST /api/v1/children` — add optional `classroomId` field. If not provided, backend may auto-assign based on age (Grade 1 for age 3, Grade 2 for age 4–5, Grade 3 for age 5–6). Alternatively, require it from the frontend.

---

## 6. OpenAPI Schema Additions

### New schemas

- `ClassroomGrade` — enum: `grade_1`, `grade_2`, `grade_3`
- `ClassroomResponseDto` — id, centerId, grade, label, childrenCount, createdAt
- `PromoteChildDto` — effectiveDate
- `BulkPromoteDto` — effectiveDate, excludeChildIds
- `BulkPromoteResponseDto` — promotedCount, grade3ChildIds (for manual archive)
- `ClassroomAssignmentHistoryDto` — id, childId, fromGrade, toGrade, reason, effectiveDate

### Modified schemas

- `ChildDetailResponseDto` — add `classroomId`, `classroomGrade`, `classroomLabel`
- `ChildResponseDto` (list item) — add `classroomId`, `classroomGrade`
- `CreateChildDto` — add optional `classroomId`
- `ChildrenController_findAll` params — add optional `classroomId`

---

## 7. Auto-Seeding on Center Creation

When a new center is created (`POST /api/v1/centers`), the backend must automatically create 3 classroom records (grade_1, grade_2, grade_3) for that center within the same transaction.

---

## 8. Localization Labels

| Grade | English | Kinyarwanda |
|---|---|---|
| `grade_1` | Grade 1 | Umwaka wa 1 |
| `grade_2` | Grade 2 | Umwaka wa 2 |
| `grade_3` | Grade 3 | Umwaka wa 3 |

Labels should be returned by the API in the `label` field (can be English-only initially; frontend handles i18n).

---

## 9. Sync Considerations

If the offline-first sync engine is in use, the `classroom` table should be treated as **server-authoritative read-only** data (seeded by backend, never created offline). Child `classroomId` updates follow the same optimistic-lock pattern as other child fields.

---

## 10. Out of Scope (for now)

- Custom/additional classrooms beyond the 3 fixed grades
- Classroom capacity limits
- Teacher/caregiver assignment to classrooms
- Classroom-level attendance (attendance remains per-child)
- Automatic age-based promotion (always user-triggered)
