import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// Embeddings are mocked so RAG logic tests don't load the ONNX model.
vi.mock("@/shared/lib/ai/embeddings", () => ({
  embedQuery: vi.fn(async () => new Array(384).fill(0.1)),
  embedTexts: vi.fn(async (texts: string[]) =>
    texts.map(() => new Array(384).fill(0.1)),
  ),
  cosineSimilarity: vi.fn(() => 0.5),
  toVectorLiteral: (vector: number[]) => `[${vector.join(",")}]`,
}));

import { loadBiRules, retrieveBiRules, getBiRuleById } from "./bi-rules";
import {
  buildDatasetChunks,
  retrieveDatasetContext,
  invalidateDatasetRetrievalCache,
} from "./user-data";
import { profileDataset } from "@/features/dashboard/server/profile";

function mockSupabase(rpcImpl: (fn: string, args: unknown) => unknown) {
  return { rpc: vi.fn(rpcImpl) } as unknown as SupabaseClient;
}

describe("loadBiRules", () => {
  it("loads and validates the full versioned dataset", () => {
    const rules = loadBiRules();
    expect(rules.length).toBeGreaterThanOrEqual(45);
    const categories = new Set(rules.map((rule) => rule.category));
    expect(categories).toEqual(
      new Set([
        "chart_selection",
        "formatting",
        "aggregation",
        "readability",
        "israeli_data",
      ]),
    );
    const ids = new Set(rules.map((rule) => rule.rule_id));
    expect(ids.size).toBe(rules.length);
  });

  it("looks up rules by id", () => {
    expect(getBiRuleById("pie_max_slices")?.severity).toBe("error");
    expect(getBiRuleById("nope")).toBeNull();
  });
});

describe("retrieveBiRules", () => {
  it("maps rpc rows to retrieved rules", async () => {
    const supabase = mockSupabase(async () => ({
      data: [
        {
          rule_id: "pie_max_slices",
          category: "chart_selection",
          content: "No more than 6 slices.",
          action_if_fail: "convert_to_bar",
          severity: "error",
          similarity: 0.91,
        },
      ],
      error: null,
    }));

    const rules = await retrieveBiRules(supabase, "donut with many slices");
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      rule_id: "pie_max_slices",
      similarity: 0.91,
    });
  });

  it("falls back to the local dataset when the index is unreachable", async () => {
    const supabase = mockSupabase(async () => ({
      data: null,
      error: { message: "boom" },
    }));

    const rules = await retrieveBiRules(supabase, "anything", { topK: 5 });
    expect(rules).toHaveLength(5);
    // Fallback is severity-ordered: errors first.
    expect(rules[0].severity).toBe("error");
    expect(rules[0].similarity).toBe(0);
  });

  it("respects category filters in the fallback", async () => {
    const supabase = mockSupabase(async () => ({ data: [], error: null }));
    const rules = await retrieveBiRules(supabase, "x", {
      topK: 4,
      category: "israeli_data",
    });
    expect(rules.every((rule) => rule.category === "israeli_data")).toBe(true);
  });
});

describe("buildDatasetChunks", () => {
  const rows = Array.from({ length: 30 }, (_, index) => ({
    date: `2025-${String((index % 12) + 1).padStart(2, "0")}-15`,
    region: `Region ${index % 3}`,
    revenue: 100 + index * 10,
    email: `user${index}@example.com`,
  }));
  const profile = profileDataset(rows, [
    { name: "date", kind: "date" },
    { name: "region", kind: "categorical" },
    { name: "revenue", kind: "numeric" },
    { name: "email", kind: "ignored" },
  ]);

  it("builds overview, column, aggregate, time and sample chunks", () => {
    const chunks = buildDatasetChunks(profile, rows);
    const types = new Set(chunks.map((chunk) => chunk.chunkType));
    expect(types).toContain("overview");
    expect(types).toContain("column");
    expect(types).toContain("aggregate");
    expect(types).toContain("time");
    expect(types).toContain("sample");
  });

  it("includes real aggregates in the chunk text", () => {
    const chunks = buildDatasetChunks(profile, rows);
    const aggregate = chunks.find(
      (chunk) =>
        chunk.chunkType === "aggregate" &&
        chunk.content.includes("revenue by region"),
    );
    expect(aggregate?.content).toContain("Region");
  });

  it("keeps PII columns out of every chunk", () => {
    const chunks = buildDatasetChunks(profile, rows);
    for (const chunk of chunks) {
      expect(chunk.content).not.toContain("@example.com");
    }
  });
});

describe("retrieveDatasetContext", () => {
  beforeEach(() => {
    invalidateDatasetRetrievalCache("ds-1");
  });

  it("retrieves chunks and filters the hash sentinel", async () => {
    const supabase = mockSupabase(async () => ({
      data: [
        {
          chunk_index: 0,
          chunk_type: "overview",
          content: "Dataset with 30 rows.",
          similarity: 0.9,
        },
        {
          chunk_index: 9,
          chunk_type: "hash:abc",
          content: "content-hash sentinel",
          similarity: 0.2,
        },
      ],
      error: null,
    }));

    const chunks = await retrieveDatasetContext(supabase, "ds-1", "overview?");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunk_type).toBe("overview");
  });

  it("caches repeated questions per dataset", async () => {
    const rpc = vi.fn(async () => ({
      data: [
        {
          chunk_index: 0,
          chunk_type: "overview",
          content: "cached",
          similarity: 0.9,
        },
      ],
      error: null,
    }));
    const supabase = { rpc } as unknown as SupabaseClient;

    await retrieveDatasetContext(supabase, "ds-1", "same question");
    await retrieveDatasetContext(supabase, "ds-1", "same question");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("returns empty on retrieval errors instead of throwing", async () => {
    const supabase = mockSupabase(async () => ({
      data: null,
      error: { message: "down" },
    }));
    const chunks = await retrieveDatasetContext(supabase, "ds-1", "q");
    expect(chunks).toEqual([]);
  });
});
