# Tada Instant Insights

Tada Instant Insights is a monorepo MVP that turns uploaded CSV or Excel files into an AI-styled dashboard with charts, KPIs, and a copilot chat UI. The web app handles the guided flow (upload -> processing -> dashboard), while the API parses files, infers column types, and generates chart/KPI state that the UI renders and iterates on.

<p align="center">
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/HuggingFace-API-FFD21E?logo=huggingface&logoColor=black" />
</p>

## Features

- CSV/XLSX upload with automatic parsing and column inference.
- KPI and chart generation based on detected numeric, categorical, and date fields.
- Copilot chat that can hide/show charts and reconfigure metrics/categories.
- React dashboard with cards, charts, and a floating chat panel.
- Shared types across web + API via a local workspace package.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Web | Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Recharts, TanStack Query |
| API | Node.js, Express, TypeScript, multer, papaparse, xlsx |
| AI | Hugging Face Inference API (configurable model) |
| Shared | Local workspace package with shared types |

## Architecture

1. User uploads a CSV/XLSX file in the web app.
2. The API parses the file, infers column types, and builds KPI + chart state.
3. The web app renders the dashboard and stores the dataset ID.
4. Copilot chat calls the API to interpret intents (hide chart, set metric, reset) and refreshes the dashboard state.

The API keeps dataset rows in memory and rebuilds KPIs/charts on demand. This is designed for a local MVP and can be swapped for persistent storage later.

## Project Structure

- `apps/web` - Vite React frontend and UI flows.
- `apps/api` - Express API for upload parsing, KPI/chart generation, and chat.
- `packages/shared` - Shared TypeScript types.

## Getting Started

### Prerequisites

- Node.js 18+ (or the version your environment already uses)
- npm
- A Hugging Face API token for chat insights

### Install

```bash
npm install
```

### Configure Environment Variables

Create or update `apps/api/.env` with:

```env
PORT=3001
HF_API_KEY=your_hf_api_key
HF_MODEL=HuggingFaceH4/zephyr-7b-beta
```

Optional web environment override (defaults to `http://localhost:3001`):

```env
# apps/web/.env
VITE_API_BASE_URL=http://localhost:3001
```

### Run Development Servers

```bash
npm run dev
```

This starts both the API and the web app via the root `concurrently` script.

### Build

```bash
npm run build
```

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/api/upload` | Upload dataset (`multipart/form-data`, field name `file`) |
| POST | `/api/chat` | Chat actions; expects `datasetId` and `message` |
| GET | `/api/dashboard?datasetId=...` | Fetch latest dashboard state |

## Web App Flow

- Landing -> Upload -> Processing -> Dashboard (state machine in `apps/web/src/pages/Index.tsx`).
- Dashboard shows KPI cards, charts, and an AI insight callout.
- Floating chat supports quick actions and free-form messages that map to supported intents.

## Scripts

Root:

- `npm run dev` - start web + API in watch mode
- `npm run build` - build shared, API, and web
- `npm run lint` - lint the web app

Web (from `apps/web`):

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint
- `npm run test` - run Vitest
- `npm run test:watch` - watch mode for Vitest

API (from `apps/api`):

- `npm run dev` - watch with tsx
- `npm run build` - compile TypeScript
- `npm run start` - start compiled server
- `npm run typecheck` - typecheck only

## Notes and Limitations

- Dataset state is stored in memory and resets when the API restarts.
- Chat requires a valid Hugging Face API key and may fall back to simple intent parsing.
- CORS is permissive for local development.

## Roadmap Ideas

- Persist datasets in a database (Postgres, SQLite, or S3-backed storage).
- Add authentication and multi-tenant dataset management.
- Improve chart recommendations and narrative insight generation.
- Add export/shareable dashboards.

## Contributing

1. Fork the repo and create a feature branch.
2. Make changes with clear commits.
3. Open a pull request with context and screenshots when applicable.

## License

MIT (add a `LICENSE` file if you plan to publish this publicly).
