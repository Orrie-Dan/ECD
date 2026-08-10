# API infrastructure
#
# Mode switch (see .env / .env.example):
#   VITE_API_MODE=mock  → existing mock AuthProvider + DataProvider drive the UI (default)
#   VITE_API_MODE=live  → Axios + JWT + React Query talk to Nest at VITE_API_BASE_URL
#
# Full domain migration standard:
#   docs/frontend-api-pattern.md
#
# Regenerate clients after backend OpenAPI changes:
#   npm run api:sync-openapi
#   npm run api:generate
#
# Layout:
#   client.ts          Axios instance + Orval mutator
#   interceptors.ts    Bearer JWT, x-device-id, refresh-token queue
#   token-storage.ts   localStorage for access/refresh/device
#   errors.ts          Normalized ApiError + helpers
#   roles.ts           API ↔ UI role normalization (hasRole / normalizeRole)
#   query-client.ts    React Query defaults + global mutation errors
#   query-keys.ts      Domain key factories (auth.keys / children.keys)
#   auth/              ApiAuthProvider (LIVE session; does not replace mock UI auth)
#   providers/         QueryProvider + ApiProviders + ApiErrorBridge
#   generated/         Orval output (models + React Query hooks) — do not edit
#   resources/         Typed resource wrappers (auth, children, …)
#   mappers/           DTO ↔ view-model mappers (re-exported from features/*/mappers)
