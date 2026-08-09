# Tada v1 Ship Plan (`feat/v1-ship-fable5`)

Historical build contract for the June 2026 Fable 5 implementation sprint.
The work described here is implemented; current status and priorities live in
`docs/project-status-2026-08.md`.

## Scope

CSV/Excel/PDF upload → automatic profiling (no LLM) → RAG-grounded dashboard
generation → Hebrew/English grounded chat, plus the full web app (landing,
pricing, about, privacy, terms, auth, dashboard, dashboard manager, settings).

Out of scope (future phases, intentionally not built): iCount, WhatsApp,
payments wiring, workspaces/collaboration, streaming refresh, external DBs,
mobile, white-label, forecasting, scheduled reports, PostHog.

## Key decisions

| #   | Decision                                                                                                                                                                         | Why                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Embeddings: local `Xenova/multilingual-e5-small` (384-dim) via `@huggingface/transformers`                                                                                       | Groq has **no embeddings endpoint** (confirmed). Multilingual model is required for Hebrew data/queries. No extra API key. Model name is one constant. |
| D2  | LLM: `llama-3.3-70b-versatile` for generation + chat, via `groq-sdk`; env-overridable                                                                                            | Per spec; single config constant.                                                                                                                      |
| D3  | PDF parsing: `unpdf` (serverless pdf.js build)                                                                                                                                   | `pdf-parse` v1 has known bundler crashes in Next; `unpdf` needs no workarounds.                                                                        |
| D4  | Keep the existing custom store in `store.ts` (no zustand dep)                                                                                                                    | Works, matches project rules; adding zustand is churn.                                                                                                 |
| D5  | Keep Next 16 + React 18.3                                                                                                                                                        | Unsupported peer combo but builds today; React 19 upgrade is risk with no v1 payoff.                                                                   |
| D6  | Migrations rewritten as one clean, ordered, idempotent set; applied to the live project via Supabase MCP                                                                         | Old 001 referenced a table no migration creates. Live DB is empty, so converging is safe.                                                              |
| D7  | Data access via RLS-scoped server client instead of the service-role admin client (admin kept only for account deletion)                                                         | RLS becomes the real security boundary; service key becomes optional.                                                                                  |
| D8  | Topic detection: upload dropdown + `unknown` → embedding-similarity classification against topic descriptor vectors                                                              | "Best approach" per spec: embed + classify, deterministic, no extra LLM call.                                                                          |
| D9  | TypeScript `strict: true`                                                                                                                                                        | Per engineering standards.                                                                                                                             |
| D10 | Keep npm `xlsx` with strict upload validation (size/type/row caps)                                                                                                               | Known stale-CVE caveat; acceptable for a personal project, documented.                                                                                 |
| D11 | i18n-lite: he/en toggle + dictionary for product surfaces, `dir` switching, Israeli formatting (₪, DD/MM/YYYY, bidi isolation) everywhere data renders. Marketing stays English. | Full i18n framework is over-scope; data-layer RTL correctness is the actual product requirement.                                                       |

## Stages (each = one or more conventional commits, verified before moving on)

### 0. chore: plan + strict TS + model config

- `docs/v1-plan.md` (this file)
- `tsconfig.json` → `strict: true`; fix fallout
- `src/shared/lib/env.ts` → default both Groq models to `llama-3.3-70b-versatile`
- Verify: `npm run typecheck && npm run lint`

### 1. feat(db): full schema, pgvector, RLS, storage

Rewrite `supabase/migrations/` as an ordered idempotent set:

- `001_core.sql` — datasets (+ `topic`, `profile` jsonb, `content_hash`, `storage_path`), dataset_files, charts, kpis; RLS policies per command scoped `to authenticated` with `(select auth.uid())`
- `002_dashboards.sql` — dashboards, dashboard_datasets, updated_at trigger
- `003_vector.sql` — `create extension vector`; `bi_rules_chunks` (rule_id unique, category, content, action_if_fail, severity, embedding vector(384)); `user_data_chunks` (user_id, dataset_id, chunk_index, content, embedding vector(384)); HNSW cosine indexes; `match_bi_rules` + `match_user_data_chunks` RPCs; RLS (rules readable by authenticated; chunks user-scoped)
- `004_storage.sql` — `uploads` + `avatars` buckets with per-user folder policies
- Apply to live project via MCP; verify with `list_tables`

