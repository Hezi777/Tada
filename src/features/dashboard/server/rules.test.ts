import { describe, expect, it } from "vitest";
import { ChartConfigSchema, type ChartConfig } from "@/shared/contracts";
import { applyBiRules } from "./rules";
import type { Column } from "./types";

function makeChart(patch: Partial<ChartConfig>): ChartConfig {
  return ChartConfigSchema.parse({
    id: "chart_01",
    type: "bar",
    title: "Revenue by region",
    insight: "North leads revenue.",
    columns: ["revenue", "region"],
    aggregation: "sum",
    groupBy: "region",
    timeColumn: null,
    size: "medium",
    visible: true,
    order: 0,
    source: "ai_initial",
    chatbotGenerated: false,
    generatedAt: new Date().toISOString(),
    ...patch,
  });
}

function rowsWithCategories(count: number, labelLength = 3) {
  return Array.from({ length: count * 2 }, (_, index) => ({
    region: `${"R".repeat(labelLength)}${index % count}`,
    revenue: 100 + index,
  }));
}

const columns: Column[] = [
  { name: "revenue", kind: "numeric" },
  { name: "region", kind: "categorical" },
  { name: "date", kind: "date" },
];

describe("applyBiRules", () => {
  it("converts donuts with far too many categories to bars (pie_max_slices)", () => {
    const chart = makeChart({ type: "donut" });
    const { charts, violations } = applyBiRules(
      [chart],
      columns,
      rowsWithCategories(14),
    );
    expect(charts[0].type).toBe("bar");
    expect(violations).toContainEqual(
      expect.objectContaining({
        ruleId: "pie_max_slices",
        action: "convert_to_bar",
        applied: true,
      }),
    );
  });

  it("caps donuts slightly over the limit with an Other bucket", () => {
    const chart = makeChart({ type: "donut" });
    const { charts, violations } = applyBiRules(
      [chart],
      columns,
      rowsWithCategories(8),
    );
    expect(charts[0].type).toBe("donut");
    expect(charts[0].categoryLimit).toBe(6);
    expect(violations[0].ruleId).toBe("top_n_with_other_bucket");
  });

  it("converts area charts without a date column to bars", () => {
    const chart = makeChart({ type: "area", timeColumn: null });
    const { charts, violations } = applyBiRules(
      [chart],
      columns,
      rowsWithCategories(3),
    );
    expect(charts[0].type).toBe("bar");
    expect(violations[0].ruleId).toBe("no_line_for_unordered_categories");
  });

  it("keeps valid area charts untouched", () => {
    const chart = makeChart({
      type: "area",
      timeColumn: "date",
      groupBy: null,
    });
    const { charts } = applyBiRules([chart], columns, rowsWithCategories(3));
    expect(charts[0].type).toBe("area");
  });

  it("switches long-label bars to horizontal orientation", () => {
    const chart = makeChart({});
    const { charts, violations } = applyBiRules(
      [chart],
      columns,
      rowsWithCategories(5, 18),
    );
    expect(charts[0].orientation).toBe("horizontal");
    expect(violations).toContainEqual(
      expect.objectContaining({ ruleId: "long_labels_use_horizontal_bar" }),
    );
  });

  it("caps bars with too many categories (limit_categories_per_chart)", () => {
    const chart = makeChart({});
    const { charts } = applyBiRules([chart], columns, rowsWithCategories(16));
    expect(charts[0].categoryLimit).toBe(10);
  });

  it("changes sum on identifier-like columns to count", () => {
    const idColumns: Column[] = [
      { name: "customer_id", kind: "numeric" },
      { name: "region", kind: "categorical" },
    ];
    const chart = makeChart({ columns: ["customer_id", "region"] });
    const rows = Array.from({ length: 20 }, (_, index) => ({
      customer_id: 1000 + index,
      region: `R${index % 3}`,
    }));
    const { charts, violations } = applyBiRules([chart], idColumns, rows);
    expect(charts[0].aggregation).toBe("count");
    expect(violations[0].ruleId).toBe("israeli_ids_phones_are_categorical");
  });

  it("changes sum on rate-like measures to avg", () => {
    const rateColumns: Column[] = [
      { name: "conversion_rate", kind: "numeric" },
      { name: "region", kind: "categorical" },
    ];
    const chart = makeChart({ columns: ["conversion_rate", "region"] });
    const rows = Array.from({ length: 9 }, (_, index) => ({
      conversion_rate: 0.5,
      region: `R${index % 3}`,
    }));
    const { charts, violations } = applyBiRules([chart], rateColumns, rows);
    expect(charts[0].aggregation).toBe("avg");
    expect(violations[0].ruleId).toBe("average_for_rates_and_levels");
  });

  it("logs (but does not apply) info-severity single-value findings", () => {
    const chart = makeChart({});
    const rows = [
      { region: "Only", revenue: 5 },
      { region: "Only", revenue: 7 },
    ];
    const { charts, violations } = applyBiRules([chart], columns, rows);
    expect(charts[0].type).toBe("bar");
    expect(violations).toContainEqual(
      expect.objectContaining({
        ruleId: "single_value_use_kpi_card",
        applied: false,
      }),
    );
  });

  it("returns clean charts unchanged with no violations", () => {
    const chart = makeChart({});
    const { charts, violations } = applyBiRules(
      [chart],
      columns,
      rowsWithCategories(4),
    );
    expect(charts[0]).toEqual(chart);
    expect(violations).toHaveLength(0);
  });
});
