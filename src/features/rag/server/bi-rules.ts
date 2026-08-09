import { z } from "zod";
import rawRules from "../../../../data/bi-rules.json";
import { BiRuleSchema, type BiRule } from "@/shared/contracts";

// The detailed BI rule catalog remains available locally for tooling and
// audits. Runtime dashboard generation uses BI_GENERATION_RULES directly;
// it does not need embeddings or a database round trip.

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

/**
 * Select a stable subset of the local catalog for tooling that needs detailed
 * rule records. Original file order breaks ties so results are reproducible.
 */
export function selectBiRules(
  options: { topK?: number; category?: BiRule["category"] } = {},
): BiRule[] {
  const topK = options.topK ?? 10;
  const severityRank = { error: 0, warning: 1, info: 2 } as const;
  return loadBiRules()
    .filter((rule) => !options.category || rule.category === options.category)
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, topK);
}
