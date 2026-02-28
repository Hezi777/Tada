# AI Integration

## Model
HuggingFace Inference API - default model: `HuggingFaceH4/zephyr-7b-beta`

Configured via:
- `HF_API_KEY`
- `HF_MODEL`

## Live AI Paths

### 1. Initial Chart Generation
Entry: `POST /api/upload`

Path:
- `apps/api/src/core/upload.ts -> buildInitialChartConfigs()`
- `apps/api/src/core/dashboard-config.ts -> suggestChartsWithLLM()`

What the model receives:
- `rowCount`
- `columns: [{ name, kind }]`
- `sampleRows: rows.slice(0, 20)`
- `columnStats` for each column:
  - `min`
  - `max`
  - `uniqueCount`
  - `nullCount`
  - `topValues` (top 5 most frequent values with counts)
- `BI_GENERATION_RULES`
- instruction to return strict JSON using only provided column names

What it returns:
- `{ charts: ChartConfig[] }`

Validation chain:
1. Extract JSON substring from response
2. Normalize into `IncomingChartConfig`
3. `ChartConfigSchema.parse()` for structural validation
4. `validateChartCollection()` for semantic validation against actual columns and rows

Fallback behavior:
- If HF response is non-OK, unparsable, empty, or fails validation, the API falls back to deterministic charts
- Network failures in `fetch()` are now caught and also fall back to deterministic charts

### 2. Chat Patch Generation
Entry: `POST /api/chat`

Path:
- `apps/api/src/core/chat.ts -> handleChat()`

Execution order:
1. Try `parseRulePatch()` first
2. If no rule match, call `requestPatchFromLlm()`
3. Validate returned patch semantically at the API boundary

What the model receives:
- `message`
- `columns: [{ name, kind }]`
- `sampleRows: state.datasetMeta?.sampleRows ?? []`
- `charts`: current chart list from client request
- `BI_GENERATION_RULES`
- instruction to return strict patch JSON using only provided columns and current chart IDs

What it returns:
- `{ assistantMessage, patch }`
- `patch` can be `add`, `remove`, `update`, or `null`

Validation:
- `ChatbotChartPatchSchema.safeParse()` handles structural validation
- API semantic validation now rejects:
  - unknown dataset columns in add/update patches
  - `kpi` chart type patches
  - update/remove operations for unknown chart IDs

## What AI Does Not See
- Full file contents
- All rows
- KPI state
- Post-upload chat history

Initial chart generation now sees richer column statistics and a larger sample, but it still does not receive the full dataset.

## BI Rules
`BI_GENERATION_RULES` lives in `packages/shared/src/index.ts`

Used in:
- upload chart generation prompts
- chat patch prompts

The constant has been extended, not rebuilt.

## Post-Phase-2

Completed in this phase:
- Increased upload prompt sample size from 6 rows to 20 rows
- Added per-column prompt stats computed from server-side rows in memory
- Strengthened `BI_GENERATION_RULES` with variance, time-series, scatter, categorical-cardinality, title, and insight constraints
- Removed dead chart-generation/profile helpers from `apps/web/src/lib/dataset.ts`, keeping only parsing and column inference support

Current limitation:
- The chat prompt still uses `datasetMeta.sampleRows`, which is capped earlier in the upload path and does not yet include the richer `columnStats` payload
