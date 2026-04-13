# Running Tests

Use this doc when you need to verify changes.

## Default Verification

For most code changes, run these from the repo root:

- `npm run typecheck`
- `npm run lint`

These commands are defined in `package.json:11`.

## Test Command

- `npm run test` runs the web app Vitest suite through the root workspace script in `package.json:13`.
- The app-level test command is `vitest run` in `apps/web/package.json:1`.

## Practical Expectations

- UI-only markup or copy edits: `typecheck` and `lint` are usually enough.
- Server, shared schema, route, or dashboard-state changes: run `typecheck`, `lint`, and `test` if the touched area has coverage.
- If no meaningful automated test exists for the changed path, say that explicitly in your final note instead of pretending coverage exists.

## Before Skipping Verification

Check the touched files and prefer deterministic verification over judgment calls. This repo already has linting, typechecking, and app-level tests wired up in `package.json:8`.
