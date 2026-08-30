import { describe, expect, it } from "vitest";
import { ChartConfigSchema, KPIConfigSchema } from "@/shared/contracts";
import {
  buildAreaSeries,
  buildGroupedSeries,
  computeKpiTrend,
  validateChartCollection,
} from "./runtime";

function chart(patch: Record<string, unknown>) {
  return ChartConfigSchema.parse({
    id: "chart_01",
    type: "bar",
    title: "Orders by region",
    insight: "Computed from uploaded rows.",
    columns: ["amount", "region"],
    aggregation: "count",
    groupBy: "region",
    timeColumn: null,
    size: "large",
    visible: true,
    order: 0,
    source: "fallback",
    chatbotGenerated: false,
    generatedAt: "2026-08-07T00:00:00.000Z",
    ...patch,
  });
}

describe("dashboard runtime aggregation", () => {
  it("counts only non-null numeric values when a value column is selected", () => {
    const series = buildGroupedSeries(chart({}), [
      { region: "North", amount: 10 },
      { region: "North", amount: null },
      { region: "North", amount: 20 },
    ]);

    expect(series).toEqual([{ label: "North", value: 2 }]);
  });

  it("keeps the newest 100 time buckets", () => {
    const rows = Array.from({ length: 150 }, (_, index) => ({
      date: new Date(Date.UTC(2000 + index, 0, 1)).toISOString(),
      amount: index,
    }));
    const series = buildAreaSeries(
      chart({
        type: "area",
        title: "Amount over time",
        columns: ["amount", "date"],
        aggregation: "sum",
        groupBy: null,
        timeColumn: "date",
        size: "xlarge",
      }),
      rows,
    );

    expect(series).toHaveLength(100);
    expect(series[0].label).toBe("2050");
    expect(series.at(-1)?.label).toBe("2149");
  });

  it("computes zero, not a row count, for count-aggregation buckets whose value column is non-numeric", () => {
    // This is the concrete failure mode from the donut hard-error bug: a
    // count-aggregation chart whose only other column is non-numeric text
    // makes every bucket's parsed values array empty, so reduceAggregation
    // returns 0 per bucket instead of a row count.
    const series = buildGroupedSeries(chart({ aggregation: "count" }), [
      { region: "North", amount: "abc" },
      { region: "North", amount: "def" },
    ]);
    expect(series).toEqual([{ label: "North", value: 0 }]);
  });
});

describe("donut validation", () => {
  function donutChart(patch: Record<string, unknown>) {
    return ChartConfigSchema.parse({
      id: "chart_01",
      type: "donut",
      title: "Orders by region",
      insight: "Computed from uploaded rows.",
      columns: ["region", "notes"],
      aggregation: "count",
      groupBy: "region",
      timeColumn: null,
      size: "medium",
      visible: true,
      order: 0,
      source: "fallback",
      chatbotGenerated: false,
      generatedAt: "2026-08-07T00:00:00.000Z",
      ...patch,
    });
  }

  it("rejects a count-aggregation donut whose value column is non-numeric text", () => {
    const rows = [
      { region: "North", notes: "abc" },
      { region: "South", notes: "def" },
    ];
    const context = {
      columns: [
        { name: "region", kind: "categorical" as const },
        { name: "notes", kind: "categorical" as const },
      ],
      rows,
    };
    const error = validateChartCollection([donutChart({})], context);
    expect(error).toBe(
      "Donut charts require positive, non-empty parts of a whole.",
    );
  });
});

describe("computeKpiTrend", () => {
  function kpi(patch: Record<string, unknown>) {
    return KPIConfigSchema.parse({
      id: "kpi_01",
      column: "amount",
      aggregation: "sum",
      label: "Revenue",
      description: "Sum of amount.",
      isPrimary: false,
      size: "medium",
      order: 0,
      ...patch,
    });
  }

  const dateColumn = [{ name: "date", kind: "date" as const }];

  it("returns null when the dataset has no date column", () => {
    const rows = [
      { date: "2026-01-01", amount: 10 },
      { date: "2026-02-01", amount: 20 },
    ];
    expect(
      computeKpiTrend(kpi({}), rows, [
        { name: "amount", kind: "numeric" as const },
      ]),
    ).toBeNull();
  });

  it("returns null with fewer than two usable periods", () => {
    const rows = [{ date: "2026-01-01", amount: 10 }];
    expect(computeKpiTrend(kpi({}), rows, dateColumn)).toBeNull();
  });

  it("compares the latest bucket to the immediately preceding one for a sum KPI", () => {
    // Span > 90 days so the two months bucket separately (`month`
    // granularity) rather than by day.
    const rows = [
      { date: "2026-01-05", amount: 100 },
      { date: "2026-01-10", amount: 50 },
      { date: "2026-04-05", amount: 90 },
      { date: "2026-04-10", amount: 90 },
    ];
    const trend = computeKpiTrend(kpi({ aggregation: "sum" }), rows, dateColumn);
    // Jan bucket sums to 150, Apr bucket sums to 180: +20%.
    expect(trend).not.toBeNull();
    expect(trend?.deltaPct).toBeCloseTo(20, 5);
    expect(trend?.sparkline.at(-1)?.value).toBe(180);
    expect(trend?.sparkline.at(-2)?.value).toBe(150);
  });

  it("averages within each bucket for an avg KPI instead of summing", () => {
    const rows = [
      { date: "2026-01-05", amount: 10 },
      { date: "2026-01-10", amount: 30 },
      { date: "2026-04-05", amount: 40 },
      { date: "2026-04-10", amount: 60 },
    ];
    const trend = computeKpiTrend(kpi({ aggregation: "avg" }), rows, dateColumn);
    // Jan average is 20 (not 40), Apr average is 50 (not 100): +150%.
    expect(trend?.sparkline.at(-2)?.value).toBe(20);
    expect(trend?.sparkline.at(-1)?.value).toBe(50);
    expect(trend?.deltaPct).toBeCloseTo(150, 5);
  });

  it("caps the sparkline at the most recent 12 periods", () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({
      date: new Date(Date.UTC(2024, index, 1)).toISOString().slice(0, 10),
      amount: index,
    }));
    const trend = computeKpiTrend(kpi({ aggregation: "sum" }), rows, dateColumn);
    expect(trend?.sparkline).toHaveLength(12);
  });

  it("returns a zero delta rather than a fabricated percentage off a zero baseline", () => {
    const rows = [
      { date: "2026-01-05", amount: 0 },
      { date: "2026-02-05", amount: 25 },
    ];
    const trend = computeKpiTrend(kpi({ aggregation: "sum" }), rows, dateColumn);
    expect(trend?.deltaPct).toBe(0);
  });
});
