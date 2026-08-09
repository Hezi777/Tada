# Tada Project Status — August 2026

## Verdict

Tada is an **engineering-complete alpha**, not a validated MVP and not yet a
production beta.

The core promise works in code: authenticated users can upload CSV/Excel/PDF,
profile data, generate validated charts and KPIs, persist dashboards, and use
grounded chat in English or Hebrew. The repository compiles, lints, builds, and
passes its 79 tests. What is missing is evidence that target users repeatedly
get value from it, plus production-flow and browser-level coverage.

## How we got here

- January–March: prototype, backend resets, framework migrations, chat, and
  multi-dashboard persistence.
- June (`feat/v1-ship-fable5`): Fable 5 implementation sprint added the
  Supabase/RLS foundation, two RAG systems, profiling, validation, PDF upload,
  grounded chat, auth, i18n, and tests.
- June–July (`feat/ui-overhaul-fable5`, `feat/widget-size-classes`): a long UI
  polish cycle and a complete replacement of fluid chart resizing with
  Apple-style fixed size classes.

There are no conversation transcript exports in this repository. Git history,
planning documents, audit notes, and the implementation are the available
record.

## What was done well

- The pure-TypeScript profiler and deterministic chart-rule enforcement reduce
  hallucination risk before AI output reaches client state.
- Zod validation is used at contracts and AI boundaries.
- User data access is scoped through Supabase RLS; privileged credentials stay
  server-side.
- PII detection keeps sensitive columns out of prompts and embeddings.
- The per-user data RAG is justified: chat needs selective retrieval over data
  summaries rather than repeatedly sending raw files.
- Hebrew/RTL, Israeli dates, currency, encoding, and bidi handling form a real
  regional product angle rather than generic AI-dashboard polish.
- The repo has a working build and focused tests for parsing, profiling, rules,
  RAG behavior, formatting, and the generation pipeline.

## Where we overoptimized

### 1. BI-rules RAG before product validation

About 60 static rules are loaded from local JSON, embedded with a local model,
seeded into pgvector, retrieved for generation, and then enforced again by a
deterministic rules engine. When vector retrieval fails, the app already falls
back to the local rules.

The corpus and deterministic enforcement are valuable. The vector retrieval
layer is likely premature for this corpus size: it adds a model download,
startup cost, seeding, database objects, and deployment failure modes without a
measured quality win. Keep the per-user data RAG; benchmark BI-rule retrieval
against simple deterministic selection before keeping it.

### 2. UI work outran the learning loop

Git history contains roughly three times as many UI/design-related commits as
core data/AI commits. The team built multiple polish systems, fluid resize,
then replaced that resize architecture with a detailed four-class widget
system. This improved presentation but did not test the core success metric:
whether a small-business owner understands and reuses the result.

### 3. Scope exceeded the original MVP

The original MVP excluded PDF, persistence, validation, and saved dashboards.
All were built before evidence of repeat usage, alongside settings, themes,
multi-dashboard management, extensive marketing pages, and granular widget
views. These are not inherently bad; they were sequenced ahead of validation.

## Competition: what matters now

The category has moved from “AI makes a chart” to an end-to-end reporting
workflow:

- Bricks now pairs one-click dashboards with multi-file inputs, global filters,
  live share links, PDF/PowerPoint export, templates, and automatic refresh.
- Julius emphasizes auditable computation, generated narrative reports,
  scheduled runs, and source-traceable numbers.
- Rows combines an AI analyst with 50+ connected sources, automatic refresh,
  collaborative spreadsheets, and embeddable reports.
- Smaller direct competitors now advertise the same upload-to-dashboard promise
  with Google Sheets sync and shareable client links.

Tada therefore cannot win on “upload a CSV and get charts” alone. Its credible
wedge is **trustworthy, zero-setup reporting for Hebrew-speaking small
businesses**, especially around messy Israeli exports and explainable business
metrics. That positioning still needs user evidence.

## P0 product and correctness findings

These are more important than junk-code cleanup or visual polish.

### Generated metrics can be wrong or irrelevant

- Column inference rejects fields above 90% uniqueness before accepting numeric
  measures. Transaction-level revenue and amount columns are commonly unique,
  so valid measures can disappear from generation.
- Headers containing broad tokens such as `name` and `title` are ignored,
  removing ordinary dimensions such as Product Name.
- Server and client count semantics disagree when a value column is present:
  the server counts grouped rows while the renderer counts only numeric,
  non-null values. Narrative and chart output can therefore conflict.
- Donut charts do not enforce non-negative, mutually exclusive part-to-whole
  data. A non-positive `Other` remainder is silently dropped.
- Time series truncate to the first 100 buckets, which can hide the newest data.
  Invalid dates, missing periods, and partial periods are not disclosed.
