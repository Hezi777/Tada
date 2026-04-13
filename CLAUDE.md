# TADA Claude Context

This file is intentionally short. Read only the docs that are relevant to the task before making changes.

## Why This Repo Exists

TADA turns CSV and Excel uploads into dashboards for non-technical users. Optimize for clarity and safe defaults for a small business owner, not for analyst-oriented complexity.

## What Lives Where

- `apps/web`: the live Next.js 16 App Router app
- `packages/shared`: shared Zod contracts, BI rules, and cross-app types
- `apps/web/supabase/migrations`: checked-in Supabase migrations
- `_legacy`: dead code, never modify or reference

Start with `agent_docs/architecture.md` for the repo map and runtime boundaries.

## Universal Rules

- Keep the App Router structure. Do not reintroduce `src/pages`, Express, or a separate backend service.
- Browser code should call relative Next routes through `apps/web/src/lib/api.ts:1`.
- AI calls stay server-side. Use route handlers plus `apps/web/src/server/*`, never direct browser calls.
- Validate AI output before it reaches dashboard state. Shared schemas and BI rules live in `packages/shared/src/index.ts:1`.
- Centralize env access in `apps/web/src/lib/env.ts:1`; do not scatter direct `process.env` reads.
- Dashboard charts and mutations must flow through `apps/web/src/lib/dashboard-store.ts:1`, not ad hoc component state.
- Follow existing code patterns and rely on lint/typecheck for style enforcement instead of restating formatting rules here.

## How To Work

- Run commands from the repo root.
- Use `npm run typecheck` and `npm run lint` after meaningful code changes.
- Use `npm run test` when touching test-covered behavior in `apps/web`.
- Prefer reading focused docs below instead of loading broad context up front.

## Progressive Disclosure Docs

- `agent_docs/building_the_project.md`: canonical commands, env setup, and local workflow
- `agent_docs/running_tests.md`: verification expectations and which commands to run
- `agent_docs/code_conventions.md`: repo-specific implementation rules and boundaries
- `agent_docs/service_architecture.md`: concise architecture map and authoritative entrypoints
- `agent_docs/service_communication_patterns.md`: how browser, routes, server logic, shared contracts, and store interact
- `agent_docs/database_schema.md`: Supabase persistence shape and migration entrypoints
- `agent_docs/ai-integration.md`: AI provider, prompt grounding, and validation chain
- `agent_docs/chart-config.md`: chart lifecycle and validation layers
- `agent_docs/chatbot.md`: chat request/response flow
- `agent_docs/file-chaining.md`: chained upload behavior and constraints
