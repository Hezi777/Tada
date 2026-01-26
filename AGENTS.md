# AGENTS.md — TADA MVP Repository Guide

Scope: This file governs all automated and human contributions to this repository.

Read this first before making JS/TS changes.  
If anything here conflicts with ad-hoc instructions, this file takes precedence unless the user explicitly states otherwise.

---

## Repository structure

This is a monorepo using **npm workspaces**.

Workspaces:
- `apps/web` — Vite + React + Tailwind
- `apps/api` — Express + TypeScript
- `packages/shared` — shared TypeScript types and utilities (contract boundary)

Dependency direction:
- `apps/web` → `packages/shared`
- `apps/api` → `packages/shared`

Shared types **must not** be duplicated in web or api.

---

## Golden rules

- Run npm commands **from the repo root only**.
- Use npm workspaces: `npm -w <workspace> run <script>`.
- Keep changes scoped to the relevant workspace(s).
- If shared contracts change, update dependents in the **same session**.
- Update `package-lock.json` whenever dependencies change.
- Do **not** edit `node_modules` or generated build output.
- Never commit secrets, API keys, or `.env` files.

---

## Common commands

From the repo root:

- Dev (web + api):  
  `npm run dev`

- Build (shared + api + web):  
  `npm run build`

- Lint (web):  
  `npm -w apps/web run lint`

- Web tests:  
  `npm -w apps/web run test`

- Typecheck:
  - `npm -w apps/web run typecheck`
  - `npm -w apps/api run typecheck`
  - `npm -w packages/shared run typecheck`

---

## Change-based checks (required)

Run checks based on what you changed:

### If `apps/web` changed
- `npm -w apps/web run lint`
- `npm -w apps/web run test`
- `npm -w apps/web run typecheck`

### If `apps/api` changed
- `npm -w apps/api run typecheck`

### If `packages/shared` changed
- `npm -w packages/shared run typecheck`
- `npm -w packages/shared run build`

### If multiple workspaces changed
- `npm run build`

Do not skip checks that apply to your changes.

---

## Change protocol

### Contract-first changes (preferred)
Use when request/response shapes or shared data models change.

1. Update or add types in `packages/shared`.
2. Typecheck shared.
3. Update API to match the new contract.
4. Update Web to match the new contract.
5. Typecheck all touched workspaces.

### API changes
- Validate inputs at the boundary.
- Do not silently change response shapes.
- Avoid leaking internal errors or stack traces.

### Web changes
- Import shared types instead of redefining them.
- Keep API calls centralized and typed.
- Always handle loading and error states.

---

## Environment

Web:
- `VITE_API_BASE_URL` (defaults to `http://localhost:3001`)

API:
- `HF_API_KEY` (required)
- `HF_MODEL` (optional)

Guidelines:
- Fail fast if required env vars are missing.
- Never log secret values.

---

## Quality bar

Before considering a change “done”:

- All relevant typechecks pass.
- Lint passes for web changes.
- Tests pass for web changes.
- No unused dependencies or imports.
- No debug console noise left behind.
- No contract drift between shared, api, and web.

---

## Session handoff

At the end of a coding session (PR description or issue comment), summarize:

- What changed (brief bullets)
- Which workspaces were touched
- Which commands were run
- Any follow-ups, risks, or TODOs
