"use client";

import { useSyncExternalStore } from "react";
import { notFound } from "next/navigation";
import type {
  ChartConfig,
  DashboardColumn,
  KPIConfig,
  SerializedRow,
  UploadDashboardResponse,
} from "@/shared/contracts";
import { initializeDashboardStore } from "@/features/dashboard/client/store";
import { AppShell } from "@/features/dashboard/components/AppShell";
import { Dashboard } from "@/features/dashboard/components/Dashboard";

/**
 * Portfolio capture surface.
 *
 * Renders the REAL `Dashboard` component against a fabricated dataset, by
 * seeding the same store the product seeds after an upload. Nothing here is a
 * mock-up of the dashboard — the layout, cards, charts and KPI tiles are the
 * shipped components, so a screenshot taken here is a screenshot of the
 * product.
 *
 * Why this route exists: the real dashboard sits behind Supabase auth and needs
 * a dataset upload, so capturing it would mean signing into a real account and
 * publishing real data. Sibling `/dev/charts` renders every widget at every
 * size class, which is a QA matrix rather than a dashboard. This is the
 * equivalent of Sky's `DemoMode` — invented data, no auth, no network.
 *
 * Dev-only, like `/dev/charts`.
 */

if (process.env.NODE_ENV === "production") {
  notFound();
}

const GENERATED_AT = "2025-01-15T08:00:00.000Z";

// ---------------------------------------------------------------------------
// Fabricated Superstore-style dataset. Same generator as /dev/charts so the two
// dev surfaces describe the same imaginary company.
// ---------------------------------------------------------------------------

const REGIONS = ["North", "South", "East", "West", "Central"] as const;
const CATEGORIES = ["Technology", "Furniture", "Office Supplies", "Apparel"] as const;

// North leads with East a clear second and Central a small tail — matches
// the "North region drives the highest profit, followed by East" insight
// text below instead of the four regions landing within ~1% of each other.
const REGION_WEIGHTS = [0.34, 0.24, 0.19, 0.14, 0.09] as const;
// Technology leads with Furniture close behind and Apparel a long tail —
// matches "Technology leads total revenue, with Furniture close behind."
const CATEGORY_WEIGHTS = [0.4, 0.32, 0.2, 0.08] as const;

// Deterministic PRNG (mulberry32) so captures are reproducible without
// depending on Math.random's engine-specific sequence.
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick<T>(
  rng: () => number,
  items: ReadonlyArray<T>,
  weights: ReadonlyArray<number>,
): T {
  const roll = rng() * weights.reduce((sum, weight) => sum + weight, 0);
  let cumulative = 0;
  for (let index = 0; index < items.length; index += 1) {
    cumulative += weights[index];
    if (roll < cumulative) {
      return items[index];
    }
  }
  return items[items.length - 1];
}

const FIXED_SEED = 20260115;

function makeSalesRows(): SerializedRow[] {
  const rng = mulberry32(FIXED_SEED);
  const rows: SerializedRow[] = [];

  // Underlying growth trend plus a persistent random walk so month-over-month
  // movement is jagged rather than a single smooth sine period.
  let trendNoise = 0;
  for (let month = 0; month < 18; month += 1) {
    const year = 2024 + Math.floor(month / 12);
    const monthIndex = month % 12;
    trendNoise += (rng() - 0.5) * 0.16;
    trendNoise = Math.max(-0.3, Math.min(0.3, trendNoise));
    const growth = 1 + month * 0.018;
    let monthFactor = growth * (1 + trendNoise);

    // Visible anomaly: a one-month demand shock (e.g. a shipping disruption)
    // that the dashboard's insight/trend text is built to call out.
    if (month === 11) {
      monthFactor *= 0.58;
    }

    const entriesThisMonth = 5 + Math.floor(rng() * 4); // 5-8 orders/month
    for (let entry = 0; entry < entriesThisMonth; entry += 1) {
      const day = 1 + Math.floor((entry / entriesThisMonth) * 27);
      const date = new Date(Date.UTC(year, monthIndex, day));
      const region = weightedPick(rng, REGIONS, REGION_WEIGHTS);
      const category = weightedPick(rng, CATEGORIES, CATEGORY_WEIGHTS);

      // Category baseline drives the long-tailed totals; per-order noise
      // keeps individual rows from looking mechanically identical.
      const categoryBase =
        CATEGORIES.indexOf(category) === 0
          ? 2400 // Technology: high ticket
          : CATEGORIES.indexOf(category) === 1
            ? 1600 // Furniture
            : CATEGORIES.indexOf(category) === 2
              ? 950 // Office Supplies
              : 480; // Apparel
      const orderNoise = 0.7 + rng() * 0.7;
      const sales = Math.round(categoryBase * monthFactor * orderNoise);
      const quantity = 1 + Math.floor(rng() * 12);
      const profitMargin = 0.08 + rng() * 0.22;
      const profit = Math.round(sales * profitMargin);
      const discount = [0, 0, 0.1, 0.15, 0.2][Math.floor(rng() * 5)];

      rows.push({
        order_date: date.toISOString().slice(0, 10),
        region,
        category,
        sales_amount: sales,
        quantity,
        profit,
        discount,
      });
    }
  }
  return rows;
}

const ROWS = makeSalesRows();

