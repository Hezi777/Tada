"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { DollarSign, ShoppingCart, Users } from "lucide-react";
import type { ChartConfig, ChartSize, SerializedRow } from "@/shared/contracts";
import { WIDGET_SIZE_SUPPORT } from "@/shared/contracts";
import type { KpiTrend } from "@/features/dashboard/client/runtime";
import {
  TIERS,
  widgetDimensions,
  type CanvasTier,
} from "@/features/dashboard/client/grid";
import { DashboardChartCard } from "@/features/dashboard/components/DashboardChartCard";
import { KpiCard } from "@/features/dashboard/components/Dashboard";

if (process.env.NODE_ENV === "production") {
  notFound();
}

const GENERATED_AT = "2025-01-15T08:00:00.000Z";

const CHART_DEFAULTS = {
  visible: true,
  source: "ai_initial" as const,
  chatbotGenerated: false,
  generatedAt: GENERATED_AT,
  pinned: false,
  priority: 0,
  order: 0,
  lastTouchedBy: "ai_initial" as const,
  visibilityState: "visible" as const,
};

// ---------------------------------------------------------------------------
// Mock rows (Superstore-style sales dataset)
// ---------------------------------------------------------------------------

const REGIONS = ["North", "South", "East", "West", "Central"] as const;
const CATEGORIES = ["Furniture", "Technology", "Office Supplies", "Apparel"] as const;

function makeSalesRows(): SerializedRow[] {
  const rows: SerializedRow[] = [];
  for (let month = 0; month < 18; month += 1) {
    const year = 2024 + Math.floor(month / 12);
    const monthIndex = month % 12;
    const seasonal = 1 + 0.35 * Math.sin((month / 12) * Math.PI * 2);
    for (let entry = 0; entry < 6; entry += 1) {
      const date = new Date(Date.UTC(year, monthIndex, 2 + entry * 4));
      const region = REGIONS[(month + entry) % REGIONS.length];
      const category = CATEGORIES[(month * 2 + entry) % CATEGORIES.length];
      const baseSales = 1800 + (entry % 3) * 650 + month * 45;
      const sales = Math.round(baseSales * seasonal);
      const quantity = 4 + ((month + entry) % 9);
      const profit = Math.round(sales * (0.12 + ((month + entry) % 4) * 0.03));
      const discount = [0, 0.1, 0.15, 0.2][(month + entry) % 4];

      rows.push({
        order_date: date.toISOString().slice(0, 10),
        region,
        category,
        sales_amount_ils: sales,
        quantity,
        profit_ils: profit,
        discount,
      });
    }
  }
  return rows;
}

const SALES_ROWS = makeSalesRows();

// ---------------------------------------------------------------------------
// One representative chart per type; the matrix renders each at every
// supported size class (docs/WIDGET_SIZING.md §5).
// ---------------------------------------------------------------------------

function chartOf(partial: Omit<ChartConfig, keyof typeof CHART_DEFAULTS | "size">): Omit<ChartConfig, "size"> {
  return { ...CHART_DEFAULTS, ...partial };
}

const MATRIX_CHARTS: Array<Omit<ChartConfig, "size">> = [
  chartOf({
    id: "chart-sales-by-category",
    type: "bar",
    title: "Sales by Category",
    insight: "Technology leads total revenue, with Furniture close behind.",
    columns: ["sales_amount_ils"],
    aggregation: "sum",
    groupBy: "category",
    timeColumn: null,
    orientation: "vertical",
  }),
  chartOf({
    id: "chart-profit-by-region",
    type: "bar",
    title: "Profit by Region (horizontal)",
    insight: "The North region drives the highest profit, followed by East.",
    columns: ["profit_ils"],
    aggregation: "sum",
    groupBy: "region",
    timeColumn: null,
    orientation: "horizontal",
  }),
  chartOf({
    id: "chart-revenue-trend",
    type: "area",
    title: "Revenue Over Time",
    insight: "Monthly revenue has grown 28% over the last 18 months, peaking in Q4.",
    columns: ["sales_amount_ils"],
    aggregation: "sum",
    groupBy: null,
    timeColumn: "order_date",
  }),
  chartOf({
    id: "chart-revenue-share-region",
    type: "donut",
    title: "Revenue Share by Region",
    insight: "North and East together make up over half of total revenue.",
    columns: ["sales_amount_ils"],
    aggregation: "sum",
    groupBy: "region",
    timeColumn: null,
  }),
  chartOf({
    id: "chart-quantity-vs-profit",
    type: "scatter",
    title: "Order Quantity vs. Profit",
    insight: "Larger orders tend to generate proportionally higher profit.",
    columns: ["quantity", "profit_ils"],
    aggregation: null,
    groupBy: null,
    timeColumn: null,
  }),
];

