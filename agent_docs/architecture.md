# TADA Architecture Map

Audited: 2026-03-01

## Runtime Boundary

Live runtime paths:

- `src/app/*`
- `src/server/*`
- `src/lib/*`
- `src/components/*`
- `src/proxy.ts`
- `src/shared/contracts/index.ts`

Dead or non-runtime paths:

- `_legacy/`
- old `src/pages` flow
- any separate `apps/api` Express runtime

## Top-Level Shape

### App Router

- `src/app/page.tsx`: landing page
- `src/app/dashboard/page.tsx`: authenticated dashboard shell
- `src/app/login/page.tsx`: login page
- `src/app/api/**/route.ts`: route handlers
- `src/proxy.ts`: session proxy entrypoint

### Server Logic

- `src/features/dashboard/server/upload.ts`: upload parsing, chaining, merged dataset snapshots
- `src/features/dashboard/server/config.ts`: chart and KPI generation plus validation helpers
- `src/features/dashboard/server/chat.ts`: chat orchestration, prompt construction, patch validation
- `src/features/dashboard/server/infer.ts`: column inference
- `src/features/dashboard/server/state.ts`: in-memory dataset/session state
- `src/features/dashboard/server/types.ts`: server-local type aliases

### Client/Shared Runtime

- `src/shared/lib/api.ts`: browser API client for upload, dashboards, chat
- `src/features/dashboard/client/store.ts`: client source of truth for dashboard state
- `src/features/dashboard/client/runtime.ts`: runtime chart and KPI validation/helpers
- `src/features/dashboard/client/layout.ts`: grid sizing/layout logic
- `src/shared/lib/env.ts`: env contract and fallbacks
- `src/shared/lib/supabase/*`: auth and server/client Supabase helpers
- `src/shared/contracts/index.ts`: Zod contracts, BI rules, shared types

## Data Flow

1. User uploads a file through the web app.
2. `POST /api/upload` parses the file on the server.
3. Server infers columns, builds KPIs, builds initial charts, stores dataset state, and returns a snapshot.
4. Client initializes `dashboard-store` from that snapshot.
5. Dashboard renders from store-backed rows, charts, KPIs, and file metadata.
6. Chat sends `datasetId`, message, current chart configs, and KPI context to `POST /api/chat`.
7. Server returns an assistant message plus a validated patch or `null`.
8. Client applies validated patches locally.

## Persistence Boundary

- Supabase persists dashboards, dashboard metadata, and user-linked dataset associations.
- In-memory server state still holds active parsed dataset rows used by upload/chat flows.
- Client state is still the evolving truth for post-load chart edits until persisted routes are called.

## Current Constraints

- No Express runtime remains in the live app.
- `src/server` is framework-agnostic logic consumed by Next route handlers.
- Chained file operations update merged rows and KPIs but preserve chart configs where possible.
- Dashboard caching is client-side in `dashboard-store.ts`.

## Known Architectural Debt

- Server row state is still memory-backed rather than persisted.
- Dashboard store is a custom external store, not a formal state library abstraction.
- Some dashboard and landing components still carry a lot of UI responsibility in single files.
- Tests exist in config only; there is not yet a meaningful committed test suite.
