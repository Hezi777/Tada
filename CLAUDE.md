# TADA Claude Context

## Repo Shape

- This is a single Next.js app repo rooted here
- App Router routes live in `src/app`
- Feature code lives in `src/features`
- Shared UI, infra helpers, contracts, fonts, hooks, and types live in `src/shared`
- Supabase migrations live in `supabase/migrations`

## Universal Rules

- Keep the App Router structure; do not reintroduce `src/pages`, Express, or a separate backend service
- Browser code should use relative Next routes through `src/shared/lib/api.ts`
- AI calls stay server-side via route handlers and feature server modules
- Validate AI output before it reaches dashboard state
- Shared schemas and BI rules live in `src/shared/contracts/index.ts`
- Centralize env access in `src/shared/lib/env.ts`
- Dashboard state should flow through `src/features/dashboard/client/store.ts`

## How To Work

- Run commands from the repo root
- Use `npm run typecheck` and `npm run lint` after meaningful code changes
- Use `npm run test` when touching test-covered behavior
