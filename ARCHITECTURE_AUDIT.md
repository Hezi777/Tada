# Architecture Audit

Audit date: February 28, 2026

Scope: full repository read-through with no runtime changes. This report documents the current architecture only.

## Runtime Boundary

The live application path is:

- `apps/web/src/*`
- `apps/api/src/index.ts`
- `apps/api/src/core/*`
- `packages/shared/src/index.ts`

The API TypeScript config explicitly excludes `apps/api/src/_legacy`, so everything under `_legacy` is non-runtime code for the current app. That folder still matters architecturally because it duplicates major concerns and obscures the actual source of truth, but it is not compiled into the live API.

## 1. Project Structure

### Repository map

- `apps/web`
  - Owns the React/Vite frontend.
  - Active runtime areas:
    - `src/pages`: route-level screens. `Index.tsx` is the real flow controller.
    - `src/components/app`: upload, processing, dashboard, and floating chat UI.
    - `src/components/landing`: marketing/landing sections.
    - `src/lib/api.ts`: HTTP client for upload and chat.
    - `src/lib/dashboard-store.ts`: global client dashboard state.
    - `src/lib/dashboard-runtime.ts`: chart/KPI validation and data shaping for rendering.
    - `src/lib/chart-layout.ts`: responsive chart grid sizing.
    - `src/lib/dataset.ts`: local file parsing and profiling.
  - Non-core but present:
    - `src/components/ui`: large shadcn/Radix primitive set. Only a small subset is used by the app.
    - `src/hooks`: generic UI hooks.
    - `src/test`: minimal test scaffold.

- `apps/api`
  - Owns the Express API.
  - Live runtime areas:
    - `src/index.ts`: server bootstrap and routes.
    - `src/core/upload.ts`: file parsing and dashboard creation.
    - `src/core/infer.ts`: column kind inference.
    - `src/core/dashboard-config.ts`: KPI generation, fallback chart generation, and initial AI chart generation.
    - `src/core/chat.ts`: chat intent handling, rule parser, and AI patch generation.
    - `src/core/state.ts`: in-memory dataset state and row storage.
    - `src/core/types.ts`: local aliases for shared types.
  - Support:
    - `src/papaparse.d.ts`: typing shim.
  - Non-runtime:
    - `src/_legacy`: excluded from build, contains two older API architectures.

- `packages/shared`
  - Owns cross-workspace contracts.
  - Current contents are only Zod schemas and types for health, dataset metadata, chart configs, KPIs, upload response, chat request/response, and BI rule constants.

- Root
  - `package.json`: npm workspaces root and shared scripts.
  - `README.md`: current high-level repo readme, partially accurate.
  - `MVP Spec.md`: earlier product spec, partly outdated relative to live code.
  - `README_Example.md`: unrelated example/readme artifact, not part of the app.

### Misplaced or overlapping structure

- `apps/api/src/_legacy` contains two separate abandoned pipelines:
  - `_legacy/pipeline/*`
  - `_legacy/legacy/*`
  This is not just archived code. It is a full duplicate architecture for normalization, chart selection, LLM calls, and chat handling.

- `apps/web/src/lib/dataset.ts` mixes live and legacy concerns.
  - Live: `parseDatasetFile()` feeds the current upload flow.
  - Legacy leftovers: `buildCharts()`, local `ChartConfig`, `formatDateRange()`, `getPrimaryMetricLabel()`, dataset profiling and chart generation utilities that are not used by the current dashboard.

- `apps/web/src/components/ui` is much larger than the active app surface. The live app imports only a small subset (`badge`, `button`, `card`, `dialog`, `input`, `label`, `separator`, `sheet`, `skeleton`, `sonner`, `toast`, `toaster`, `toggle`, `tooltip`), leaving a large amount of unused UI scaffolding inside the runtime source tree.

- `apps/web/README.md` is stale. It describes a client-only MVP with no backend and simulated chat, which no longer matches the live app.

- `apps/web/bun.lockb` and `apps/web/package-lock.json` both exist inside a repo that is configured as a root npm workspace. This conflicts with the documented "run npm from the root only" boundary.

- `apps/web/src/App.css` exists but is not imported anywhere.

