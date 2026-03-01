# AI Integration

Audited: 2026-03-01

## Provider and Models

- Provider: Groq
- Client: `groq-sdk`
- API key env: `GROQ_API_KEY`
- Dashboard generation model env: `GROQ_DASHBOARD_MODEL`
- Chat model env: `GROQ_CHAT_MODEL`

Defaults from `apps/web/src/lib/env.ts`:

- dashboard model: `openai/gpt-oss-120b`
- chat model: `moonshotai/kimi-k2-instruct-0905`

If the model env vars are absent, the defaults are used.
If `GROQ_API_KEY` is absent, AI-specific paths degrade safely instead of blocking unrelated local app boot.

## Live AI Paths

### 1. Initial Chart Generation

Entry:

- `POST /api/upload`
- server path: `apps/web/src/server/upload.ts`
- chart generation path: `apps/web/src/server/dashboard-config.ts`

The model receives:

- inferred columns and kinds
- sample rows
- server-built column stats
- BI generation rules from `packages/shared`

The response is validated before chart configs are returned to the client.
If the model fails or returns unusable output, server logic falls back to deterministic chart generation.

### 2. Chat

Entry:

- `POST /api/chat`
- route: `apps/web/src/app/api/chat/route.ts`
- server path: `apps/web/src/server/chat.ts`

The model receives grounded context:

- user message
- current dataset columns
- column stats
- sample rows
- current KPI values
- current chart configs
- chart summaries
- BI generation rules

The model returns:

- `assistantMessage`
- `patch` or `null`

## Validation Chain

- Structural validation uses shared Zod contracts from `packages/shared`
- Semantic validation rejects:
  - unsupported chart shapes
  - unknown dataset columns
  - unknown chart ids in update/remove patches
  - unsupported KPI chart patches
- Full collection validation runs before a patch is returned to the client

## Rules

- Never call Groq from client components
- Never trust model output without validation
- Keep prompts grounded in real dataset context
- Keep `BI_GENERATION_RULES` in shared contracts, not inline in random files

## Current Limitation

- Active dataset rows used by chat remain memory-backed on the server, so AI-backed chat depends on the current in-memory dataset snapshot rather than durable row persistence.
