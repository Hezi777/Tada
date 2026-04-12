# TADA - Codex Agent Instructions

## Product Context

TADA is a zero-config dashboard product for non-technical users.
Users upload CSV or Excel files, TADA generates a dashboard, and chat can explain or modify that dashboard.
The target user is a small business owner, not a data analyst.

## Current Stack

- App: Next.js 16 App Router in `apps/web`
- Language: TypeScript
- UI: React 18, Tailwind CSS, Radix UI, Framer Motion
- Shared contracts: `packages/shared`
- Auth and persistence: Supabase
- AI: Groq via `groq-sdk`
- Charts: Recharts
- Client dashboard state: custom external store in `apps/web/src/lib/dashboard-store.ts`
- Validation: Zod in `packages/shared` plus runtime validation in app/server code

## Monorepo Layout

- `apps/web/src/app`: App Router pages, route handlers, server actions
- `apps/web/src/server`: server-only business logic used by route handlers
- `apps/web/src/lib`: client/server utilities, env access, Supabase helpers, dashboard runtime helpers
- `packages/shared/src/index.ts`: shared schemas, rules, and contract types
- `_legacy/`: dead code, do not modify or reference

## Runtime Rules

- Do not reintroduce Express or a separate API app
- Do not reintroduce `src/pages`; the app uses App Router
- Route handlers live under `apps/web/src/app/api/**/route.ts`
- Edge/session entrypoint is `apps/web/src/proxy.ts`
- Server-only code stays in `apps/web/src/server` or server route handlers
- Frontend code must call relative Next routes through `apps/web/src/lib/api.ts`

## AI Rules

- Never call the AI directly from the browser
- All AI calls go through server route handlers and `apps/web/src/server/*`
- AI output must be validated before it touches dashboard state
- Chat responses must be grounded in current chart configs, KPI values, sample rows, and column stats
- `BI_GENERATION_RULES` in `packages/shared/src/index.ts` is the prompt rules source of truth

## Environment Rules

- Centralize env access in `apps/web/src/lib/env.ts`
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
- Dashboard mutations must preserve validation through `dashboard-store.ts`
- Chat patches must be validated semantically before they are applied
- Dashboard UI should render from store state, not from ad hoc duplicated transformations

## Code Standards

- TypeScript strict mode
- No `any`
- No unsafe casts to silence errors
- Zod at runtime boundaries
- No silent failures unless the current UX intentionally degrades to a safe fallback
- Prefer existing utilities before adding new dependencies

## Workflow Notes

- Canonical commands are run from the workspace root:
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run format`
- `cross-env` is required in dev/build scripts to clear inherited npm workspace env during Next child-process execution

## What Not To Do

- Do not modify `_legacy/`
- Do not add a separate backend service unless explicitly requested
- Do not bypass shared schemas when adding or changing contracts
- Do not make AI calls from client components
- Do not add placeholder abstractions that are not used by the current Next app

## Landing Page Rules (UI Refactor)

### Scope
- Landing page files live in `apps/web/src/components/landing/`
- Layout file: `apps/web/src/app/layout.tsx`
- Global styles: `apps/web/src/index.css`
- Do not touch any app/, server/, or lib/ files during landing page tasks

### UI Stack for Landing
- Animations: Framer Motion only — no GSAP, no CSS animation libraries
- Smooth scroll: @studio-freight/lenis (to be installed)
- Font: Satoshi from Fontshare via @import in index.css
- Components: existing shadcn/ui components only, no new UI libraries

### Animation Standards
- All scroll-triggered animations use whileInView with once: true
- Above-the-fold animations trigger on mount, not whileInView
- Easing: easeOut for entrances, easeInOut for interactions
- Standard entrance: y:30-60 → 0, opacity:0 → 1, duration 0.6-0.8s
- Stagger between siblings: 0.1s - 0.15s delay increments
- No animation on prefers-reduced-motion users

### Do Not
- Do not over-engineer — one file changed per task unless explicitly told otherwise
- Do not install new packages without confirming first (exception: lenis)
- Do not change any props, interfaces, or logic in landing components
- Do not touch AnimatedDashboardMockup.tsx internals
- After every change run npm run typecheck and confirm zero errors