- `README_Example.md` appears unrelated to this repository's architecture.

### Legacy vs live boundary in `apps/api/src`

Live code:

- `index.ts`
- `core/upload.ts`
- `core/infer.ts`
- `core/dashboard-config.ts`
- `core/chat.ts`
- `core/state.ts`
- `core/types.ts`

Legacy code:

- `_legacy/state-store.ts`
- `_legacy/pipeline/*`
- `_legacy/legacy/*`

Clarified boundary:

- The current server routes import only `./core/*`.
- `apps/api/tsconfig.json` excludes `src/_legacy`, so `_legacy` is not compiled.
- `_legacy/pipeline/*` looks like a first rewrite of the API pipeline.
- `_legacy/legacy/*` looks like an even older architecture nested inside `_legacy`.
- `_legacy/state-store.ts` belongs only to those older implementations.

Architecturally, the boundary is clear to TypeScript but not clear to a human reader because the old code still lives immediately beside the live runtime, uses similar filenames, and still imports `@tada/shared` contracts that no longer exist in shared.

## 2. State Management

### State inventory

Frontend local state:

- `apps/web/src/pages/Index.tsx`
  - `appState`: app-level view state machine (`landing | upload | processing | dashboard`)
  - `dataset`: parsed local dataset
  - `isUploadReady`: upload/process completion latch
  - `uploadError`: current upload error string

- `apps/web/src/components/app/UploadScreen.tsx`
  - `isDragging`
  - `fileInputRef`

- `apps/web/src/components/app/ProcessingView.tsx`
  - `currentStep`
  - `completedSteps`
  - `stepsDone`

- `apps/web/src/components/app/AppShell.tsx`
  - `themeMode`

- `apps/web/src/components/app/FloatingChat.tsx`
  - `isOpen`
  - `messages`
  - `input`
  - `isSending`

- `apps/web/src/components/landing/HowItWorks.tsx`
  - `visibleItems`
  - `sectionRef`

Frontend global state:

- `apps/web/src/lib/dashboard-store.ts`
  - `datasetId`
  - `version`
  - `fileName`
  - `columns`
  - `datasetMeta`
  - `rows`
  - `charts`
  - `kpis`

Backend in-memory state:

- `apps/api/src/core/state.ts`
  - `datasetStateStore: Map<string, DashboardState>`
  - `datasetRowsStore: Map<string, Row[]>`

### Ownership and flow

- `Index.tsx` owns the screen flow and upload orchestration.
- `dashboard-store.ts` owns the live dashboard state used by `Dashboard.tsx` and `FloatingChat.tsx`.
- The API owns only the initial snapshot and raw rows after upload.
- After upload, the client becomes the effective owner of evolving chart state because chat changes are applied only in the browser.

### Flow shape

1. `Index.tsx` parses the file locally with `parseDatasetFile(file)` and uploads the same file to the API with `uploadDataset(file)` in parallel.
2. The API returns dataset metadata, charts, and KPIs.
3. The client initializes `dashboard-store` with:
   - chart/KPI/config state from the API
   - row data from the client-side parser
4. `Dashboard.tsx` renders from `dashboard-store`.
5. `FloatingChat.tsx` sends `datasetId`, `message`, and current `chartConfigs` to the API.
6. The API returns a patch.
7. The client mutates `dashboard-store` locally with `applyChatbotPatch()`.

### Flags

- Dual source of truth for dataset contents:
  - The API parses and infers on one copy of the file.
  - The browser parses and normalizes a second copy of the same file.
  - Charts are generated from server-side rows but rendered from client-side rows.

- Chart config has no single enforcement layer.
  - Shared owns the shape.
  - API validates generated charts in `apps/api/src/core/dashboard-config.ts`.
  - Frontend re-validates charts in `apps/web/src/lib/dashboard-runtime.ts`.
  - The validation logic is duplicated, not shared.

- Unused or stale state:
  - `Index.tsx` stores `dataset`, then passes it into `AppShell`, where it is ignored with `void dataset`.
  - `AppShell.tsx` keeps `themeMode`, but there is no UI to change it.
  - `FloatingChat.tsx` emits a `tada:chart-pulse` event, but nothing listens for it.

