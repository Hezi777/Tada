import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import rawRules from "../../../../data/bi-rules.json";
import { BiRuleSchema, type BiRule } from "@/shared/contracts";
import { embedQuery, toVectorLiteral } from "@/shared/lib/ai/embeddings";

// BI Rules RAG: the versioned dataset lives in data/bi-rules.json, its
// embeddings live in the bi_rules_chunks pgvector index (seeded by
// scripts/seed-bi-rules.mjs), and dashboard generation retrieves from it here.

const RulesFileSchema = z.array(BiRuleSchema);

let cachedRules: BiRule[] | null = null;

/** The full local dataset, zod-validated once per process. */
export function loadBiRules(): BiRule[] {
  if (!cachedRules) {
    cachedRules = RulesFileSchema.parse(rawRules);
  }
  return cachedRules;
}

export function getBiRuleById(ruleId: string): BiRule | null {
  return loadBiRules().find((rule) => rule.rule_id === ruleId) ?? null;
}

export type RetrievedBiRule = BiRule & { similarity: number };

const MatchRowSchema = z.object({
  rule_id: z.string(),
  category: BiRuleSchema.shape.category,
  content: z.string(),
  action_if_fail: z.string(),
  severity: BiRuleSchema.shape.severity,
  similarity: z.number(),
});

/**
 * Retrieve the rules most relevant to a dataset/chart-generation context via
 * pgvector similarity. Falls back to the local dataset (severity-ordered) when
 * the index is unreachable or empty, so generation never loses its grounding.
 */
export async function retrieveBiRules(
  supabase: SupabaseClient,
  queryText: string,
  options: { topK?: number; category?: BiRule["category"] } = {},
): Promise<RetrievedBiRule[]> {
  const topK = options.topK ?? 10;

  try {
    const queryEmbedding = await embedQuery(queryText);
    const { data, error } = await supabase.rpc("match_bi_rules", {
      query_embedding: toVectorLiteral(queryEmbedding),
      match_count: topK,
      filter_category: options.category ?? null,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data
        .map((row) => MatchRowSchema.safeParse(row))
        .filter((parsed): parsed is { success: true; data: RetrievedBiRule } =>
          parsed.success,
        )
        .map((parsed) => parsed.data);
    }
    if (error) {
      console.error("[bi-rules] vector retrieval failed:", error.message);
    }
  } catch (error) {
    console.error("[bi-rules] vector retrieval failed:", error);
  }

  const severityRank = { error: 0, warning: 1, info: 2 } as const;
  return loadBiRules()
    .filter((rule) => !options.category || rule.category === options.category)
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, topK)
    .map((rule) => ({ ...rule, similarity: 0 }));
}
