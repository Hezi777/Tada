import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// Integration-style tests of the upload -> generate and chat paths, fully
// offline: embeddings are mocked and no GROQ_API_KEY is set, so generation
// exercises the heuristic fallback and the deterministic BI rules engine -
// exactly the path the app takes when the LLM is unavailable.
vi.mock("@/shared/lib/ai/embeddings", () => ({
  embedQuery: vi.fn(async () => new Array(384).fill(0.1)),
  embedTexts: vi.fn(async (texts: string[]) =>
    texts.map(() => new Array(384).fill(0.1)),
  ),
  cosineSimilarity: vi.fn(() => 0.5),
  toVectorLiteral: (vector: number[]) => `[${vector.join(",")}]`,
}));

import { profileUpload, generateDashboardArtifacts } from "./upload";
import { validateChartCollection } from "./config";
import { validateKpiCollection } from "@/features/dashboard/client/runtime";
import { handleChat } from "./chat";
import { createDatasetState, setDatasetRows } from "./state";

const SALES_CSV = [
  "date,region,product,revenue,units",
  ...Array.from({ length: 60 }, (_, index) => {
    const month = String((index % 12) + 1).padStart(2, "0");
    const day = String((index % 27) + 1).padStart(2, "0");
    const region = ["North", "South", "Center"][index % 3];
    const product = ["Widget", "Gadget", "Gizmo", "Doodad"][index % 4];
    return `2025-${month}-${day},${region},${product},${100 + index * 13},${1 + (index % 9)}`;
  }),
].join("\n");

const ADVERSARIAL_EXPENSES_CSV = [
  "transaction_id,expense_date,vendor_name,category,amount_ils,tax_rate_pct",
  "10001,2026-01-03,Cafe Alef,Meals,42.90,17",
  "10002,2026-01-17,Office Pro,Supplies,-15.50,17",
  "10003,invalid-date,Cloud Host,Software,299.99,17",
  "10004,2026-02-01,Landlord,Rent,4500,0",
  "10005,2026-02-03,Cafe Alef,Meals,,17",
  "10006,2026-03-11,Cloud Host,Software,301.25,17",
].join("\n");

function csvFile(content: string) {
  return { buffer: Buffer.from(content, "utf8"), originalname: "sales.csv" };
}

describe("upload -> generate pipeline (offline fallback path)", () => {
  it("profiles an upload end to end", async () => {
    const result = await profileUpload(csvFile(SALES_CSV));
    expect(result.rows).toHaveLength(60);
    expect(result.profile.rowCount).toBe(60);
    expect(result.columns.map((column) => column.kind)).toContain("numeric");
    expect(result.columns.map((column) => column.kind)).toContain("date");
    // Embeddings are mocked flat, so similarity stays under the confidence
    // floor and classification must answer "unknown" rather than guess.
    expect(result.suggestedTopic).toBe("unknown");
  });

  it("generates a valid, rule-conforming chart + KPI collection", async () => {
    const { rows, columns } = await profileUpload(csvFile(SALES_CSV));
    const { charts, kpis } = await generateDashboardArtifacts(rows, columns, {
      topic: "sales",
      chartCount: 4,
    });

    expect(charts.length).toBeGreaterThanOrEqual(2);
    expect(validateChartCollection(charts, columns, rows)).toBeNull();
    expect(validateKpiCollection(kpis)).toBeNull();
    // Provenance is preserved for auditability.
    for (const chart of charts) {
      expect(chart.generatedAt).toBeTruthy();
      expect(chart.source).toBeTruthy();
    }
  });

  it("handles realistic expense exports with ids, missing values, negatives, and bad dates", async () => {
    const result = await profileUpload(csvFile(ADVERSARIAL_EXPENSES_CSV));

    expect(result.columns).toContainEqual({
      name: "transaction_id",
      kind: "ignored",
    });
    expect(result.columns).toContainEqual({
      name: "vendor_name",
      kind: "categorical",
    });
    expect(result.columns).toContainEqual({
      name: "amount_ils",
      kind: "numeric",
    });
    expect(result.profile.invalidDateRowCount).toBe(1);
    expect(result.profile.incompleteRowCount).toBe(1);
    expect(
      result.profile.columns.find((column) => column.name === "amount_ils"),
    ).toMatchObject({
      semanticType: "currency",
      unit: "ILS",
    });

    const { charts } = await generateDashboardArtifacts(
      result.rows,
      result.columns,
      {
        topic: "expenses",
        chartCount: 4,
      },
    );
    expect(
      validateChartCollection(charts, result.columns, result.rows),
    ).toBeNull();
    expect(charts.every((chart) => chart.evidence)).toBe(true);
  });
});

describe("chat path (offline)", () => {
  it("answers explicit remove commands without any LLM", async () => {
    const { rows, columns } = await profileUpload(csvFile(SALES_CSV));
    const { charts, kpis } = await generateDashboardArtifacts(rows, columns, {
      topic: "sales",
      chartCount: 4,
    });
    void kpis;

    const datasetId = "test-dataset-1";
    createDatasetState(datasetId, columns, [], charts, {
      columns,
      rowCount: rows.length,
      sampleRows: [],
    });
    setDatasetRows(datasetId, rows);

    const supabase = {
      rpc: vi.fn(async () => ({ data: [], error: null })),
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: { message: "miss" } }),
          }),
        }),
      })),
    } as unknown as SupabaseClient;

    const response = await handleChat({
      supabase,
      datasetId,
      message: "remove chart 2",
      chartConfigs: charts,
      kpis: [],
    });

    expect(response.mode).toBe("apply_patch");
    expect(response.patch).toMatchObject({
      action: "remove",
      chartId: charts[1].id,
    });
  });

  it("degrades to a clear message when the LLM is unavailable", async () => {
    const { rows, columns } = await profileUpload(csvFile(SALES_CSV));
    const { charts } = await generateDashboardArtifacts(rows, columns, {
      topic: "sales",
      chartCount: 4,
    });

    const datasetId = "test-dataset-2";
    createDatasetState(datasetId, columns, [], charts, {
      columns,
      rowCount: rows.length,
      sampleRows: [],
    });
    setDatasetRows(datasetId, rows);

    const supabase = {
      rpc: vi.fn(async () => ({ data: [], error: null })),
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: { message: "miss" } }),
          }),
        }),
      })),
    } as unknown as SupabaseClient;

    const response = await handleChat({
      supabase,
      datasetId,
      message: "מה ההכנסה הכוללת לפי אזור?",
      chartConfigs: charts,
      kpis: [],
    });

    expect(response.mode).toBe("answer");
    expect(response.patch).toBeNull();
    expect(response.assistantMessage.length).toBeGreaterThan(0);
  });
});