- Duplicate concern state:
  - `dataset.ts` keeps a rich local `DatasetState` with columns, stats, and profile, but the live dashboard uses only serialized rows and file name from that object.
  - API stores full raw rows in memory, but live chat does not actually read them for chart edits.

- Prop drilling is limited.
  - Most state is local or global.
  - The notable dead prop is `dataset` passed into `AppShell`.

## 3. AI Integration

### Live AI path: initial chart generation

Entry path:

- `POST /api/upload`
- `apps/api/src/core/upload.ts -> buildInitialChartConfigs()`
- `apps/api/src/core/dashboard-config.ts -> suggestChartsWithLLM()`

What is sent to the model:

- Prompt instructions:
  - strict JSON only
  - BI generation rules from `BI_GENERATION_RULES`
  - explicit chart schema
  - "Return 2 to 6 charts"
  - "Use only provided column names"
- Data payload:
  - `rowCount`
  - `columns: [{ name, kind }]`
  - `sampleRows: rows.slice(0, 6)`

What is not sent:

- The full dataset
- Full file contents
- All rows

What the model is expected to return:

- JSON object with `charts`
- Each chart contains:
  - `type`
  - `title`
  - `insight`
  - `columns`
  - `aggregation`
  - `groupBy`
  - `timeColumn`
  - `size`

Validation behavior:

- Response body is expected to contain `generated_text`.
- JSON is extracted by taking the substring from first `{` to last `}`.
- Charts are normalized into `IncomingChartConfig`.
- `ChartConfigSchema.parse()` enforces base shape.
- `validateChartCollection()` enforces semantic rules against actual columns and rows.

Fallback behavior:

- If the HF response is non-OK, missing text, unparsable, empty, or fails chart validation, the code silently falls back to deterministic chart generation.
- If the `fetch()` call itself throws, that error is not caught inside `suggestChartsWithLLM()`, so upload fails instead of falling back.

### Live AI path: chat patch generation

Entry path:

- `POST /api/chat`
- `apps/api/src/core/chat.ts -> handleChat()`

Execution order:

1. Try rule-based parsing first with `parseRulePatch()`.
2. If no rule patch matches, call `requestPatchFromLlm()`.

What the rule parser uses:

- User message
- Current chart configs from the request
- Dataset columns from server state

What the LLM prompt sends:

- Prompt instructions:
  - strict JSON only
  - BI generation rules
  - explicit patch schema
  - "Use only provided columns and current chart IDs"
- Data payload:
  - `message`
  - `columns: [{ name, kind }]`
  - `sampleRows: state.datasetMeta?.sampleRows ?? []`
  - `charts: [{ id, type, title, insight, columns, aggregation, groupBy, timeColumn, order }]`

What is not sent:

- Full dataset rows
- Full file contents
- KPIs
- Current frontend-only state beyond chart configs supplied by the client

What the model is expected to return:

- JSON object with:
  - `assistantMessage`
  - `patch`
- `patch` may be:
  - `add`
  - `remove`
  - `update`
  - `null`

Validation behavior:

- `ChatbotChartPatchSchema.safeParse()` validates structural shape only.
- There is no semantic validation in the API chat path that checks:
  - added/updated columns exist
  - time columns are valid dates
  - scatter columns are numeric/correlated
  - chart ids exist for updates/removals
  - `kpi` patches are renderable by the frontend

The frontend becomes the semantic validator because `dashboard-store.ts` re-validates the whole chart collection when applying a patch.

### Flags

- Initial chart generation is validated much more rigorously than chat patch generation.

- Chat allows a schema path that the UI does not truly support.
  - Shared `ChartType` includes `kpi`.
  - Chat LLM schema allows `kpi`.
  - Rule-based chat rejects `kpi`.
  - `Dashboard.tsx` has no dedicated KPI chart renderer, so a `kpi` chart patch falls through to bar-chart rendering behavior.

- Broad catches and silent fallbacks exist in both live and legacy AI paths.
  - Upload chart generation hides many AI failures by returning fallback charts.
  - Chat patch generation hides many model/output failures by returning `null` and a generic assistant response.
  - Network-level fetch failures still bubble and fail the request entirely.

- AI never sees full file contents in the live path.
  - Initial chart generation: column names + column kinds + sample rows.
  - Chat patch generation: column names + sample rows + current chart list + message.

