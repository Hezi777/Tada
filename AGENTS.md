# TADA - Codex Agent Instructions

## Product Context

TADA is a zero-config dashboard product for non-technical users.
Users upload CSV or Excel files, TADA generates a dashboard, and chat can explain or modify that dashboard.
The target user is a small business owner, not a data analyst.

## Current Stack

- App: Next.js 16 App Router at the repo root
- Language: TypeScript
- UI: React 18, Tailwind CSS, Radix UI, Framer Motion
- Shared contracts: `src/shared/contracts`
- Auth and persistence: Supabase
- AI: Groq via `groq-sdk`
- Charts: Recharts
- Client dashboard state: `src/features/dashboard/client/store.ts`
- Validation: Zod in `src/shared/contracts` plus runtime validation in app/server code

## Repo Layout

- `src/app`: App Router pages and route handlers
- `src/features`: feature-scoped UI, client state, and server logic
- `src/shared`: reusable UI, infra helpers, fonts, hooks, types, and contracts
- `supabase`: checked-in Supabase migrations
- `_legacy/`: dead code, do not modify or reference

## Runtime Rules

- Do not reintroduce Express or a separate API app
- Do not reintroduce `src/pages`; the app uses App Router
- Route handlers live under `src/app/api/**/route.ts`
- Edge/session entrypoint is `src/proxy.ts`
- Browser code must call relative Next routes through `src/shared/lib/api.ts`
- AI calls stay server-side via route handlers and feature server modules

## AI Rules

- Never call the AI directly from the browser
- AI output must be validated before it touches dashboard state
- Chat responses must be grounded in current chart configs, KPI values, sample rows, and column stats
- `BI_GENERATION_RULES` in `src/shared/contracts/index.ts` is the prompt rules source of truth

## Environment Rules

- Centralize env access in `src/shared/lib/env.ts`
- Required local-dev env:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Lazy server-only env:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GROQ_API_KEY`
- Optional model env with fallbacks:
  - `GROQ_DASHBOARD_MODEL`
  - `GROQ_CHAT_MODEL`
- Do not scatter direct `process.env.FOO!` access across the app

## State Rules

- Chart config is centralized client state; do not hardcode dashboard charts in components
- Dashboard mutations must preserve validation through `src/features/dashboard/client/store.ts`
- Chat patches must be validated semantically before they are applied
- Dashboard UI should render from store state, not from ad hoc duplicated transformations

## Workflow Notes

- Canonical commands are run from the repo root:
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run format`
- Browser automation and visual QA use Playwright CLI. Do not configure or use
  Playwright/browser MCP servers for this project.

## Landing Page Rules

- Landing page route files live under `src/app/(marketing)`
- Landing-specific components live under `src/app/(marketing)/_components`
- Layout file: `src/app/layout.tsx`
- Global styles: `src/index.css`
- Do not touch dashboard feature files during landing-only tasks unless explicitly requested
