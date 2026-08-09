import { describe, expect, it } from "vitest";
import { buildInitialChartConfigs, isAdditiveMeasure } from "./config";
import type { Column } from "./types";

describe("isAdditiveMeasure", () => {
  it("rejects year-like numeric columns", () => {
    const column: Column = { name: "release_year", kind: "numeric" };
    const rows = Array.from({ length: 10 }, (_, index) => ({
      release_year: 2010 + (index % 15),
    }));
    expect(isAdditiveMeasure(rows, column)).toBe(false);
  });

  it("rejects a numeric column whose name looks like an identifier", () => {
    const column: Column = { name: "customer_id", kind: "numeric" };
    const rows = Array.from({ length: 10 }, (_, index) => ({
      customer_id: 1000 + index,
    }));
    expect(isAdditiveMeasure(rows, column)).toBe(false);
  });

  it("rejects near-unique whole-number columns even without an id-like name", () => {
    const column: Column = { name: "reference", kind: "numeric" };
    const rows = Array.from({ length: 10 }, (_, index) => ({
      reference: 5000 + index,
    }));
    expect(isAdditiveMeasure(rows, column)).toBe(false);
  });

  it("accepts a genuine additive measure", () => {
    const column: Column = { name: "revenue", kind: "numeric" };
    const rows = Array.from({ length: 10 }, (_, index) => ({
      revenue: 100 + index * 7.5,
    }));
    expect(isAdditiveMeasure(rows, column)).toBe(true);
  });
});

describe("buildInitialChartConfigs (offline fallback path)", () => {
  const columns: Column[] = [
    { name: "title", kind: "categorical" },
    { name: "release_year", kind: "numeric" },
    { name: "rating", kind: "numeric" },
  ];

  const rows = Array.from({ length: 30 }, (_, index) => ({
    title: `Movie ${index}`,
    release_year: 1990 + (index % 30),
    rating: 1 + (index % 5) + (index % 3) * 0.5,
  }));

  it("never sums or averages a year-like column", async () => {
    const charts = await buildInitialChartConfigs(rows, columns);
    for (const chart of charts) {
      const usesYearAsMeasure =
        chart.columns[0] === "release_year" &&
        (chart.aggregation === "sum" || chart.aggregation === "avg");
      expect(usesYearAsMeasure).toBe(false);
    }
  });

  it("does not produce a single-value 'Average X' / 'X share' bar or donut", async () => {
    const charts = await buildInitialChartConfigs(rows, columns);
    for (const chart of charts) {
      const isSingleValueAggregateShape =
        (chart.type === "bar" || chart.type === "donut") &&
        !chart.groupBy &&
        chart.columns.length === 1 &&
        (chart.aggregation === "sum" || chart.aggregation === "avg");
      expect(isSingleValueAggregateShape).toBe(false);
    }
  });

  it("grounds fallback insights in computed values", async () => {
    const charts = await buildInitialChartConfigs(rows, columns);
    for (const chart of charts) {
      expect(chart.insight).toMatch(/\d/);
      expect(chart.evidence).toBeDefined();
      expect(chart.evidence?.includedRowCount).toBeGreaterThan(0);
      expect(
        chart.evidence!.includedRowCount + chart.evidence!.excludedRowCount,
      ).toBe(rows.length);
    }
  });

  it("discloses rows excluded from time insights", async () => {
    const dateColumns: Column[] = [
      { name: "sale_date", kind: "date" },
      { name: "region", kind: "categorical" },
      { name: "revenue", kind: "numeric" },
    ];
    const dateRows = [
      { sale_date: "2026-01-01", region: "North", revenue: 100.5 },
      { sale_date: "bad-date", region: "South", revenue: 200.25 },
      { sale_date: "2026-02-01", region: "North", revenue: null },
      { sale_date: "2026-03-01", region: "South", revenue: 300.75 },
    ];
    const charts = await buildInitialChartConfigs(dateRows, dateColumns);
    const trend = charts.find((chart) => chart.type === "area");

    expect(trend?.evidence).toMatchObject({
      includedRowCount: 2,
      excludedRowCount: 2,
    });
  });
});
