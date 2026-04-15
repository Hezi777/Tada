# Database Schema

Use this doc when touching Supabase persistence, auth wiring, or migration-linked behavior.

## Source Of Truth

Checked-in schema changes live in `supabase/migrations`.

Current migrations:

- `supabase/migrations/001_dashboards.sql:1`
- `supabase/migrations/002_add_row_count.sql:1`

## What The Checked-In Migrations Cover

`001_dashboards.sql` adds:

- `public.dashboards`
- `public.dashboard_datasets`
- row-level security policies tied to `auth.uid()`
- an `updated_at` trigger for dashboards

`002_add_row_count.sql` adds:

- `datasets.row_count`

## What Is Not Fully Documented Here

The repo also uses existing Supabase tables such as `datasets`, `dataset_files`, `charts`, and `kpis` from route handlers in `src/app/api/dashboard/route.ts:1`, `src/app/api/dashboards/[id]/route.ts:1`, and `src/app/api/upload/route.ts:1`.

If you are changing those tables, inspect the route handlers and migrations together before editing contracts.

## Env And Access Rules

- Env contract: `src/shared/lib/env.ts:1`
- Server-side Supabase helpers: `src/shared/lib/supabase/*`
- Client-side Supabase usage should stay limited to auth/session flows and must still use repo helpers

## Practical Guidance

- Prefer new migrations over ad hoc SQL notes.
- Keep shared TypeScript contracts aligned with persisted response shapes in `src/shared/contracts/index.ts:1`.
- When switching Supabase projects, verify env values first and then confirm migrations have been applied to the target project.
