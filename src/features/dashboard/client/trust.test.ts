import { describe, expect, it } from "vitest";
import { ChartConfigSchema } from "@/shared/contracts";
import { buildDashboardTrustModel, filterRowsByDateRange } from "./trust";

const chart = ChartConfigSchema.parse({
  id: "chart-1",
  type: "area",
  title: "Revenue",
  insight: "Revenue over time",
  columns: ["amount", "date"],
  aggregation: "sum",
  groupBy: null,
  timeColumn: "date",
  size: "large",
  visible: true,
  order: 0,
  source: "fallback",
  generatedAt: "2026-08-08T10:00:00.000Z",
});

describe("dashboard trust model", () => {
  it("derives source, coverage, freshness, and deterministic warnings", () => {
    const model = buildDashboardTrustModel({
      fileName: "sales.csv",
      files: [{ id: "1", fileName: "sales.csv", rowCount: 3, isPrimary: true }],
      columns: [
        { name: "date", kind: "date" },
        { name: "amount", kind: "numeric" },
      ],
      rows: [
        { date: "2026-01-02", amount: 10 },
        { date: "2026-02-03", amount: null },
        { date: "not-a-date", amount: 20 },
      ],
      charts: [chart],
      expectedRowCount: 4,
    });

    expect(model).toMatchObject({
      sourceLabel: "sales.csv",
      rowCount: 3,
      dateColumn: "date",
      availableDateRange: { from: "2026-01-02", to: "2026-02-03" },
      generatedAt: "2026-08-08T10:00:00.000Z",
    });
    expect(model.warnings.map((warning) => warning.id)).toEqual([
      "missing-values",
      "invalid-dates",
      "row-count",
    ]);
  });

  it("filters inclusively and excludes invalid dates", () => {
    const rows = [
      { date: "2026-01-01", amount: 1 },
      { date: "2026-01-31T22:00:00.000Z", amount: 2 },
      { date: "2026-02-01", amount: 3 },
      { date: "invalid", amount: 4 },
    ];

    expect(
      filterRowsByDateRange(rows, "date", {
        from: "2026-01-01",
        to: "2026-01-31",
      }),
    ).toEqual(rows.slice(0, 2));
  });

  it("does not filter when no valid range is active", () => {
    const rows = [{ date: "2026-01-01" }];
    expect(filterRowsByDateRange(rows, "date", null)).toBe(rows);
    expect(
      filterRowsByDateRange(rows, null, {
        from: "2026-01-01",
        to: "2026-01-02",
      }),
    ).toBe(rows);
  });
});
