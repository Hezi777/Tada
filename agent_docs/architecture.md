# TADA Architecture Map

Audited: 2026-02-28. Update this file after each phase.

## Runtime Boundary
Only these paths are compiled and live:
- `apps/web/src/*`
- `apps/api/src/index.ts`
- `apps/api/src/core/*`
- `packages/shared/src/index.ts`

`apps/api/src/_legacy/` is excluded from tsconfig and is dead. Do not read or modify it.

## Key Files

### Frontend
- `apps/web/src/pages/Index.tsx` - app state machine + upload orchestration (does too much, Phase 5 split)
- `apps/web/src/components/app/Dashboard.tsx` - KPI + chart render + DnD + actions (does too much, Phase 5 split)
- `apps/web/src/components/app/FloatingChat.tsx` - chat UI + patch application
- `apps/web/src/lib/dashboard-store.ts` - global chart/KPI/dataset state (source of truth post-upload)
- `apps/web/src/lib/dashboard-runtime.ts` - chart/KPI validation and data shaping
- `apps/web/src/lib/chart-layout.ts` - responsive chart grid sizing
- `apps/web/src/lib/dataset.ts` - dead legacy browser parse path plus unused dataset helpers; do not use for dashboard initialization
- `apps/web/src/lib/api.ts` - HTTP client for upload and chat

### Backend
- `apps/api/src/core/upload.ts` - file parse + dashboard creation entry point
- `apps/api/src/core/dashboard-config.ts` - KPI generation, AI chart generation, fallback chart generation
- `apps/api/src/core/chat.ts` - rule-based + LLM chat patch handling
- `apps/api/src/core/infer.ts` - server-side column kind inference
- `apps/api/src/core/state.ts` - in-memory dataset store (upload snapshot only, not updated by chat)
- `apps/api/src/core/types.ts` - local type aliases

### Shared
- `packages/shared/src/index.ts` - Zod schemas + types for all cross-workspace contracts

## Data Flow (current)
1. User uploads file
2. API parses file once in `apps/api/src/core/upload.ts`
3. API returns charts, KPIs, serialized rows, and file name
4. Browser initializes `dashboard-store` entirely from the API upload response
5. Dashboard renders from API-provided rows and API-provided chart/KPI config
6. Chat sends datasetId + message + current chartConfigs to API
7. API validates patch semantics before returning
8. Browser applies only validated patches locally

## Known Architectural Debt (post-phase-1)
- Server state is still not updated after chat; browser remains the source of truth for post-upload edits
- `dataset.ts` still contains dead legacy functions alongside the now-unused browser parse path
- Dashboard.tsx and Index.tsx still do too many jobs
- React Query is installed but unused

## Post-Phase-1

Completed in this phase:
- Removed the dual parse pipeline
- API is now the single source of truth for normalized rows
- `dashboard-store` initializes rows from the API response
- `suggestChartsWithLLM()` now catches network failures and falls back to deterministic charts
- Chat patches are semantically validated at the API boundary

Phase-1 guards now in place:
- Upload chart generation no longer crashes on HF network errors
- Chat rejects `kpi` chart patches because the frontend has no renderer
- Chat rejects add/update patches that reference unknown dataset columns
- Chat rejects update/remove patches for unknown chart ids
