# ECD Rwanda — Sisitemu y'Ubwitabire bw'Abana

Early Childhood Development (ECD) management system for Rwanda. The app helps ECD center caretakers register children, record daily attendance, and generate reports, while district officers monitor centers, attendance trends, and geographic analytics across their district.

The interface is built entirely in **Kinyarwanda** and follows a mobile-first design with role-based access for two user types.

## Features

### Umurezi (Caretaker)

- **Dashboard** — Daily attendance summary, progress tracking, and recent activity feed
- **Child registration** — Multi-step form with child details, guardian info, and Rwanda administrative location (province → district → sector → cell → village)
- **Attendance** — Mark children present/absent, record who brought them, and track arrival times
- **Children list** — Search, filter, and view registered children
- **Child detail** — View and edit a child's profile and attendance history
- **Attendance reports** — Summary and filtering by date range
- **Settings** — Center and user profile information

### Umukozi w'Akarere (District Officer)

- **District dashboard** — Key metrics: total children, present today, ECD centers, attendance rate
- **ECD centers** — Searchable list of centers with sector, caretaker, and attendance data
- **GIS analytics** — Map view with district/sector/period filters (placeholder for ArcGIS integration)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [React 19](https://react.dev/) |
| Language | [TypeScript 6](https://www.typescriptlang.org/) |
| Build tool | [Vite 8](https://vite.dev/) |
| Routing | [React Router 7](https://reactrouter.com/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) (`@tailwindcss/vite`) |
| Icons | [Lucide React](https://lucide.dev/) |
| Font | [Nunito Sans](https://fonts.google.com/specimen/Nunito+Sans) (Google Fonts) |
| Linting | ESLint 10 + `typescript-eslint` |

### Architecture notes

- **State management** — React Context (`AuthProvider`, `DataProvider`) with `localStorage` session persistence
- **Data** — In-memory mock data (no backend API yet)
- **i18n** — Kinyarwanda locale files under `src/locales/rw/`
- **Path alias** — `@/` maps to `src/` (configured in `vite.config.ts`)

## Project Structure

```
src/
├── components/       # UI, auth, caretaker, and district components
├── contexts/         # Auth and data providers
├── layouts/          # CaretakerLayout, DistrictLayout
├── lib/              # Mock data, Rwanda admin divisions, utilities
├── locales/rw/       # Kinyarwanda strings (auth, caretaker, district, common)
├── pages/            # Route-level pages by role
│   ├── caretaker/
│   └── district/
├── types/            # Shared TypeScript types
├── App.tsx           # Routes and providers
└── main.tsx          # Entry point
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (20+ recommended)

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Other scripts

```bash
npm run build    # Type-check and production build
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

## Demo Login

Select a role on the home screen, then sign in with these demo credentials:

| Role | Username | Password |
|------|----------|----------|
| Umurezi (Caretaker) | `umurezi` | `1234` |
| Umukozi w'Akarere (District Officer) | `akarere` | `1234` |

## Routes

| Path | Role | Description |
|------|------|-------------|
| `/` | — | Role selection |
| `/login/:role` | — | Login for selected role |
| `/caretaker` | Caretaker | Dashboard |
| `/caretaker/kwiyandikisha` | Caretaker | Register child |
| `/caretaker/ubwitabire` | Caretaker | Daily attendance |
| `/caretaker/abana` | Caretaker | Children list |
| `/caretaker/abana/:id` | Caretaker | Child detail |
| `/caretaker/raporo` | Caretaker | Attendance report |
| `/caretaker/igenamiterere` | Caretaker | Settings |
| `/district` | District | Dashboard |
| `/district/ibigo` | District | ECD centers |
| `/district/ikarita` | District | GIS analytics |

## Documentation (handover)

Stakeholder / NCDA pack (technical doc, architecture, codebook, user manuals):

- [`docs/handover/00-handover-index.md`](docs/handover/00-handover-index.md)

Engineering notes: `docs/adr-*.md`, `docs/frontend-api-pattern.md`, `docs/offline-operations.md`.

## License

Private project — not published to npm.
