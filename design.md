---
version: alpha
name: ECD-field-design-system
description: |
  Design system for Rwanda's Early Childhood Development (ECD) attendance and
  monitoring app. Optimized for caretakers with low digital literacy on phones,
  outdoors, in Kinyarwanda. District officers share the same brand tokens at
  higher information density. Calm government/NGO craft: one primary action per
  screen, large type, labeled controls, scarce green CTAs, quiet flat surfaces.

colors:
  primary: "#1a6b52"
  primary-pressed: "#145a44"
  primary-light: "#e8f4ef"
  on-primary: "#ffffff"
  secondary: "#2563a8"
  secondary-light: "#e8f0fa"
  accent: "#c47d1a"
  accent-light: "#fdf4e8"
  canvas: "#f4f6f8"
  surface: "#ffffff"
  surface-muted: "#eef1f4"
  ink: "#1c2330"
  ink-secondary: "#4a5568"
  ink-muted: "#6b7280"
  border: "#e2e6eb"
  border-strong: "#cdd3db"
  success: "#15803d"
  success-light: "#ecfdf3"
  error: "#b42318"
  error-light: "#fef3f2"
  warning: "#b45309"
  warning-light: "#fffbeb"

typography:
  font-family: Nunito Sans
  root-size-target: 16px
  display:
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.25
  heading:
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.3
  subheading:
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-strong:
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
  label:
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5

rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    minHeight: 52px
    padding: 14px 24px
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    minHeight: 52px
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    border: "2px solid {colors.primary}"
    rounded: "{rounded.lg}"
    minHeight: 52px
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    minHeight: 52px
  button-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    minHeight: 52px
  text-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.border-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    minHeight: 52px
    padding: 14px 16px
  text-input-focused:
    border: "2px solid {colors.primary}"
    focusRing: "0 0 0 3px rgb(26 107 82 / 0.12)"
  option-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "2px solid {colors.border}"
    rounded: "{rounded.lg}"
    minHeight: 56px
    padding: 16px
  option-tile-selected:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary}"
    border: "2px solid {colors.primary}"
  task-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.xl}"
    padding: 16px
  status-badge:
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: 4px 10px
  bottom-nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    activeColor: "{colors.primary}"
    height: 64px
    maxItems: 5
  confirm-modal:
    primaryActions: ["Yego", "Oya"]
    mobilePresentation: bottom-sheet
---

## Overview

Sisitemu y'Ubwitabire bw'Abana is a government ECD field tool. The primary user is a **caretaker** on a phone: limited digital comfort, Kinyarwanda-first, often outdoors or in a busy classroom. A secondary user is a **district officer** who monitors many centers and can tolerate denser layouts.

This system borrows craft discipline from quiet, scarce-accent product design — one job per screen, one primary CTA, flat surfaces, clear pressed states — and rejects marketing patterns that hurt field work: dark cinematic bands, thin display type, imagery-led storytelling, icon-only navigation, and pill-cluster filter chrome.

**Key characteristics**
- **One action, big and clear** — each screen has one obvious next step
- **Kinyarwanda-first** — plain verbs (`Andika`, `Bika`, `Garuka`, `Yego` / `Oya`); no unexplained English or acronyms
- **Touch-first** — ≥52px primary controls on caretaker flows; never icon-only for critical actions
- **Scarce primary green** (`{colors.primary}` — `#1a6b52`) — reserved for the main action and active nav
- **Status = color + word** — never color alone
- **Two densities, one brand** — same tokens for caretaker and district; different IA and chrome density

---

## Audience principles (non-negotiable)

1. **Reduce choices.** Prefer 1 primary CTA and ≤5 bottom-nav items over sidebars of 9+ destinations.
2. **Prefer recognition over recall.** Large labeled tiles (`OptionPicker`) beat cascading dropdowns.
3. **Speak in full sentences for irreversible or high-stakes confirms.**  
   Good: “Ushaka gufunga ubwitabire bwa Keza?”  
   Bad: trash icon + “Delete?”