- Generated trend and correlation language is not derived from a reproducible
  evidence object. It can claim direction or relationship without showing the
  values, sample size, exclusions, or limitations.

### The dashboard asks users to make BI decisions too early

After upload, the user must confirm a dataset topic and choose a chart count
before seeing value. This contradicts the zero-config promise. Generate a safe
first result automatically. Ask one plain-language clarification only when
confidence is low, and put assumption correction after the result.

### The dashboard behaves like an authoring canvas

The primary header emphasizes dashboard switching, Edit, Manage Views, drag,
pin/hide, and S/M/L/XL size controls. A small-business owner first needs to know
what changed and what deserves attention. Move layout controls behind one
secondary Customize surface; remove manual size classes from the MVP UI.

### Fixed-pixel widgets are the wrong responsive contract

The current canvas and chart plots use fixed pixel dimensions selected by a
tier. This risks horizontal overflow, zoom failure, cramped mobile output, and
fragile RTL ordering. Use a semantic responsive grid with fluid chart
containers: one column on mobile, two on tablet, and a desktop grid. Order
content by business importance, not packing density.

### Error and loading behavior can mislead

- Load failures can reset the store and present an upload empty state, making an
  outage look like the user has no dashboard.
- Several create, switch, rename, and refresh failures are silently swallowed.
- The processing screen advances simulated milestones on a timer rather than
  backend state.
- An upload can create an empty dashboard before profiling/generation succeeds;
  cancel or failure can leave an artifact.

Preserve the last good state, distinguish empty from error, provide Retry, and
show either real milestones or one honest indeterminate state.

## Missing baseline dashboard capabilities

- Global date/category filters with visible active state and Reset.
- Source file, row coverage, date range, last updated, aggregation definition,
  excluded rows, unit/currency, and data-quality warnings.
- A Show data/table alternative for exact values and accessibility.
- KPI comparison context: previous period/year or target, absolute/percent
  delta, directionality, and “as of” date.
- Clear chat behavior: questions are read-only; edits show a preview with
  Apply/Cancel and Undo.
- Line charts for change, histogram for distributions, and tables for exact
  lookup. Area and scatter should not be selected through correlation-strength
  shortcuts alone.

## Simpler product model

1. Gallery: one primary **Upload file** action. Existing dashboards show name,
   source, and updated time.
2. Upload: validate first; do not persist a dashboard yet.
3. Generate automatically. Ask one clarification only if confidence is low.
4. Result: title, freshness, date range, up to four contextual KPIs, and up to
   five views organized by business question. Show assumptions plainly.
5. Explore: global filters, Show data, chart interaction, and Ask Tada.
6. Customize: rename, reorder, hide/delete, or request a chart change. Preview
   mutations and support Undo. No manual widget-size controls in MVP.
7. Data: one panel inside the dashboard for replace/add/remove source data with
   an explicit impact preview.

## Minimum semantic contract before more AI work

- Fields need explicit roles and semantic types: dimension, measure, date, ID;
  currency, quantity, rate, duration, score, text; plus unit, null rate, parse
  failures, distinct count, and confidence.
- Measures need controlled formulas and additivity: sum, average, row count,
  distinct count, ratio, semi-additive snapshot, format, and whether higher or
  lower is better.
- Views need a decision question, measure IDs, dimensions, grain, filters,
  comparison, quality disclosures, and provenance.
- Numeric claims must come from deterministic computed evidence containing
  result rows and exclusion counts. The LLM may explain those facts but must not
  author unverified numbers.
- Donuts require a meaningful non-negative denominator; partial periods must be
  labeled; comparable cards must share filter/date context; every insight must
  be reproducible from computed facts.

## Confirmed repository debt

### Completed safe cleanup

- Removed 26 unreferenced shadcn UI files and their exclusively used
  dependencies.
- Removed the unused `loadLatestDashboard` client helper and obsolete singular
  `/api/dashboard` route.
- Kept `/api/health` as the machine health endpoint and removed the duplicate
  `/health` route.
- Removed the unreferenced `pickPrimaryColumns` export.

### Documentation cleanup

- Updated `agent_docs/architecture.md` and `agent_docs/code_conventions.md` to
  remove deleted paths and reflect the current App Router, feature boundaries,
  tests, responsive grid, and deterministic BI-rule selection.

### Maintenance risks, not automatic deletions

- `config.ts`, `Dashboard.tsx`, `FileManager.tsx`, `SettingsPanel.tsx`, and
  `chat.ts` are very large and carry concentrated regression risk.
- Three process-global caches have no eviction and do not provide multi-instance
  consistency.
- Client and server validation overlap. Both boundaries need validation, but
  shared invariants should not drift.
