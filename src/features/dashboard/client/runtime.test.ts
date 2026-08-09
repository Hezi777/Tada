import { describe, expect, it } from "vitest";
import { ChartConfigSchema } from "@/shared/contracts";
import { buildAreaSeries, buildGroupedSeries } from "./runtime";

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
});
