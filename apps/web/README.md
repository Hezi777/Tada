# Tada Web

Next.js app for Tada Instant Insights.

## Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS and shadcn/ui
- Zustand for dashboard state
- Supabase for auth and persisted data
- Vitest for tests

## Key Directories

- `src/app` - pages, layouts, route handlers, and server actions
- `src/components` - app, landing, and UI components
- `src/lib` - client utilities, dashboard runtime helpers, and Supabase clients
- `src/server` - server-side dashboard generation, chat, upload parsing, and in-memory state
- `src/test` - test setup

## Local Development

```sh
npm install
npm run dev
```

When working in the monorepo, prefer running `npm run dev` from the workspace root. The root script applies the workspace-safe environment workaround before starting this app.

## Scripts

- `npm run dev` - start Next.js dev server
- `npm run build` - build the app
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript without emitting
- `npm run test` - run Vitest
- `npm run test:watch` - run Vitest in watch mode

## Environment

Use `apps/web/.env.example` as the reference for environment variables. `GROQ_DASHBOARD_MODEL` and `GROQ_CHAT_MODEL` are optional and fall back to built-in defaults for local development.
