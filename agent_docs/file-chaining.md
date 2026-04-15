# File Chaining

Audited: 2026-03-01

## Current State

File chaining exists in the live runtime.

Server endpoints:

- `POST /api/upload`
- `POST /api/upload/chain`
- `DELETE /api/upload/chain`

Server implementation:

- `src/features/dashboard/server/upload.ts`
- `src/features/dashboard/server/state.ts`

## Behavior

- The first upload creates a dataset snapshot.
- Additional compatible files can be chained onto the active dataset.
- Chained rows are merged into one dataset view.
- Merged rows are tagged with `sourceFile`.
- KPI values and dataset metadata are regenerated from merged rows.
- Existing chart configs are preserved where possible.

## Schema Compatibility

Chained uploads are rejected when:

- column counts differ
- required columns are missing
- column kinds do not match
- unexpected columns appear

Compatibility is checked in `src/features/dashboard/server/upload.ts`.

## Client Integration

Client state stores:

- `files`
- merged `rows`
- `datasetMeta`
- `kpis`
- `charts`

File management UI lives in the authenticated app shell and file manager surfaces.

## Constraints

- The primary uploaded file cannot be removed.
- Chaining still relies on server in-memory dataset state.
- Multi-sheet workbook merging is not a separate advanced flow; Excel parsing still starts from the first sheet during file parse.
