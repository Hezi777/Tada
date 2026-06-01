<a id="readme-top"></a>

<h1 align="center">
  <img width="120" height="120" alt="Tada Logo" src="public/tada-logo.svg" />
  <br />
  <b>Tada</b>
</h1>

<p align="center">
  Upload a spreadsheet, get a production-quality analytics dashboard with AI-powered charts, KPIs, and a conversational copilot - in seconds.
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
  <a href="https://groq.com"><img src="https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white" alt="Groq" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://github.com/Hezi777/Tada/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Hezi777/Tada?style=for-the-badge" alt="License" /></a>
</p>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about">About</a></li>
    <li><a href="#features">Features</a></li>
    <li><a href="#screenshots">Screenshots</a></li>
    <li><a href="#tech-stack">Tech Stack</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

---

## About

Tada turns CSV and Excel files into interactive dashboards without any manual configuration. Upload a file and a Groq-powered pipeline infers the schema, picks chart types, and streams a finished dashboard in seconds. A floating copilot chat lets you add or refine charts in plain English. Dashboards persist per-user in Supabase, so workspaces survive refreshes and can be switched between instantly.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Features

| Area | Description |
|---|---|
| File ingestion | CSV and Excel (`.xlsx`) uploads processed server-side with automatic type inference and schema detection |
| AI dashboard generation | Groq LLM analyzes column semantics and produces a full set of chart configs (bar, line, area, pie, scatter) plus up to four KPI cards |
| KPI cards | Primary metric highlighted in accent color; supporting cards show aggregated values with auto-selected icons |
| Chart canvas | Drag-and-drop chart reordering via `@dnd-kit`; up to 12 charts per dashboard with a configurable visible/hidden split |
| Manage Views | Side-sheet to pin, show, hide, or delete individual charts |
| Copilot chat | Floating drawer powered by Groq; AI proposals add or modify charts and are accepted or dismissed in one click |
| Multi-dashboard workspaces | Named dashboards with custom icons and colors; instant switch via cached state with no loading flicker |
| Authentication | Supabase email/password auth with server-side session validation on all API routes |
| Persistence | Dashboards, datasets, and chart configs stored in Supabase Postgres with checked-in migrations |
| Landing page | Scroll-driven feature cards, animated chart mockup, and a "How it works" timeline built with Framer Motion |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Screenshots

### Landing Page - Hero

![Landing hero: headline, CTA buttons, and an animated dashboard mockup on the right](docs/screenshots/01-landing-hero.png)

### Landing Page - Features Section

![Features section: "Zero friction. Pure insight." heading with scroll-stacked feature cards](docs/screenshots/02-landing-features.png)

### Landing Page - How it Works & Smart Insights

![Smart Insights feature card with trend line and anomaly badge, transitioning into the three-step How It Works section](docs/screenshots/03-landing-how-it-works.png)

### Authentication - Sign In

![Split-screen login page: deep-blue brand panel on the left, clean sign-in form on the right](docs/screenshots/04-login.png)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animation | Framer Motion |
| Charts | Recharts |
| Drag and drop | @dnd-kit/core + @dnd-kit/sortable |
| State management | Zustand |
| Schema validation | Zod |
| Auth + Database | Supabase (Auth, Postgres, Row-Level Security) |
| AI inference | Groq (dashboard generation + copilot chat) |
| Testing | Vitest + Testing Library |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

**Prerequisites:** Node.js 20+, a Supabase project, a Groq API key

```bash
git clone https://github.com/Hezi777/Tada.git
cd Tada
npm install
cp .env.example .env.local
```

Required environment variables:

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

Apply migrations and start:

```bash
npx supabase db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

1. Fork the repository on GitHub.
2. Create a feature branch: `git checkout -b feature/your-feature-name`.
3. Make your changes, ensuring `npm run lint` and `npm run typecheck` pass.
4. Commit with a descriptive message.
5. Push your branch and open a pull request against `main`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

MIT - see the [LICENSE](LICENSE) file for details.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