4. **Allow undo** for common mistakes (attendance mark, accidental save) via toast or explicit reverse action.
5. **Never rely on icons alone** for navigation, status, or primary actions. Icon + label always.
6. **Spell out or replace acronyms in UI** (e.g. explain STED in plain Kinyarwanda; avoid “ECD” in caretaker chrome unless already known).
7. **Design for glare and older eyes.** Bold weights (600–700) for headings and labels; avoid font-weight 300/400 for critical UI chrome.
8. **Cards are for interaction.** If removing a card’s border/shadow does not hurt understanding, flatten it.

---

## Surfaces: caretaker vs district

| | Caretaker (field) | District (monitoring) |
|---|---|---|
| Primary device | Phone | Desktop / tablet |
| Nav | Bottom nav ≤5 + “Ibindi” hub for rarer tasks | Sidebar OK; groups by task |
| Density | Large type, few filters, card lists | Tables, charts, GIS OK |
| Home | One hero CTA (e.g. Andika Ubwitabire) | Overview KPIs + alerts |
| Forms | Option tiles, short steps, save & continue | Dense filters acceptable |
| Reference flows | Attendance, children list, register | Monitoring dashboards, reports |

Do not copy district monitoring patterns into caretaker screens.

### Caretaker navigation target

Daily map (bottom nav, max 5):

1. Ahabanza (home)
2. Abana
3. Ubwitabire
4. Imikurire *or* a single **Ibikorwa** hub (growth / feeding / developmental screening)
5. Ibindi (reports, settings, rarer tasks)

Sidebar on large screens may mirror this hierarchy but must not expose 9+ peer items as equal weight.

---

## Colors

### Brand & accent
- **Primary green** (`{colors.primary}` — `#1a6b52`): main CTAs, active nav, focus rings, key links.
- **Primary pressed** (`{colors.primary-pressed}` — `#145a44`): pressed / active CTA.
- **Primary light** (`{colors.primary-light}` — `#e8f4ef`): selected tiles, soft secondary fills, tinted active states.
- **Secondary blue** (`{colors.secondary}` — `#2563a8`): supporting info, links that are not the page’s main action. Never compete with primary for the hero CTA.
- **Accent amber** (`{colors.accent}` — `#c47d1a`): attention / due / reminder — not primary actions.

### Surfaces
- **Canvas** (`{colors.canvas}` — `#f4f6f8`): page background.
- **Surface** (`{colors.surface}` — `#ffffff`): cards, sheets, inputs.
- **Surface muted** (`{colors.surface-muted}` — `#eef1f4`): inset groups, disabled wells.

### Text
- **Ink** (`{colors.ink}` — `#1c2330`): primary copy.
- **Ink secondary** (`{colors.ink-secondary}` — `#4a5568`): supporting sentences.
- **Ink muted** (`{colors.ink-muted}` — `#6b7280`): metadata only — never sole status or sole CTA label.

### Semantic (always pair with a word)
- **Success** / **Error** / **Warning** with matching `-light` tints for badge and alert backgrounds.
- Present / Absent / Referred / Overdue must show **label text** plus color.

### Scarcity rule
At most **one** filled primary-green CTA in the first viewport of a caretaker screen. Secondary actions use outline, soft secondary, or ghost.

---

## Typography

### Font
**Nunito Sans** for all roles (display → caption). Friendly, open counters; readable at large sizes on mobile. Do not introduce a second UI face.

### Target scale (caretaker)

| Token | Size | Weight | Use |
|---|---|---|---|
| `{typography.display}` | 26px | 700 | Page title / home greeting |
| `{typography.heading}` | 20px | 700 | Section title |
| `{typography.subheading}` | 17px | 600 | Card title, child name |
| `{typography.body}` | 16px | 400 | Body, helper text |
| `{typography.body-strong}` | 16px | 600 | Primary button label, strong inline |
| `{typography.label}` | 15px | 600 | Form labels |
| `{typography.caption}` | 14px | 400 | Metadata, badges (minimum; avoid smaller) |

**Root size target:** `16px` on caretaker surfaces (current implementation may still use 14–15px — migrate toward this).