## 4. Data Flow

### Full lifecycle: upload -> parse -> AI analysis -> chart config -> render

1. User selects or drops a file in `UploadScreen.tsx`.
2. `Index.tsx` enters `processing` state.
3. `Index.tsx` runs in parallel:
   - browser parse: `parseDatasetFile(file)`
   - API upload: `uploadDataset(file)`
4. Browser parse (`apps/web/src/lib/dataset.ts`):
   - reads full file
   - parses CSV/XLS/XLSX
   - normalizes values into strings/numbers/booleans/dates/null
   - infers local column types
   - computes stats/profile
5. API upload (`apps/api/src/core/upload.ts`):
   - reads full file again
   - parses CSV/XLS/XLSX
   - infers server column kinds
   - builds KPIs
   - builds charts via AI or fallback
   - creates dataset id
   - stores server rows and snapshot in memory
6. Client store initialization:
   - snapshot from API
   - rows from browser parse, serialized by `dashboard-runtime.ts`
7. `Dashboard.tsx` renders KPIs and charts from the client store.
8. Chat sends current chart configs back to the API for each request.
9. API returns a patch.
10. Client mutates the chart config list locally and re-renders.

### Broken or risky handoffs

- The single biggest handoff break is browser-parsed rows vs server-generated chart configs.
  - Upload analysis happens on server rows.
  - Rendering happens on client rows.
  - The parsing heuristics differ materially between `apps/api/src/core/infer.ts` and `apps/web/src/lib/dataset.ts`.
  - This means the chart config producer and chart renderer do not operate on the same normalized dataset.

- Chat changes are not written back to API state.
  - `apps/api/src/core/state.ts` stores only the original snapshot from upload.
  - `apps/api/src/core/chat.ts` never updates that stored snapshot.
  - `/api/dashboard` therefore returns stale upload-time state.
  - Each chat request depends on the frontend sending current `chartConfigs`, so the browser is the evolving truth, not the API.

- `ProcessingView.tsx` is presentation-only progress.
  - It does not reflect actual backend stages.
  - Completion waits for a local timer and a boolean readiness latch, not real server milestones.

- Error boundaries are missing.
  - There is no React error boundary around dashboard rendering or chat patch application.
  - A bad chart patch can throw from `dashboard-store.ts` and surface as a generic chat message rather than a controlled UI state.

### Performance and scalability bottlenecks

- Full file is parsed twice for every upload:
  - once in the browser
  - once in the API

- Both browser and API keep the full dataset in memory.
  - Browser keeps serialized rows in `dashboard-store`.
  - API keeps raw rows in `datasetRowsStore`.

- API upload uses `multer.memoryStorage()`, so uploads are buffered fully in memory.

- Excel parsing uses only `SheetNames[0]`, so workbook uploads ignore every sheet after the first.

- Rendering work is row-scale and repeated.
  - `hasRenderableChartData()` precomputes per-chart renderability from all rows.
  - `ChartContent` then recomputes chart series again to render.
  - KPI values are recomputed from rows on every render.

- There is no real file size enforcement.
  - UI text claims "Maximum file size: 100MB".
  - No frontend or backend limit enforces that value.

## 5. File Chaining

Current state of multi-file support:

- One uploaded file at a time only.
- One `multipart/form-data` field named `file`.
- `UploadScreen.tsx` takes only the first dropped or selected file.
- API route uses `upload.single("file")`.
- Browser state stores one `datasetId`.
- Chat operates against one active `datasetId`.
- Excel uploads read only the first worksheet.

What exists:

- The API maps can hold multiple datasets in memory simultaneously, keyed by `datasetId`.
- That is multi-session storage, not multi-file chaining within one dashboard.

What is half-built:

- Nothing in the live runtime suggests active multi-file chaining logic.

What is missing:

- multiple upload fields
- dataset merge/combine flow
- per-file provenance in chart configs
- cross-file joins
- multi-sheet workbook handling
- any UI for selecting more than one source dataset

## 6. Component Architecture

### Component tree

Root tree:

