"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import {
  DollarSign,
  Percent,
  ShoppingCart,
  Users,
} from "lucide-react";
import type { SerializedRow } from "@/shared/contracts";
import type { LayoutItem } from "@/features/dashboard/client/layout";
import type { KpiTrend } from "@/features/dashboard/client/runtime";
import { Card, CardContent } from "@/shared/ui/card";
import { AreaChartView } from "@/features/dashboard/components/charts/AreaChartView";
import { BarChartView } from "@/features/dashboard/components/charts/BarChartView";
import { DonutChartView } from "@/features/dashboard/components/charts/DonutChartView";
import { ScatterChartView } from "@/features/dashboard/components/charts/ScatterChartView";
import { KpiCard } from "@/features/dashboard/components/Dashboard";
import { Sidebar } from "@/features/dashboard/components/Sidebar";

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
  let day = 0;
  for (let month = 0; month < 18; month += 1) {
    const year = 2024 + Math.floor(month / 12);
    const monthIndex = month % 12;
    const seasonal = 1 + 0.35 * Math.sin((month / 12) * Math.PI * 2);
    for (let entry = 0; entry < 6; entry += 1) {
      day += 1;
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
// LayoutItem builders for each chart type
// ---------------------------------------------------------------------------

const revenueOverTime: LayoutItem = {
  ...CHART_DEFAULTS,
  id: "chart-revenue-trend",
  type: "area",
  title: "Revenue Over Time",
  insight: "Monthly revenue has grown 28% over the last 18 months, with a seasonal peak in Q4.",
  columns: ["sales_amount_ils"],
  aggregation: "sum",
  groupBy: null,
  timeColumn: "order_date",
  size: "large",
  order: 0,
  colSpan: 8,
};

const revenueComparisonSeries: Array<{ label: string; value: number }> = (() => {
  const series = SALES_ROWS.reduce<Map<string, number>>((map, row) => {
    const month = String(row.order_date).slice(0, 7);
    const value = Number(row.sales_amount_ils) ?? 0;
    map.set(month, (map.get(month) ?? 0) + value);
    return map;
  }, new Map());
  return Array.from(series.entries()).map(([label, value]) => ({
    label,
    // Previous-period line tracks ~12% below current period.
    value: Math.round(value * 0.88),
  }));
})();

const profitTrend: LayoutItem = {
  ...CHART_DEFAULTS,
  id: "chart-profit-trend",
  type: "area",
  title: "Profit Trend vs. Previous Period",
  insight: "Profit is outpacing last period across nearly every month this year.",
  columns: ["profit_ils"],
  aggregation: "sum",
  groupBy: null,
  timeColumn: "order_date",
  size: "large",
  order: 1,
  colSpan: 8,
};

const profitComparisonSeries: Array<{ label: string; value: number }> = (() => {
  const series = SALES_ROWS.reduce<Map<string, number>>((map, row) => {
    const month = String(row.order_date).slice(0, 7);
    const value = Number(row.profit_ils) ?? 0;
    map.set(month, (map.get(month) ?? 0) + value);
    return map;
  }, new Map());
  return Array.from(series.entries()).map(([label, value]) => ({
    label,
    value: Math.round(value * 0.82),
  }));
})();

const salesByCategory: LayoutItem = {
  ...CHART_DEFAULTS,
  id: "chart-sales-by-category",
  type: "bar",
  title: "Sales by Category",
  insight: "Technology leads total revenue, with Furniture close behind.",
  columns: ["sales_amount_ils"],
  aggregation: "sum",
  groupBy: "category",
  timeColumn: null,
  size: "medium",
  order: 2,
  colSpan: 6,
  orientation: "vertical",
};

const profitByRegion: LayoutItem = {
  ...CHART_DEFAULTS,
  id: "chart-profit-by-region",
  type: "bar",
  title: "Profit by Region",
  insight: "The North region drives the highest profit, followed by East.",
  columns: ["profit_ils"],
  aggregation: "sum",
  groupBy: "region",
  timeColumn: null,
  size: "medium",
  order: 3,
  colSpan: 6,
  orientation: "horizontal",
};

const revenueShareByRegion: LayoutItem = {
  ...CHART_DEFAULTS,
  id: "chart-revenue-share-region",
  type: "donut",
  title: "Revenue Share by Region",
  insight: "North and East together make up over half of total revenue.",
  columns: ["sales_amount_ils"],
  aggregation: "sum",
  groupBy: "region",
  timeColumn: null,
  size: "small",
  order: 4,
  colSpan: 4,
};

const quantityVsProfit: LayoutItem = {
  ...CHART_DEFAULTS,
  id: "chart-quantity-vs-profit",
  type: "scatter",
  title: "Order Quantity vs. Profit",
  insight: "Larger orders tend to generate proportionally higher profit, with a few standout outliers.",
  columns: ["quantity", "profit_ils"],
  aggregation: null,
  groupBy: null,
  timeColumn: null,
  size: "medium",
  order: 5,
  colSpan: 8,
};

// ---------------------------------------------------------------------------
// KPI mock data
// ---------------------------------------------------------------------------

function buildSparkline(seed: number, length = 12): KpiTrend["sparkline"] {
  return Array.from({ length }, (_, index) => ({
    label: `2025-${String(index + 1).padStart(2, "0")}`,
    value: Math.round(seed * (0.85 + 0.3 * Math.sin((index / length) * Math.PI * 2 + seed))),
  }));
}

const revenueTrend: KpiTrend = {
  deltaPct: 12.4,
  sparkline: buildSparkline(48000),
};

const ordersTrend: KpiTrend = {
  deltaPct: -3.1,
  sparkline: buildSparkline(920, 12).map((point) => ({
    ...point,
    value: Math.round(point.value / 50),
  })),
};

const customersTrend: KpiTrend = {
  deltaPct: 6.8,
  sparkline: buildSparkline(1500, 12).map((point) => ({
    ...point,
    value: Math.round(point.value / 8),
  })),
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const CHART_SECTIONS: Array<{
  chart: LayoutItem;
  comparisonSeries?: Array<{ label: string; value: number }>;
}> = [
  { chart: revenueOverTime },
  { chart: profitTrend, comparisonSeries: profitComparisonSeries },
  { chart: salesByCategory },
  { chart: profitByRegion },
  { chart: revenueShareByRegion },
  { chart: quantityVsProfit },
];

function colSpanClassName(colSpan: number): string {
  if (colSpan === 12) return "md:col-span-2 xl:col-span-12";
  if (colSpan >= 8) return "md:col-span-2 xl:col-span-8";
  if (colSpan === 6) return "md:col-span-2 xl:col-span-6";
  return "md:col-span-1 xl:col-span-4";
}

function renderChart(chart: LayoutItem, comparisonSeries?: Array<{ label: string; value: number }>) {
  if (chart.type === "area") {
    return (
      <AreaChartView chart={chart} rows={SALES_ROWS} comparisonSeries={comparisonSeries} />
    );
  }
  if (chart.type === "bar") {
    return <BarChartView chart={chart} rows={SALES_ROWS} />;
  }
  if (chart.type === "donut") {
    return <DonutChartView chart={chart} rows={SALES_ROWS} />;
  }
  return <ScatterChartView chart={chart} rows={SALES_ROWS} />;
}

function chartCardMinHeight(chart: LayoutItem): string {
  if (chart.colSpan >= 8) {
    return chart.size === "small" ? "min-h-[330px]" : "min-h-[450px]";
  }
  return chart.size === "small" ? "min-h-[260px]" : "min-h-[370px]";
}

export default function DevChartsShowcasePage() {
  const [isDark, setIsDark] = useState(false);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-6 py-8">
      <div className="mx-auto max-w-[1400px] space-y-12">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-black tracking-[-0.03em] text-[var(--color-text-primary)]">
              Dashboard Design Showcase
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Dev-only preview of the chart, KPI, and sidebar system with mock data.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="h-10 rounded-full border border-[var(--color-border)] bg-card px-4 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)]"
          >
            {isDark ? "Switch to light" : "Switch to dark"}
          </button>
        </header>

        {/* KPI cards */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
            KPI Cards
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={DollarSign}
              value={612480}
              label="Total Revenue"
              eyebrow="Primary KPI"
              isPrimary
              meshClassName="mesh-navy"
              trend={null}
            />
            <KpiCard
              icon={ShoppingCart}
              value={1284}
              label="Total Orders"
              eyebrow="Sum"
              trend={ordersTrend}
            />
            <KpiCard
              icon={Users}
              value={356}
              label="Active Customers"
              eyebrow="Count"
              trend={customersTrend}
            />
            <KpiCard
              icon={Percent}
              value="14.2%"
              label="Average Discount Rate"
              eyebrow="Average"
              trend={null}
            />
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            The first two secondary cards show a trend sparkline + delta badge; the last falls back to the eyebrow label when{" "}
            <code className="rounded bg-[var(--color-surface-muted)] px-1 py-0.5">trend</code> is{" "}
            <code className="rounded bg-[var(--color-surface-muted)] px-1 py-0.5">null</code>.
          </p>
          {/* Extra trend example so two secondary cards show sparklines */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={DollarSign}
              value={48210}
              label="Revenue This Month"
              eyebrow="Sum"
              trend={revenueTrend}
            />
          </div>
        </section>

        {/* Charts */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
            Charts
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12">
            {CHART_SECTIONS.map(({ chart, comparisonSeries }) => (
              <div key={chart.id} className={colSpanClassName(chart.colSpan)}>
                <Card
                  className={`flex h-full flex-col overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-card p-0 shadow-premium ${chartCardMinHeight(chart)}`}
                >
                  <div className="px-6 pb-0 pt-6">
                    <h3 className="line-clamp-2 font-display text-[17px] font-extrabold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)]">
                      {chart.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[var(--color-text-secondary)]">
                      {chart.insight}
                    </p>
                  </div>
                  <CardContent className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-4">
                    {renderChart(chart, comparisonSeries)}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* Sidebar */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
            Sidebar
          </h2>
          <div className="flex flex-wrap gap-6">
            <div className="h-[560px] w-[260px] overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-bg)] shadow-card">
              <Sidebar
                activeTab="dashboard"
                onNavigate={() => {}}
                collapsed={false}
                onToggleCollapsed={() => {}}
                isRtl={false}
                avatarUrl={null}
                userEmail="demo@tada.app"
              />
            </div>
            <div className="h-[560px] w-[88px] overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-bg)] shadow-card">
              <Sidebar
                activeTab="dashboards"
                onNavigate={() => {}}
                collapsed
                onToggleCollapsed={() => {}}
                isRtl={false}
                avatarUrl={null}
                userEmail="demo@tada.app"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
