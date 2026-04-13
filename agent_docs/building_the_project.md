# Building The Project

Use this doc when you need commands, env setup, or local run/build behavior.

## Canonical Commands

Run all commands from the repo root. The canonical workspace scripts are defined in `package.json:8`.

- `npm run dev`: starts the Next app from the workspace root through the `apps/web` app script
- `npm run build`: builds `packages/shared` first, then `apps/web`
- `npm run lint`: runs ESLint for the web app
- `npm run typecheck`: typechecks shared contracts and the web app
- `npm run test`: runs the web app Vitest suite
- `npm run format`: runs Prettier across the repo

The web app's local scripts live in `apps/web/package.json:1`.

## Env Setup

The authoritative env contract is `apps/web/src/lib/env.ts:1`.

Required for local app boot:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only vars used lazily:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `GROQ_DASHBOARD_MODEL`
- `GROQ_CHAT_MODEL`

Example placeholders live in `apps/web/.env.example:1`.

## Build Notes

- Root dev/build scripts rely on `cross-env` to clear inherited npm workspace env before Next child processes run; see `package.json:9`.
- Session/auth entry runs through `apps/web/src/proxy.ts:1`.
- If you are changing persistence or auth wiring, verify the env contract before touching code.