// Column names stay currency-agnostic on purpose: this is a US-flavoured
// fixture, and `detectCurrencySymbol` (src/shared/lib/format.ts) matches a
// literal `_ils`/`nis`/"shekel" token in the column name (case-insensitive,
// underscores normalized to spaces) to render ₪. A real dataset with an
// actual ILS column — e.g. `price_ils` — is expected to render ₪, which is
// deliberate Israeli-first behavior, not a bug.
const COLUMNS: DashboardColumn[] = [
  { name: "order_date", kind: "date" },
  { name: "region", kind: "categorical" },
  { name: "category", kind: "categorical" },
  { name: "sales_amount", kind: "numeric" },
  { name: "quantity", kind: "numeric" },
  { name: "profit", kind: "numeric" },
  { name: "discount", kind: "numeric" },
];

const CHART_DEFAULTS = {
  visible: true,
  source: "ai_initial" as const,
  chatbotGenerated: false,
  generatedAt: GENERATED_AT,
  pinned: false,
  priority: 0,
  lastTouchedBy: "ai_initial" as const,
  visibilityState: "visible" as const,
};

function chartOf(
  partial: Omit<ChartConfig, keyof typeof CHART_DEFAULTS | "order">,
  order: number,
): ChartConfig {
  return { ...CHART_DEFAULTS, ...partial, order };
}

/*
  A deliberate spread of chart types and size classes — the point of the capture
  is to show that the generated dashboard is composed, not a uniform grid of
  identical tiles.
*/
const CHARTS: ChartConfig[] = [
  chartOf(
    {
      id: "chart-revenue-trend",
      type: "area",
      title: "Revenue Over Time",
      insight: "Revenue trended up through the year, with a sharp dip in December tied to a shipping disruption.",
      columns: ["sales_amount"],
      aggregation: "sum",
      groupBy: null,
      timeColumn: "order_date",
      size: "large",
    },
    0,
  ),
  chartOf(
    {
      id: "chart-sales-by-category",
      type: "bar",
      title: "Sales by Category",
      insight: "Technology leads total revenue by a wide margin, with Furniture a distant second.",
      columns: ["sales_amount"],
      aggregation: "sum",
      groupBy: "category",
      timeColumn: null,
      orientation: "vertical",
      size: "medium",
    },
    1,
  ),
  chartOf(
    {
      id: "chart-revenue-share-region",
      type: "donut",
      title: "Revenue Share by Region",
      insight: "North and East together make up over half of total revenue.",
      columns: ["sales_amount"],
      aggregation: "sum",
      groupBy: "region",
      timeColumn: null,
      size: "large",
    },
    2,
  ),
  chartOf(
    {
      id: "chart-profit-by-region",
      type: "bar",
      title: "Profit by Region",
      insight: "The North region drives the highest profit, followed closely by South.",
      columns: ["profit"],
      aggregation: "sum",
      groupBy: "region",
      timeColumn: null,
      orientation: "horizontal",
      size: "medium",
    },
    3,
  ),
];
/*
  No scatter chart here. The product guards scatter behind a correlation check
  ("Scatter charts require meaningful correlation between two numeric columns"),
  and this dataset's quantity and profit are independent by construction — so a
  real generated dashboard would not offer one either. Forcing it in threw on
  every render.
*/

const KPIS: KPIConfig[] = [
  {
    id: "kpi-revenue",
    column: "sales_amount",
    aggregation: "sum",
    label: "Total Revenue",
    description: "Sum of sales across every order in the period.",
    /*
      All four KPIs are 1×1 so the top row is exactly four tiles wide, which
      is both what the reference dashboards do and what makes the rest of the
      canvas resolve: the charts below are large(2×2), medium(2×1),
      large(2×2), medium(2×1), which pack flush into rows 2-4 against a full
      row 1. A 2×1 primary here pushed one tile onto row 2 and left the
      fourth column empty for two rows.
    */
    isPrimary: true,
    size: "small",
    order: 0,
  },
  {
    id: "kpi-profit",
    column: "profit",
    aggregation: "sum",
    label: "Total Profit",
    description: "Sum of profit across every order in the period.",
    isPrimary: false,
    size: "small",
    order: 1,
  },
  {
    id: "kpi-quantity",
    column: "quantity",
    aggregation: "sum",
    label: "Units Sold",
    description: "Total quantity across all orders.",
    isPrimary: false,
    size: "small",
    order: 2,
  },
  {
    id: "kpi-discount",
    column: "discount",
    aggregation: "avg",
    label: "Average Discount",
    description: "Mean discount applied per order.",
    isPrimary: false,
    size: "small",
    order: 3,
  },
];

const SNAPSHOT: UploadDashboardResponse = {
  datasetId: "demo-dataset",
  version: 1,
  fileName: "superstore-sales.csv",
  columns: COLUMNS,
  datasetMeta: {
    columns: COLUMNS,
    rowCount: ROWS.length,
    sampleRows: ROWS.slice(0, 5),
  },
  files: [
    {
      id: "demo-file",
      fileName: "superstore-sales.csv",
      rowCount: ROWS.length,
      isPrimary: true,
    },
  ],
  rows: ROWS,
  charts: CHARTS,
  kpis: KPIS,
};

let seeded = false;
function seedOnce() {
  if (seeded) return;
  seeded = true;
  initializeDashboardStore(SNAPSHOT, {
    id: "demo-dashboard",
    name: "Sales overview",
    icon: "chart-line",
    color: "blue",
  });
}

export default function DevPortfolioCapturePage() {
  // Charts render real SVG during SSR and Recharts' clipPath id counter differs
  // between the server and client passes, so the dashboard is client-only —
  // same reasoning as /dev/charts.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return null;
  }

  seedOnce();

  // The floating chat is a live AI affordance; it would sit over the dashboard
  // in every screenshot.
  return <AppShell dashboardContent={<Dashboard />} showFloatingChat={false} />;
}
