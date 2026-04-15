# Building The Project

Use this doc when you need commands, env setup, or local run/build behavior.

## Canonical Commands

Run all commands from the repo root. The canonical scripts are defined in `package.json:1`.

- `npm run dev`: starts the Next app
- `npm run build`: builds the Next app
- `npm run lint`: runs ESLint
- `npm run typecheck`: runs TypeScript without emitting
- `npm run test`: runs the Vitest suite
- `npm run format`: runs Prettier across the repo

All local app scripts now live in the root `package.json`.

## Env Setup

The authoritative env contract is `src/shared/lib/env.ts:1`.

Required for local app boot:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only vars used lazily:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `GROQ_DASHBOARD_MODEL`
- `GROQ_CHAT_MODEL`

Example placeholders live in `.env.example:1`.

## Build Notes

- Session/auth entry runs through `src/proxy.ts:1`.
- If you are changing persistence or auth wiring, verify the env contract before touching code.
