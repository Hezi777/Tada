import { describe, expect, it } from "vitest";
import { ChartConfigSchema } from "@/shared/contracts";
import { deriveChartInsight } from "./chart-format";

function chart(patch: Record<string, unknown>) {
  return ChartConfigSchema.parse({
    id: "chart_01",
    type: "bar",
    title: "Sales by category",
    insight: "Technology probably leads.",
    columns: ["sales_amount_ils", "category"],
    aggregation: "sum",
    groupBy: "category",
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

describe("deriveChartInsight", () => {
  it("replaces stored bar copy with a value computed from rendered rows", () => {
    const insight = deriveChartInsight(chart({}), [
      { category: "Furniture", sales_amount_ils: 120 },
      { category: "Office Supplies", sales_amount_ils: 240 },
      { category: "Office Supplies", sales_amount_ils: 60 },
    ]);

    expect(insight).toContain("Office Supplies ranks first");
    expect(insight).toContain("₪300");
    expect(insight).not.toContain("probably");
  });

  it("computes an exact first-to-last time-series change", () => {
    const insight = deriveChartInsight(
      chart({
        type: "area",
        title: "Revenue over time",
        columns: ["sales_amount_ils", "order_date"],
        groupBy: null,
        timeColumn: "order_date",
      }),
      [
        { order_date: "2026-01-01", sales_amount_ils: 100 },
        { order_date: "2026-02-01", sales_amount_ils: 125 },
      ],
    );

    expect(insight).toContain("increased 25.0%");
    expect(insight).toContain("₪100");
    expect(insight).toContain("₪125");
  });
});
