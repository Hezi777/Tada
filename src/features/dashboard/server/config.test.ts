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
});