### 2. feat(ai): Groq + embeddings infrastructure

- `src/shared/lib/ai/config.ts` — `GROQ_MODEL`, `EMBEDDING_MODEL`, `EMBEDDING_DIM`
- `src/shared/lib/ai/groq.ts` — JSON-mode helper with zod validation, retry on malformed JSON, typed rate-limit/timeout handling; never throws raw into routes
- `src/shared/lib/ai/embeddings.ts` — lazy singleton pipeline, e5 `query:`/`passage:` prefixes, normalized vectors, LRU cache
- `next.config` `serverExternalPackages`; deps: `@huggingface/transformers`, `unpdf`, `@types/papaparse`
- Verify: embedding unit test (he/en similarity sanity), typecheck

### 3. feat(rag): BI rules dataset + retrieval + rule engine

- `data/bi-rules.json` — 59 researched rules (5 categories)
- `scripts/seed-bi-rules.ts` + `npm run seed:bi-rules` — embed + upsert into `bi_rules_chunks` (also run against live DB)
- `src/features/rag/server/bi-rules.ts` — zod-validated load + `retrieveBiRules(query, {category?, topK})`
- `src/features/dashboard/server/rules.ts` — deterministic engine: violations + `action_if_fail` application (convert_to_bar, limit_categories, sort_descending, aggregate_other_bucket, treat_as_categorical, …) honoring severity
- Wire into generation: retrieval feeds the prompt **and** post-validates output
- Verify: unit tests for the engine + retrieval (mocked rpc); seeded row count

### 4. feat(upload): parse + profile + topic + storage

- `server/parse.ts` — csv (papaparse), xlsx, pdf (unpdf text → table extraction, LLM-assisted fallback for messy PDFs)
- `server/profile.ts` — pure-TS profiling: per-column type/nulls/unique/min/max/mean/top-values; PII detection (email/phone/IL-ID) → PII columns excluded from LLM samples and embeddings
- Upload validation: 10MB cap, extension+MIME whitelist, row/column caps
- Topic: `DatasetTopic` enum in contracts; classify-by-embedding for `unknown`
- Upload flow split: `POST /api/upload` (parse+profile+persist → returns profile + suggested topic) and `POST /api/generate` (topic + chart count → grounded charts/KPIs)
- Raw file stored to `uploads` bucket; `profile`/`topic`/`content_hash` persisted on datasets
- Verify: unit tests with csv/xlsx/pdf fixtures

### 5. feat(rag): per-user data chunks + grounded chat

- `src/features/rag/server/user-data.ts` — chunk builder (column summaries, top-N aggregates, time-bucket summaries, sample windows), embed + store scoped to user/dataset, skip when `content_hash` unchanged
- `server/chat.ts` — retrieve top chunks per question instead of shipping raw rows; cached profile context; bilingual system prompt (reply in the user's language); keep patch/proposal flow
- Verify: chunking unit tests; chat integration test with mocked Groq + rpc

### 6. feat(auth): Google OAuth + flows

- Login page: Google button (`signInWithOAuth`), `src/app/auth/callback/route.ts` (`exchangeCodeForSession`), signup `emailRedirectTo`, friendly error states
- Note for owner: Google provider credentials must be configured in Supabase dashboard

### 7. feat(ui): product surfaces

- Generation confirmation step (topic + chart count) between profiling and generation
- Dashboard Manager page `(product)/dashboards`
- Settings page `(product)/settings` — profile name/avatar (storage), password change, account deletion, language toggle
- Chart cards: size control (S/M/L bento spans), hide/show/delete, skeletons, empty/error states
- `src/shared/lib/format.ts` — `formatILS`, `formatDateIL`, `abbreviateNumber`, bidi isolation
- i18n-lite (`src/shared/i18n/`), `dir` switching, Hebrew-capable font
- Design tokens enforced: `#00327d` accent, `#f7f9fb` canvas, white `rounded-[20px]` borderless cards, `rounded-full` buttons, FAB chat

### 8. feat(marketing): pricing, about, privacy, terms + nav/footer links

### 9. test: full suite green (`npm run test`, `typecheck`, `lint`)

### 10. docs: README (setup, env, architecture, both RAG systems), `.env.example`, lean CLAUDE.md

### 11. Visual QA: run app, screenshot every main screen (he + en), fix to shippable

### 12. Final: fresh-clone sanity, summary, leave branch unmerged
