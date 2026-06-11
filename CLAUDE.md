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
- Validate AI output before it reaches dashboard state (zod via `jsonCompletion` in `src/shared/lib/ai/groq.ts`)
- Shared schemas, BI limits, and dataset topics live in `src/shared/contracts/index.ts`
- Centralize env access in `src/shared/lib/env.ts`; model names in `src/shared/lib/ai/config.ts`
- Dashboard state should flow through `src/features/dashboard/client/store.ts`

## AI / RAG Shape

- Embeddings are local (Transformers.js, multilingual-e5-small, 384-dim) via `src/shared/lib/ai/embeddings.ts` — Groq has no embeddings endpoint; never mix embedding models between seed and query time
- BI Rules RAG: `data/bi-rules.json` → seeded into `bi_rules_chunks` (`npm run seed:bi-rules`) → retrieved in generation (`src/features/rag/server/bi-rules.ts`) → enforced by `src/features/dashboard/server/rules.ts`
- Per-user Data RAG: chunks built/embedded into `user_data_chunks` at generate time (`src/features/rag/server/user-data.ts`), retrieved at chat time
- Upload is two-phase: `/api/upload` (parse + profile + persist) then `/api/generate` (grounded charts/KPIs + chunk indexing)
- Profiling is pure TS; PII columns must stay out of LLM prompts and embeddings
- Data access uses the RLS-scoped server client; the admin client is for account deletion only
- Israeli conventions: slash dates parse DD/MM, display DD/MM/YYYY, ₪ before amounts, bidi-isolate values (`src/shared/lib/format.ts`)

## How To Work

- Run commands from the repo root
- Use `npm run typecheck` and `npm run lint` after meaningful code changes
- Use `npm run test` when touching test-covered behavior
