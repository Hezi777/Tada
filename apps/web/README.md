# Tada Instant Insights

MVP for turning uploaded CSV/Excel data into an AI-styled dashboard with charts, metrics, and a copilot chat UI.

## Frontend

- Stack: Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Recharts, React Router, TanStack Query.
- UX flow: landing -> upload -> processing -> dashboard (state machine in `src/pages/Index.tsx`).
- Landing sections: hero, features, how-it-works, CTA, footer.
- Dashboard: cards + charts with sample data and an "AI Insight" callout.
- Copilot UI: floating chat with quick actions and simulated responses.

## Backend

- Not implemented in this MVP.
- File upload, data parsing, and AI insights are simulated on the client.
- Hook points: add API calls in the upload flow and replace hardcoded chart data in the dashboard.

## Project Structure

- `src/pages`: top-level routes and app state switcher.
- `src/components/landing`: marketing sections.
- `src/components/app`: upload, processing, dashboard, and chat UI.
- `src/components/ui`: shadcn/ui primitives.
- `src/lib`: shared utilities.
- `src/test`: Vitest setup and examples.

## Local Development

```sh
npm i
npm run dev
```

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint
- `npm run test` - run Vitest
- `npm run test:watch` - watch mode for Vitest

## Notes

- Charts and insights are static sample data.
- Processing and chat responses are timed client-side simulations.
