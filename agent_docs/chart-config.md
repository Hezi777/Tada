# Chart Config Architecture

Audited: 2026-03-01

## Source of Truth

Client chart state lives in:

- `src/features/dashboard/client/store.ts`

Upload-time generation lives in:

- `src/features/dashboard/server/config.ts`

Shared contract lives in:

- `src/shared/contracts/index.ts`

## Lifecycle

1. Server generates initial chart configs during upload.
2. Client stores chart configs in `dashboard-store.ts`.
3. Dashboard renders from store state.
4. Chat returns validated patches.
5. Client applies patches through store mutation helpers.

## Validation Layers

- Shared structural contract: `src/shared/contracts`
- Client semantic/runtime validation: `src/features/dashboard/client/runtime.ts`
- Server semantic/runtime validation: `src/features/dashboard/server/config.ts`

The validation logic is still duplicated across client and server, but both sides now enforce current chart semantics.

## Current Chart Shape

The shared chart contract includes fields such as:

- `id`
- `type`
- `title`
- `insight`
- `columns`
- `aggregation`
- `groupBy`
- `timeColumn`
- `size`
- `visible`
- `order`

Client rendering currently supports:

- `area`
- `bar`
- `donut`
- `scatter`
- KPI cards as dedicated KPI state, not chat-generated chart widgets

## Important Rules

- Do not hardcode dashboard chart definitions inside components
- Preserve chart order normalization when mutating state
- Validate chart collections against the real dataset columns and rows
- Avoid introducing chart types the dashboard renderer does not support

## Performance Notes

- Chart series are still derived from stored rows at render time
- KPI values are computed from current store rows
- Layout logic is handled separately in `chart-layout.ts`

## Known Debt

- Chart validation is not yet centralized in one shared executable module
- Some chart computations still happen in render paths rather than precomputed selectors