### Principles
- Headings and labels are **bold**, never light.
- Body line-height ≥ 1.55.
- Do not use caption as the only explanation of a control.
- District may use slightly tighter spacing but should not drop below 14px for readable body.

---

## Layout & spacing

- **Base unit:** 8px (`{spacing.xs}`), with 4px for tight inline gaps.
- **Page padding (mobile):** 16px; comfortable vertical rhythm 16–24px between blocks.
- **One job per section:** one headline, one short supporting line, one primary control group.
- **Home viewport budget (caretaker):** greeting + one primary CTA + at most one status summary. No KPI strips, filter bars, or secondary marketing blocks above the fold.
- **Max content width (desktop):** ~960–1120px for caretaker task pages; district analytics may go wider.

---

## Elevation & depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | Canvas only | Default page |
| 1 — Surface | White + 1px `{colors.border}` | Cards, inputs, sheets |
| 2 — Soft lift | `{shadow-card}` or light shadow | Optional for tappable task cards; keep faint |
| 3 — Overlay | Dimmed backdrop + sheet/modal | Confirms, filters |

Prefer border + surface contrast over stacked shadows. Cards lift slightly on press only if it clarifies tappability.

---

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.sm}` | 8px | Small chips, tight controls |
| `{rounded.md}` | 12px | Inputs, badges |
| `{rounded.lg}` | 16px | Buttons, option tiles |
| `{rounded.xl}` | 20px | Task cards, modals |
| `{rounded.full}` | 9999px | Avatars, progress dots — **not** default for primary buttons |

Caretaker primary buttons use **large rounded rectangles** (`{rounded.lg}`), not pills. Full pills are easy to confuse with filter chips and waste horizontal label space for long Kinyarwanda verbs.

---

## Components

### Buttons
- **Primary** — green fill; one per viewport; min-height 52px caretaker / 48px absolute minimum.
- **Secondary / outline** — for alternate paths (Garuka, Hindura).
- **Success / danger** — only for semantically present/absent or destructive confirms.
- Always **icon + text** when an icon is used; loading state replaces label with clear wait copy (`Tegereza gato...`).
- Pressed state darkens fill (`{colors.primary-pressed}`); do not rely on hover alone (touch devices).

### Option tiles (`OptionPicker`)
Preferred choice control for low literacy: large tappable rows/tiles, selected state uses `{colors.primary-light}` + primary border. Use instead of native selects when there are ≤8 options; for long lists use searchable bottom sheet with large rows.

### Text inputs
Min-height 52px; strong border; focus = thicker primary border + soft green ring. Labels above, never placeholder-only. Errors use `{colors.error}` + visible message with `role="alert"`.

### Task cards
Used when the whole row is an action (child attendance card, growth roster row). Show: name, one status badge (color + word), one obvious action. Avoid nested icon toolbars.

### Status badges
Color tint background + bold short Kinyarwanda label. Examples: Yaje, Ntiyaje, Yoherejwe, Bitegerejwe.

### Bottom nav
Max 5 items; icon + label; active = primary color + weight. Never collapse to icon-only on caretaker phone UI.

### Modals / sheets
Mobile: bottom sheet. Confirms: full-sentence question + **Yego** / **Oya** (or equally plain verbs). Destructive: danger styling on the confirm action only.

### Stepper
Show “Intambwe X / Y” plus current step title. Prefer ≤3 steps for registration; offer save-and-continue when longer forms are unavoidable.

### Filters
Caretaker: few chips or a single “Shungura” sheet — not multi-panel filter drawers by default. District: denser filter panels OK.

### Toasts
Short result + undo when reversing is safe (especially attendance).

---

## Copy & language

- Default locale: **Kinyarwanda** (`src/locales/rw/`).
- Prefer concrete verbs: Andika, Bika, Garuka, Shakisha, Emeza, Funga.
- Yes/No confirms: **Yego** / **Oya**.
- Avoid English route words in visible chrome; path segments may stay technical but labels must be local.
- Empty states explain what to do next (“Nta mwana ubonetse. Andika umwana mushya.”), not only “No results.”

---

## Do's and Don'ts

### Do
- Put one primary green CTA in the first caretaker viewport.
- Use bold labels and ≥16px body on field flows.
- Pair every status color with a written label.
- Keep bottom nav ≤5 with visible text.
- Use option tiles and bottom sheets for choices.
- Write confirm copy as a full, specific sentence.
- Keep district and caretaker densities different under the same tokens.

### Don't
- Don't port marketing dark heroes, light weight-300 display type, or imagery-led bands into this app.
- Don't use icon-only nav or icon-only primary actions.
- Don't put multiple filled primary buttons in one viewport.
- Don't use color alone for present/absent/error.
- Don't expose 9 equal sidebar destinations to caretakers.
- Don't use pill geometry as the default button shape.
- Don't bury critical daily tasks behind nested menus.
- Don't ship unexplained acronyms (STED, ECD, MUAC) without a plain-language label nearby.
- Don't shrink caption below 14px for anything the user must read to act.

---

## Responsive behavior

| Breakpoint | Caretaker behavior |
|---|---|
| < 768px | Bottom nav; bottom sheets; single column; large CTAs |
| 768–1023px | Prefer labeled rail or bottom nav — **no icon-only rail** |
| ≥ 1024px | Optional sidebar mirroring the 5-item IA; content centered |

### Touch targets
- Primary / secondary buttons: ≥52×52px effective.
- Nav items, option tiles, attendance actions: ≥48px tall; prefer 56px for choice tiles.
- Inline icon buttons that lack text are discouraged; if unavoidable, expand hit area to ≥44px and provide `aria-label` in Kinyarwanda.

---

## Motion

Use motion sparingly to confirm cause and effect — not decoration.
- Sheet enter/exit (~200–280ms)
- Button press scale (subtle)
- Toast enter
Avoid continuous ambient animation, parallax, or cinematic transitions.

---

## Implementation map

| Concern | Source of truth |
|---|---|
| Tokens | `src/index.css` (`@theme`) |
| UI kit | `src/components/ui/` |
| Caretaker chrome | `src/layouts/CaretakerLayout.tsx` |
| District chrome | `src/layouts/DistrictLayout.tsx` |
| Copy | `src/locales/rw/` |

When tokens in code drift from this document, **update both** in the same change.

---

## Iteration guide

1. Change one concern at a time (type scale, then nav IA, then a reference flow).
2. Validate caretaker flows on a real phone width (~360–390px) before desktop polish.
3. Ask of every new control: *Can a first-time caretaker succeed without training?* If not, simplify.
4. Prefer extending `Button`, `OptionPicker`, `Modal`, `FormField`, `BottomNav` over one-off chrome.
5. Before adding a color or radius, check whether an existing token already expresses the need.
6. After visual changes, re-check contrast for primary-on-white, error text, and muted caption on canvas.

---

## Migration priorities

1. ~~This document replaces the previous unrelated marketing analysis as the design source of truth.~~
2. ~~Raise caretaker root / body type toward `{typography.body}` 16px.~~
3. ~~Collapse caretaker nav to ≤5 + Ibindi hub.~~
4. Treat **Home + Attendance** as the visual reference pair; align other caretaker pages to them.
5. Shorten registration / location picking toward tiles + search sheets.
6. District pages adopt the same tokens without adopting caretaker sparsity (or vice versa).

---

## Known gaps

- Caretaker primary nav is now ≤5 + Ibindi hub; hub copy and IA can still be tuned with field feedback.
- Some screens still expose English/acronym labels in body copy (e.g. STED page titles) — further plain-language pass needed.
- Form validation patterns beyond color + message (inline success, field summaries) are lightly specified.
- Offline / poor-connectivity empty and error states need dedicated patterns.
- Illustration or photo guidance for empty states is intentionally minimal; prefer clear text + one action over decorative art.
- Home + Attendance visual reference polish (scarcity of primary CTA, quieter cards) is the next UX pass.
let's 