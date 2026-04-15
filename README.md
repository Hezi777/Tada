# Tada Instant Insights

Tada turns uploaded CSV and Excel files into an AI-assisted dashboard with charts, KPIs, and a copilot chat UI.

## Stack

- Next.js 16 App Router
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase for auth and persistence
- Groq for server-side AI calls
- Zod contracts in `src/shared/contracts`

## Project Structure

- `src/app` - routes and route handlers
- `src/features` - feature-scoped UI, client state, and server logic
- `src/shared` - shared UI, contracts, infra helpers, fonts, hooks, tests, and types
- `supabase` - checked-in database migrations
- `agent_docs` - internal notes

## Environment

Use `.env.local` for local development.

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`

Optional model overrides:

- `GROQ_DASHBOARD_MODEL`
- `GROQ_CHAT_MODEL`

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`

## Notes

- Browser code talks to relative Next routes through `src/shared/lib/api.ts`
- AI calls stay on the server
- Shared schemas and BI rules live in `src/shared/contracts/index.ts`
