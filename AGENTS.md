# TADA — Codex Agent Instructions

## Product Context
TADA is a zero-config dashboard tool for non-technical users.
User uploads CSV/Excel -> AI generates BI-quality dashboard.
Chatbot can modify the dashboard and answer data questions.
Target user: small business owners, not data analysts.

## Stack
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion
- Backend: Express + TypeScript
- Shared: @tada/shared package for types/contracts
- AI: HuggingFace Inference API (backend only)
- Charts: Recharts -> migrating to shadcn Charts
- State: Zustand (full dashboard memory caching & chart config)
- Validation: Zod on all AI outputs and API responses

## Critical Rules
- AI output is always validated with Zod before touching state
- Chatbot logic must ground answers using full column stats, KPI values, and client chart configs
- Never call the AI from the frontend — backend API only
- Chart config is centralized state — never hardcode charts
- BI rules are a structured constant, not inline prompts
- Dashboard components must utilize the Zustand cache to bypass loading screens automatically
- _legacy/ directory is dead code — do not modify or reference it

## Code Standards
- TypeScript strict mode — no any, no unknown casts
- Zod for all runtime validation
- React Query for all server state
- Zustand for all client-side dashboard state
- Error boundaries on all AI-dependent components
- No silent failures — propagate or surface errors explicitly

## What Not To Do
- Do not rewrite working code without a clear reason
- Do not add new dependencies without checking if one exists
- Do not modify _legacy/ code
- Do not make AI calls from the frontend
- Do not skip Zod validation on AI responses
