# Database Schema

Use this doc when touching Supabase persistence, auth wiring, or migration-linked behavior.

## Source Of Truth

Checked-in schema changes live in `apps/web/supabase/migrations`.

Current migrations:

- `apps/web/supabase/migrations/001_dashboards.sql:1`
- `apps/web/supabase/migrations/002_add_row_count.sql:1`

## What The Checked-In Migrations Cover

`001_dashboards.sql` adds:

- `public.dashboards`
- `public.dashboard_datasets`
- row-level security policies tied to `auth.uid()`
- an `updated_at` trigger for dashboards

`002_add_row_count.sql` adds:

- `datasets.row_count`

## What Is Not Fully Documented Here

The repo also uses existing Supabase tables such as `datasets`, `dataset_files`, `charts`, and `kpis` from route handlers in `apps/web/src/app/api/dashboard/route.ts:1`, `apps/web/src/app/api/dashboards/[id]/route.ts:1`, and `apps/web/src/app/api/upload/route.ts:1`.

If you are changing those tables, inspect the route handlers and migrations together before editing contracts.

## Env And Access Rules

- Env contract: `apps/web/src/lib/env.ts:1`
- Server-side Supabase helpers: `apps/web/src/lib/supabase/*`
- Client-side Supabase usage should stay limited to auth/session flows and must still use repo helpers

## Practical Guidance

- Prefer new migrations over ad hoc SQL notes.
- Keep shared TypeScript contracts aligned with persisted response shapes in `packages/shared/src/index.ts:1`.
- When switching Supabase projects, verify env values first and then confirm migrations have been applied to the target project.