// ---------------------------------------------------------------------------
// KPI mock data
// ---------------------------------------------------------------------------

function buildSparkline(seed: number, length = 12): KpiTrend["sparkline"] {
  return Array.from({ length }, (_, index) => ({
    label: `2025-${String(index + 1).padStart(2, "0")}`,
    value: Math.round(
      seed * (0.85 + 0.3 * Math.sin((index / length) * Math.PI * 2 + seed)),
    ),
  }));
}

const revenueTrend: KpiTrend = { deltaPct: 12.4, sparkline: buildSparkline(48000) };
const ordersTrend: KpiTrend = { deltaPct: -3.1, sparkline: buildSparkline(920) };

const KPI_EXAMPLES = [
  {
    icon: DollarSign,
    value: 612480,
    label: "Total Revenue",
    eyebrow: "Primary KPI",
    isPrimary: true,
    trend: revenueTrend,
  },
  {
    icon: ShoppingCart,
    value: 1284,
    label: "Total Orders",
    eyebrow: "Sum",
    isPrimary: false,
    trend: ordersTrend,
  },
  {
    icon: Users,
    value: 356,
    label: "Active Customers",
    eyebrow: "Count",
    isPrimary: false,
    trend: null,
  },
];

// ---------------------------------------------------------------------------
// Page — the (type × size class) matrix at fixed dimensions per tier
// ---------------------------------------------------------------------------

const TIER_OPTIONS: CanvasTier[] = ["t1", "t2", "t3", "t4"];

function SizedCell({
  size,
  tier,
  children,
}: {
  size: ChartSize;
  tier: CanvasTier;
  children: React.ReactNode;
}) {
  const dims = widgetDimensions(size, tier);
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        {size} · {dims.width}×{dims.height}
      </p>
      <div style={{ width: dims.width, height: dims.height }}>{children}</div>
    </div>
  );
}

export default function DevChartsShowcasePage() {
  const [isDark, setIsDark] = useState(false);
  const [tier, setTier] = useState<CanvasTier>("t4");
  // Fixed-dimension charts render real SVG during SSR, and Recharts' global
  // clipPath id counter differs between server and client passes — render
  // the matrix client-side only (dev page; the app loads data post-mount).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-6 py-8">
      <div className="mx-auto max-w-[1400px] space-y-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-black tracking-[-0.03em] text-[var(--color-text-primary)]">
              Widget Size-Class Matrix
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Every chart type at every size class it supports, at the fixed
              dimensions of docs/WIDGET_SIZING.md — no measurement anywhere.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-card p-0.5">
              {TIER_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTier(option)}
                  aria-pressed={tier === option}
                  className={`transition-ui flex h-8 items-center justify-center rounded-full px-3 text-xs font-bold ${
                    tier === option
                      ? "bg-[var(--color-accent)] text-white"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {option} · {TIERS[option].columns}col
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="h-10 rounded-full border border-[var(--color-border)] bg-card px-4 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)]"
            >
              {isDark ? "Light" : "Dark"}
            </button>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
            KPI · {WIDGET_SIZE_SUPPORT.kpi.join(" / ")}
          </h2>
          {KPI_EXAMPLES.map((kpi) => (
            <div key={kpi.label} className="flex flex-wrap items-end gap-6">
              {WIDGET_SIZE_SUPPORT.kpi.map((size) => (
                <SizedCell key={size} size={size} tier={tier}>
                  <KpiCard
                    icon={kpi.icon}
                    value={kpi.value}
                    label={kpi.label}
                    eyebrow={kpi.eyebrow}
                    isPrimary={kpi.isPrimary}
                    trend={kpi.trend}
                    size={size}
                    tier={tier}
                  />
                </SizedCell>
              ))}
            </div>
          ))}
        </section>

        {MATRIX_CHARTS.map((chart) => (
          <section key={chart.id} className="space-y-4">
            <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
              {chart.type} · {chart.title} ·{" "}
              {WIDGET_SIZE_SUPPORT[chart.type].join(" / ")}
            </h2>
            <div className="flex flex-wrap items-end gap-6">
              {WIDGET_SIZE_SUPPORT[chart.type].map((size) => (
                <SizedCell key={size} size={size} tier={tier}>
                  <DashboardChartCard
                    chart={{ ...chart, size }}
                    rows={SALES_ROWS}
                    tier={tier}
                  />
                </SizedCell>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
