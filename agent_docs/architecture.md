# TADA Architecture Map

Audited: 2026-08-08

## Runtime Boundary

Live runtime paths:

- `src/app`: Next.js App Router pages and route handlers
- `src/features`: feature-scoped client, server, and UI code
- `src/shared`: contracts, infrastructure, hooks, types, and shared UI
- `src/proxy.ts`: session proxy entrypoint

`_legacy/` and any old `src/pages` or separate Express/API runtime are dead and
must not be referenced.

## Top-Level Shape

- `src/app/(marketing)`: landing and marketing routes
- `src/app/(product)/dashboard/page.tsx`: authenticated dashboard flow
- `src/app/(product)/login/page.tsx`: email/password authentication
- `src/app/api/**/route.ts`: browser-facing server routes
- `src/features/dashboard/server`: parsing, profiling, generation, chat, and persistence orchestration
- `src/features/dashboard/client/store.ts`: dashboard client state source of truth
- `src/features/dashboard/client/runtime.ts`: deterministic chart/KPI calculations
- `src/features/dashboard/client/grid.ts`: responsive widget tiers and dimensions
- `src/shared/lib/api.ts`: relative browser API client
- `src/shared/lib/env.ts`: centralized environment access
- `src/shared/lib/supabase`: server/client Supabase helpers
- `src/shared/contracts/index.ts`: Zod contracts and BI generation rules

## Data Flow

1. The browser uploads a file to `POST /api/upload`.
2. The server parses, profiles, redacts prompt-sensitive fields, and persists the dataset.
3. `POST /api/generate` selects local BI rules, generates or falls back to deterministic configs, validates them, and returns charts/KPIs.
4. The first dashboard is created only after generation succeeds.
5. The client initializes the central dashboard store and renders from its rows and configs.
6. Trust controls filter the store-backed rows used by KPIs, charts, and Show data.
7. Chat sends grounded dashboard context to `POST /api/chat`; validated patches apply through the store.

## Persistence Boundary

- Supabase persists dashboards, datasets, files, associations, chart configs, KPIs, and user-data retrieval chunks under RLS.
- Process-global maps cache active data but are not durable or multi-instance consistent.
- Browser code calls relative Next routes; privileged Supabase and AI operations remain server-side.

## Known Architectural Debt

- Large dashboard/server modules concentrate regression risk.
- Process-global caches have no eviction policy.
- Some client/server validation rules overlap and can drift.
- The BI-rule database/vector schema remains for compatibility, although dashboard generation now selects its small static rule corpus locally.
- Focused unit/integration coverage exists; browser validation is currently a manual Playwright CLI smoke workflow rather than a committed E2E suite.
