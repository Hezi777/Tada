# Service Architecture

Use this doc for a focused architecture overview before opening implementation files.

## Canonical Map

Start with `agent_docs/architecture.md:1`. That file is the current repo map.

## Important Runtime Entry Points

- App Router page entrypoints: `apps/web/src/app/page.tsx:1`, `apps/web/src/app/dashboard/page.tsx:1`, `apps/web/src/app/login/page.tsx:1`
- Route handler example: `apps/web/src/app/api/chat/route.ts:1`
- Session proxy entrypoint: `apps/web/src/proxy.ts:1`
- Server business logic: `apps/web/src/server/upload.ts:1`, `apps/web/src/server/dashboard-config.ts:1`, `apps/web/src/server/chat.ts:1`
- Client runtime helpers: `apps/web/src/lib/api.ts:1`, `apps/web/src/lib/dashboard-store.ts:1`, `apps/web/src/lib/dashboard-runtime.ts:1`
- Shared schemas and BI rules: `packages/shared/src/index.ts:1`

## Current Architecture Shape

- Next.js owns the application runtime.
- Route handlers are thin HTTP boundaries.
- `src/server` holds most domain logic.
- `packages/shared` defines contracts both sides must obey.
- Client dashboard rendering and mutation flow through the external store.

## When To Read More

- For AI flows: `agent_docs/ai-integration.md`
- For chat behavior: `agent_docs/chatbot.md`
- For chart lifecycle and validation: `agent_docs/chart-config.md`
- For chained upload behavior: `agent_docs/file-chaining.md`
