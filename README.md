# Tada Instant Insights

Tada Instant Insights is a monorepo MVP that turns uploaded CSV or Excel files into an AI-assisted dashboard with charts, KPIs, and a copilot chat UI.

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Auth%20%26%20Data-3ECF8E?logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Groq-API-F55036" />
</p>

## Features

- Upload CSV/XLSX files and infer columns, KPIs, and chart recommendations automatically.
- Render dashboards with centralized chart config state and cached client-side dashboard memory.
- Modify dashboard structure through copilot chat backed by validated server responses.
- Persist dashboards, dataset metadata, charts, and KPIs with Supabase.
- Share types and runtime schemas through the local `@tada/shared` workspace package.

## Tech Stack

| Layer  | Technology                                                                    |
| ------ | ----------------------------------------------------------------------------- |
| App    | Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| Server | Next.js route handlers on Node runtime, Supabase, Papa Parse, XLSX            |
| AI     | Groq-backed model calls from server-only code                                 |
| Shared | Local workspace package with shared types and Zod schemas                     |

## Architecture

1. The user uploads a CSV/XLSX file in the Next.js app.
2. Route handlers under `apps/web/src/app/api` parse the file and build dashboard state through `apps/web/src/server`.
3. The client stores dashboard state in Zustand and renders charts, KPIs, and chat UI.
4. Dashboard metadata and persisted configs are stored in Supabase.

There is no separate `apps/api` service anymore. The server layer now lives inside the Next.js app.

## Project Structure

- `apps/web` - Next.js app containing the UI, App Router pages, route handlers, and server modules.
- `packages/shared` - shared TypeScript contracts and Zod schemas.
- `agent_docs` - internal project and workflow notes.

## Prerequisites

- Node.js 20+
- npm
- Supabase project credentials
- Groq API key

## Install

```bash
npm install
```

## Environment Variables

Create `apps/web/.env.local` with the values your environment needs:

```env
GROQ_API_KEY=your_key_here
# Optional: defaults to openai/gpt-oss-120b
GROQ_DASHBOARD_MODEL=openai/gpt-oss-120b
# Optional: defaults to moonshotai/kimi-k2-instruct-0905
GROQ_CHAT_MODEL=moonshotai/kimi-k2-instruct-0905
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Reference example: `apps/web/.env.example`

## Run Locally

```bash
npm run dev
```

Run local development from the workspace root. The root `dev` script starts the Next.js app in `apps/web` with the workspace-safe env workaround required for this monorepo.

## Build

```bash
npm run build
```

This builds `packages/shared` first, then the Next.js app.

## Main Endpoints

| Method | Endpoint            | Description                                     |
| ------ | ------------------- | ----------------------------------------------- |
| GET    | `/health`           | Health check route                              |
| GET    | `/api/health`       | API health check route                          |
| POST   | `/api/upload`       | Upload dataset                                  |
| POST   | `/api/upload/chain` | Append a compatible file to an existing dataset |
| POST   | `/api/chat`         | Copilot chat actions                            |
| GET    | `/api/dashboard`    | Load the latest dashboard                       |
| GET    | `/api/dashboards`   | List dashboards                                 |

## Scripts

Root:

- `npm run dev` - start the Next.js app
- `npm run build` - build shared package and app
- `npm run lint` - lint the web app
- `npm run typecheck` - typecheck shared package and app
- `npm run test` - run the web test suite
- `npm run format` - format the repo with Prettier
- `npm run format:check` - verify formatting with Prettier

Web:

- `npm run dev` - start Next.js dev server
- `npm run build` - build the app
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript without emitting
- `npm run test` - run Vitest
- `npm run test:watch` - run Vitest in watch mode

## Notes

- Use npm as the package manager for this repo.
- Start from the workspace root for normal development commands.
- Some dataset state is cached in memory for fast local interactions.
- AI outputs are validated through shared Zod schemas before state updates.