- `App`
  - `QueryClientProvider`
  - `TooltipProvider`
  - `Toaster`
  - `Sonner`
  - `BrowserRouter`
    - `/ -> Index`
    - `* -> NotFound`

`Index` branches into four app states:

- `landing`
  - `Header`
  - `Hero`
  - `Features`
  - `HowItWorks`
  - `CTA`
  - `Footer`

- `upload`
  - `UploadScreen`

- `processing`
  - `ProcessingView`

- `dashboard`
  - `AppShell`
    - `Dashboard`
      - KPI card grid
      - `ChartStructureCard`
      - `DndContext`
        - `SortableContext`
          - `ChartCard`
            - `ChartContent`
    - `FloatingChat`

### Components doing too much

- `apps/web/src/components/app/Dashboard.tsx`
  - Owns KPI rendering, chart rendering, chart empty states, DnD wiring, chart ordering, hide/show actions, and fallback landing state.
  - It is the largest frontend component and mixes container logic with multiple presentational subdomains.

- `apps/web/src/pages/Index.tsx`
  - Owns screen routing, upload orchestration, local parsing, API upload, error handling, store initialization, and logout/reset.
  - It acts as the app state machine and the upload controller.

- `apps/api/src/core/dashboard-config.ts`
  - Owns KPI generation, fallback chart generation, AI prompting, AI response extraction, chart normalization, and chart validation.
  - It is effectively both rules engine and AI integration layer.

- `apps/api/src/core/chat.ts`
  - Owns message parsing, rule-based command handling, chart template generation, AI prompting, patch parsing, and response shaping.

### Logic inlined instead of isolated

- `Dashboard.tsx` contains most chart rendering logic inline rather than splitting chart renderers by chart type.

- `Index.tsx` contains upload workflow logic inline rather than isolating upload/session orchestration into a hook or controller module.

- `AppShell.tsx` contains theme bootstrap logic inline even though the app has no theme switcher and already depends on `next-themes` indirectly.

### Direct DOM / global access

- `AppShell.tsx` mutates `document.documentElement.classList` directly for dark mode.

- `Dashboard.tsx` navigates by assigning `window.location.href = "/"`.

- `dashboard-store.ts` publishes mutation methods to `window.tadaDashboardStore`.

- `FloatingChat.tsx` dispatches a custom global event `tada:chart-pulse`.

- `UploadScreen.tsx` triggers the hidden file input via `ref.click()`.

None of these are catastrophic alone, but they increase global coupling. The `tadaDashboardStore` global and unused `tada:chart-pulse` event are the strongest examples of React ownership leaking into the window object.

## 7. Chatbot Integration

### Frontend implementation: `FloatingChat.tsx`

What it does:

- Opens a right-side sheet UI.
- Maintains local chat transcript in component state.
- Sends one request at a time to `/api/chat`.
- Applies returned chart patches directly to `dashboard-store`.

What it sends:

- `datasetId`
- raw user `message`
- current client `chartConfigs`

What it can do in practice:

- add a chart
- remove a chart
- update a chart
- return an assistant message string

What it cannot do in the live path:

- answer analytical questions from full dataset contents
- query full rows
- access KPI state
- persist conversation server-side
- persist dashboard mutations server-side
- operate across multiple datasets
- guarantee semantically valid chart changes before returning them

### Backend implementation: `chat.ts`

Rule-based capabilities:

- Remove/delete chart by number or title reference.
- Add/create/make chart by requested type and rough "of X by Y" parsing.
- Update/change/switch chart type or append "(updated)" to the title.

LLM-backed capabilities:

- Same patch envelope as above, but driven by the model rather than hardcoded rules.

Current dashboard state access:

- Yes, but only partially.
- The backend has access to:
  - server-side column list
  - server-side `datasetMeta.sampleRows`
  - client-supplied current chart configs
- The live chat implementation does not use full stored rows for reasoning.

How chart changes reach the UI:

1. API returns `{ assistantMessage, patch }`
2. `FloatingChat.tsx` calls `applyChatbotPatch(patch)`
3. `dashboard-store.ts` mutates local chart state and increments version
4. `Dashboard.tsx` re-renders from the updated store

Important architectural limitation:

- The patch is not applied on the server.
- The server remains an upload-time snapshot plus raw rows.
- The browser is the only place where post-upload chart mutations exist.

