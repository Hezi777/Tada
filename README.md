<h1 align="center"><b>Tada</b></h1>

<p align="center">
  Upload a spreadsheet, get a production-quality analytics dashboard with AI-powered charts, KPIs, and a conversational copilot — in seconds.
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
  <a href="https://groq.com"><img src="https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white" alt="Groq" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://github.com/Hezi777/tada-instant-insights/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Hezi777/tada-instant-insights?style=for-the-badge" alt="License" /></a>
</p>

<p align="center">
  <a href="#about">About</a> |
  <a href="#features">Features</a> |
  <a href="#screenshots">Screenshots</a> |
  <a href="#tech-stack">Tech Stack</a> |
  <a href="#getting-started">Getting Started</a> |
  <a href="#contributing">Contributing</a>
</p>

---

## About

Tada is a full-stack web application that transforms raw CSV and Excel files into interactive analytics dashboards without any manual configuration. Users upload a file and the server-side AI pipeline (powered by Groq) infers the data schema, selects appropriate chart types, computes KPIs, and streams the finished dashboard to the client in a matter of seconds. A floating copilot chat panel lets users ask follow-up questions in plain English, which can add new chart views or refine existing ones on the fly. All dashboards and datasets are persisted per-user via Supabase so workspaces survive page refreshes and can be switched between at any time.

## Features

| Area | Description |
|---|---|
| File ingestion | CSV and Excel (`.xlsx`) uploads processed server-side with automatic type inference and schema detection |
| AI dashboard generation | Groq LLM analyzes column semantics and produces a full set of chart configs (bar, line, area, pie, scatter) plus up to four KPI cards |
| KPI cards | Primary metric highlighted in accent colour; supporting cards show aggregated values with auto-selected icons and descriptions |
| Chart canvas | Drag-and-drop chart reordering via `@dnd-kit`; up to 12 charts per dashboard with a configurable visible/hidden split |
| Manage Views | Side-sheet to pin, show, hide, or delete individual charts; hidden charts can replace visible ones without reloading |
| Copilot chat | Floating drawer powered by Groq chat completion; AI proposals add or modify charts and are accepted or dismissed in one click |
| Multi-dashboard workspaces | Named dashboards with custom icons and colours; instant switch via cached state so there is no loading flicker |
| Authentication | Supabase email/password auth with server-side session validation on all API routes |
| Persistence | Dashboards, datasets, and chart configs stored in Supabase Postgres with checked-in migrations |
| Animated landing page | Scroll-driven feature cards, animated chart mockup, brand marquee, and "How it works" timeline built with Framer Motion |

## Screenshots

### Landing Page — Hero

![Landing hero: headline, CTA buttons, and an animated dashboard mockup on the right](docs/screenshots/01-landing-hero.png)

### Landing Page — Features Section

![Features section: "Zero friction. Pure insight." heading with scroll-stacked feature cards](docs/screenshots/02-landing-features.png)

### Landing Page — How it Works & Smart Insights

![Smart Insights feature card with trend line and anomaly badge, transitioning into the three-step How It Works section](docs/screenshots/03-landing-how-it-works.png)

### Authentication — Sign In

![Split-screen login page: deep-blue brand panel on the left, clean sign-in form on the right](docs/screenshots/04-login.png)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui component library |
| Animation | Framer Motion |
| Charts | Recharts |
| Drag and drop | @dnd-kit/core + @dnd-kit/sortable |
| State management | Zustand (feature-scoped store) |
| Schema validation | Zod (shared contracts layer) |
| Auth + Database | Supabase (Auth, Postgres, Row-Level Security) |
| AI inference | Groq (dashboard generation + copilot chat) |
| Testing | Vitest + Testing Library |

## Getting Started

### Prerequisites

- Node.js 20 or later
- A Supabase project (free tier is sufficient)
- A Groq API key for AI features

### Steps

1. Clone the repository.

   ```bash
   git clone https://github.com/Hezi777/tada-instant-insights.git
   cd tada-instant-insights
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Copy the example environment file and fill in your credentials.

   ```bash
   cp .env.example .env.local   # or create .env.local manually
   ```

   Required variables:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   GROQ_API_KEY=<groq-api-key>
   ```

   Optional model overrides (defaults to Groq's `llama3` family):

   ```env
   GROQ_DASHBOARD_MODEL=<model-id>
   GROQ_CHAT_MODEL=<model-id>
   ```

4. Apply the database migrations.

   ```bash
   npx supabase db push   # or apply files in supabase/migrations/ manually
   ```

5. Start the development server.

   ```bash
   npm run dev
   ```

   The app is available at `http://localhost:3000`.

6. (Optional) Run the type-checker and tests.

   ```bash
   npm run typecheck
   npm run test
   ```

## Contributing

1. Fork the repository on GitHub.
2. Create a feature branch: `git checkout -b feature/your-feature-name`.
3. Make your changes, ensuring `npm run lint` and `npm run typecheck` pass.
4. Commit with a descriptive message.
5. Push your branch and open a pull request against `main`.
6. Fill in the pull request template and link any related issues.

## License

Distributed under the terms of the license found in the [LICENSE](LICENSE) file.