- TypeScript excludes live UI files, and ESLint disables unused-variable checks
  globally. The repository is not as strictly checked as its docs imply.
- Browser coverage is a verified Playwright CLI smoke workflow, not yet a
  committed automated end-to-end suite.

## Recommended solo-founder sequence

1. **Fix semantic correctness first:** inference ordering, count consistency,
   donut eligibility, time truncation, and evidence-grounded claims. Add
   adversarial fixtures for ordinary sales/expense exports.
2. **Simplify the first-use flow:** remove the topic/chart-count gate, defer
   dashboard persistence until generation succeeds, and hide authoring controls
   behind Customize.
3. **Add trust basics:** source/as-of/date range, quality warnings, Show data,
   and one global date filter. Do not add more layout modes.
4. **Deploy the corrected alpha** and run five observed sessions with Israeli
   small-business owners using their own files.
5. **Instrument the funnel:** upload started, parse succeeded, dashboard shown,
   first useful insight, first chat question, return visit. Avoid building a
   broad analytics system; capture only these events.
6. **Fix observed trust failures:** wrong totals, wrong aggregation, confusing
   charts, failed Hebrew imports, and answers users cannot verify.
7. **Add the smallest retention loop users request.** Likely candidates are
   replace-file refresh, a shareable read-only link, or export—not another chart
   layout system.
8. **Run a BI-rules ablation eval:** representative files, expected chart/KPI
   assertions, vector retrieval on versus deterministic local selection. Remove
   the BI-rules vector path if it does not measurably improve results.
9. **Do the safe cleanup batch** only after the alpha is deployed and tagged.

## Specialist-agent setup

No additional agent package should be installed now.

- Use OpenAI's official Product Design audit rubric for screenshot-grounded
  product-flow review, executed with Playwright CLI.
- Use OpenAI's official web data-visualization guidance for BI/chart audits.
- Use the existing code-review tooling for explicit read-only whole-repository
  junk audits.
- The official Anthropic frontend-design skill is useful for implementation and
  visual critique, but it is not a substitute for product UX or BI correctness.
- Avoid generic community prompt packs unless their instructions and executable
  assets are reviewed and pinned. Their provenance and maintenance are weaker.

This project uses Playwright CLI only. No Playwright MCP server was present in
the active Codex configuration during this audit, so no global MCP entry was
removed.

## Current verification baseline

Run on 2026-08-08 after the remediation work:

- `npm run typecheck` — pass
- `npm run lint` — pass
- `npm run test` — 11 files, 80 tests passed
- `npm run build` — pass on Next.js 16.1.6

The linked Supabase project was restored, its migration history reconciled to
the checked-in migrations, and `supabase db push` reports it is up to date. The
performance advisor reports no warnings. The security advisor reports that
leaked-password protection is disabled and that authenticated tables are
discoverable through GraphQL; RLS remains enabled on those tables.

The build warns that the local Browserslist dataset is stale. An authenticated
Playwright CLI run against live Supabase verified email/password login, first
upload, generation and persistence, Show data, global date filtering,
customization, chat, and 320px reflow without horizontal overflow. The
disposable QA user and its data were removed afterward. Google login was
removed because that provider is intentionally disabled.

## Implementation update — 2026-08-08

All engineering remediation phases are implemented:

- Semantic correctness: deterministic chart evidence, included/excluded row
  counts, invalid-date and incomplete-row profiling, conservative semantic
  type/unit hints, corrected count/donut/time-series behavior, and adversarial
  sales/expense fixtures.
- First-use flow: upload now profiles and generates automatically without a
  topic/chart-count gate; a first dashboard is persisted only after generation
  succeeds; existing dashboards survive upload failures; progress reflects the
  active request rather than simulated completed milestones.
- Trust layer: source, row count, generated time, date coverage, quality
  warnings, global date filtering with Reset, and an accessible Show data table.
  The date filter is applied to KPI and chart calculations as well as the table.
- Customization: manual S/M/L/XL controls are removed from the MVP surface and
  dashboard authoring is consolidated under Customize.
- Responsive layout: the canvas uses fluid columns with compact 320px chart
  geometry; mobile verification found no horizontal document overflow.
- Simplification: dashboard generation selects the static BI-rule corpus
  locally and no longer embeds a rule query or calls pgvector. User-data RAG is
  unchanged.
- Cleanup: obsolete routes/helpers, unused UI modules and dependencies, and
  stale agent documentation were removed or corrected.
- Live QA fixes: filtered charts no longer retain stale generated claims, KPI
  trend percentages are hidden until a comparison-period contract exists, and
  the accidental repeated dashboard-list request loop was removed.

The validation script lives in `docs/alpha-validation-plan.md`. Five observed
sessions with actual target users and analytics-provider consent remain product
validation activities; they cannot be simulated by repository tests.