## 8. Dependencies

### Root

- `concurrently`

### Web: major runtime dependencies

- React 18
- React Router
- Tailwind CSS
- shadcn/Radix UI packages
- Recharts
- `@dnd-kit/*`
- `papaparse`
- `xlsx`
- `@tanstack/react-query`
- `sonner`
- `next-themes`
- `@tada/shared`

### API: major runtime dependencies

- Express
- `multer`
- `papaparse`
- `xlsx`
- `dotenv`
- `@tada/shared`

### Shared

- `zod`

### Dependency flags

- `@tanstack/react-query` is present but effectively unused.
  - The app wraps everything in `QueryClientProvider`.
  - No `useQuery`, `useMutation`, or related hooks are used anywhere.

- `next-themes` is only used inside `components/ui/sonner.tsx`.
  - There is no `ThemeProvider` in the app tree.
  - The active theme behavior is actually owned by `AppShell.tsx`, not `next-themes`.

- `papaparse` and `xlsx` are duplicated across web and API by design, because both sides parse the file independently.
  - This is not an accidental package duplicate.
  - It reflects the deeper architectural duplication in the data pipeline.

- `zod` exists in both `packages/shared` and `apps/web`.
  - Shared needs it for contract schemas.
  - Web appears to carry it only for schema consumption, not local schema ownership.

- The web app contains many generated Radix/shadcn dependencies that back unused component files.

- Lockfile/package-manager duplication exists:
  - root `package-lock.json`
  - `apps/web/package-lock.json`
  - `apps/web/bun.lockb`

## 9. Breakage Patterns

Ordered by severity.

1. Browser and API parse the same file independently, then the app renders API-generated configs against browser-generated rows.
   - This is the most important instability source.
   - Chart generation and chart rendering do not share one normalized dataset.

2. Chat mutations are client-only and do not update backend state.
   - The server snapshot stays stale after upload.
   - `/api/dashboard` is already out of sync after the first chat-driven edit.
   - Each chat request depends on the client sending the latest chart list back.

3. Chat patch validation is structural, not semantic.
   - The API can return patches that satisfy schema but still do not fit the actual dataset or renderer.
   - Invalid patches are caught late by the frontend store, not at the API boundary.

4. Chart rules are duplicated across shared constants, API validation, frontend validation, and renderer assumptions.
   - There is no single executable source of truth for chart validity.
   - Drift is already visible in the `kpi` chart type path.

5. Live and legacy architectures coexist in the repo with overlapping filenames and concepts.
   - `_legacy` is excluded from build but remains large, detailed, and structurally similar to the live code.
   - `apps/web/src/lib/dataset.ts` also contains legacy/client-only logic beside live parsing code.

6. Upload and render paths are memory-heavy and row-scale.
   - Full file buffered in memory on upload.
   - Full file parsed twice.
   - Full rows stored in browser and API.
   - Per-chart aggregation recomputed repeatedly at render time.

7. Error handling around AI is inconsistent.
   - Some failures silently degrade to fallback charts or null patches.
   - Some failures bubble and abort upload/chat entirely.
   - This makes failure modes hard to reason about from the UI.

8. The repo contains stale documentation and scaffolding that no longer matches the runtime.
   - `apps/web/README.md` describes a client-only simulated backend.
   - `README_Example.md` is unrelated.
   - unused UI scaffolding and unused files raise the cost of understanding the live system.

9. The dashboard view component is a large mixed-responsibility surface.
   - Rendering, interaction, layout, and mutation logic are tightly coupled in one file.
   - Small feature additions are likely to produce regressions in unrelated dashboard behavior.

## Additional Observations

- The live app is closer to a client-authored dashboard editor than a server-authored dashboard system.
  - Upload-time state is server-authored.
  - Post-upload evolution is client-authored.

- The AI integration in the live path is intentionally narrow.
  - It works from schema, sample rows, and current chart configs.
  - It is not a general data-question answering system over the full uploaded dataset.

- The current repository contains three architectural eras at once:
  - current live API core
  - older `_legacy/pipeline`
  - older `_legacy/legacy`
  plus older client-side dashboard logic still embedded in `apps/web/src/lib/dataset.ts`
