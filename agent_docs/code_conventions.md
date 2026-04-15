# Code Conventions

Use this doc for repo-specific implementation rules. Do not treat it as a style guide for whitespace or formatting; use linting and existing code patterns for that.

## Architecture Boundaries

- Keep live app code in `src/app`, `src/server`, `src/lib`, and `src/components`; see `agent_docs/architecture.md:7`.
- Do not modify `_legacy`; the repo-level rule is in `AGENTS.md:88`.
- Do not reintroduce `src/pages`, Express, or a separate API runtime; see `AGENTS.md:31`.

## API And Server Rules

- Frontend code should call relative Next routes through `src/shared/lib/api.ts:1`.
- Route handlers live under `src/app/api/**/route.ts`; see `AGENTS.md:33`.
- Server-only business logic belongs in `src/server/*`; see `AGENTS.md:35`.

## Validation Rules

- Shared runtime contracts and BI rules live in `src/shared/contracts/index.ts:1`.
- Env access is centralized in `src/shared/lib/env.ts:1`.
- Dashboard state is centralized in `src/features/dashboard/client/store.ts:1`.
- Initial chart generation and chart collection validation live in `src/features/dashboard/server/config.ts:1`.
- Chat validation and proposal handling live in `src/features/dashboard/server/chat.ts:1`.

## Product-Specific Rules

- Never call the AI from the browser; see `AGENTS.md:40`.
- Validate AI output before it touches dashboard state; see `AGENTS.md:42`.
- Do not bypass shared schemas when changing contracts; see `AGENTS.md:90`.
- Dashboard UI should render from store state rather than duplicated transformations; see `AGENTS.md:65`.

## Landing Page Work

If the task is limited to the landing page, also read the landing-specific constraints in `AGENTS.md:94` before editing anything under `src/components/landing`.
