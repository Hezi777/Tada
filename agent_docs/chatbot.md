# Chatbot Architecture

Audited: 2026-03-01

## Frontend

Primary UI:

- `apps/web/src/components/app/FloatingChat.tsx`

Client responsibilities:

- keeps local transcript state
- sends one request at a time to `POST /api/chat`
- sends current chart configs and KPI context with the message
- applies validated patches to `dashboard-store`

## Backend

Route:

- `apps/web/src/app/api/chat/route.ts`

Server logic:

- `apps/web/src/server/chat.ts`

Execution order:

1. Parse and validate request body
2. Load current in-memory dataset state by `datasetId`
3. Try explicit remove command parsing for commands like `remove chart 2`
4. Otherwise call Groq with grounded dataset context
5. Validate the returned patch structurally and semantically
6. Return assistant message plus validated patch or `null`

## What Chat Can Do

- answer grounded dataset questions
- explain chart meaning in plain language
- suggest insights based on current rows, KPIs, and charts
- add, update, or remove supported charts

## What Chat Cannot Do Reliably

- operate without an active server dataset snapshot
- persist conversation history
- mutate unsupported chart types
- bypass validation

## Grounding Inputs

The chat prompt includes:

- current user message
- dataset columns and kinds
- column stats
- sample rows
- current KPI values
- current chart configs
- chart summaries
- BI generation rules

## Rules

- Keep chat grounded in current dataset context
- Do not move AI calls into client components
- Do not allow unsupported chart patches through validation
