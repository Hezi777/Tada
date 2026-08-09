# Code Conventions

Use this document for repo-specific boundaries. `AGENTS.md` remains the source
of truth when rules overlap.

## Architecture Boundaries

- Keep route files in `src/app`, feature code in `src/features`, and reusable infrastructure/UI in `src/shared`.
- Do not modify or reference `_legacy/`.
- Do not reintroduce `src/pages`, Express, or a separate API runtime.
- Keep server-side dashboard logic under `src/features/dashboard/server`.

## API, State, and Validation

- Browser code calls relative Next routes through `src/shared/lib/api.ts`.
- Route handlers live under `src/app/api/**/route.ts`.
- Shared contracts and `BI_GENERATION_RULES` live in `src/shared/contracts/index.ts`.
- Environment access is centralized in `src/shared/lib/env.ts`.
- Dashboard state and mutations go through `src/features/dashboard/client/store.ts`.
- Validate AI output and semantic patches before applying them to dashboard state.
- Keep AI calls and privileged Supabase credentials server-side.

## UI and Browser Work

- Dashboard components render from centralized rows/configs, including filtered rows from the trust controls.
- Landing-only work stays under `src/app/(marketing)` unless broader changes are explicitly requested.
- Use Playwright CLI, not Playwright MCP, for browser inspection and smoke testing.

## Verification

Run the relevant focused tests while editing, then use `npm run typecheck`,
`npm run lint`, `npm test`, and `npm run build` as the repository completion
signal.
