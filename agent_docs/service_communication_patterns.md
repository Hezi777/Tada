# Service Communication Patterns

Use this doc when changing how data moves through the system.

## Browser To Server

Browser code should go through the client API wrapper in `src/shared/lib/api.ts:1`.

Current pattern:

1. UI triggers an action from a component.
2. The component calls a relative Next route through `src/shared/lib/api.ts:1`.
3. A route handler under `src/app/api/**/route.ts` parses and validates the request.
4. The route calls server-only logic in `src/server/*`.
5. The server returns data shaped by `src/shared/contracts/index.ts:1`.
6. The client applies the result through `src/features/dashboard/client/store.ts:1` or local component state.

## Upload Flow

- Upload parsing and chaining logic live in `src/features/dashboard/server/upload.ts:1`.
- Initial chart and KPI generation live in `src/features/dashboard/server/config.ts:1`.
- Client upload calls start in `src/shared/lib/api.ts:62`.

## Chat Flow

- Client chat calls start in `src/shared/lib/api.ts:126`.
- The chat HTTP boundary is `src/app/api/chat/route.ts:1`.
- Grounded chat orchestration and patch validation live in `src/features/dashboard/server/chat.ts:1`.

## Persistence Flow

- Supabase env and client creation are rooted in `src/shared/lib/env.ts:1` and `src/shared/lib/supabase/*`.
- Dashboard and dataset persistence is handled by route handlers under `src/app/api/dashboard*` and `src/app/api/dashboards*`.
- Checked-in schema changes live in `supabase/migrations/001_dashboards.sql:1` and `supabase/migrations/002_add_row_count.sql:1`.

## Important Constraint

Do not skip shared schemas or route handlers when introducing a new browser-to-server flow. In this repo, direct browser-to-AI and browser-to-database shortcuts are architectural violations.
