#!/usr/bin/env node
// Embeds data/bi-rules.json and upserts it into the bi_rules_chunks pgvector
// index. Embeddings are computed locally (Xenova/multilingual-e5-small, the
// same model the app uses at query time — mixing models breaks retrieval).
//
// Usage:
//   npm run seed:bi-rules            # upserts via supabase (needs env vars)
//   npm run seed:bi-rules -- --sql out.sql   # writes SQL instead (no env needed)
//
// Env (read from .env.local when present):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EMBEDDING_MODEL = "Xenova/multilingual-e5-small";

function loadDotEnvLocal() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) {
    return;
  }
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

function escapeSqlString(value) {
  return value.replace(/'/g, "''");
}

async function main() {
  loadDotEnvLocal();

  const sqlFlagIndex = process.argv.indexOf("--sql");
  const sqlOutPath = sqlFlagIndex !== -1 ? process.argv[sqlFlagIndex + 1] : null;

  const rules = JSON.parse(
    readFileSync(resolve(root, "data/bi-rules.json"), "utf8"),
  );
  console.log(`Embedding ${rules.length} BI rules with ${EMBEDDING_MODEL}...`);

  const { pipeline } = await import("@huggingface/transformers");
  const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL, {
    dtype: "q8",
  });

  const texts = rules.map((rule) => `passage: ${rule.content}`);
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  const vectors = output.tolist();

  if (vectors.length !== rules.length || vectors[0].length !== 384) {
    throw new Error(
      `unexpected embedding shape: ${vectors.length} x ${vectors[0]?.length}`,
    );
  }

  const records = rules.map((rule, index) => ({
    rule_id: rule.rule_id,
    category: rule.category,
    content: rule.content,
    action_if_fail: rule.action_if_fail,
    severity: rule.severity,
    embedding: `[${vectors[index].map((v) => v.toFixed(6)).join(",")}]`,
  }));

  if (sqlOutPath) {
    const statements = records.map(
      (record) =>
        `insert into public.bi_rules_chunks (rule_id, category, content, action_if_fail, severity, embedding) values (` +
        `'${escapeSqlString(record.rule_id)}', '${record.category}', '${escapeSqlString(record.content)}', ` +
        `'${escapeSqlString(record.action_if_fail)}', '${record.severity}', '${record.embedding}')\n` +
        `on conflict (rule_id) do update set category = excluded.category, content = excluded.content, ` +
        `action_if_fail = excluded.action_if_fail, severity = excluded.severity, embedding = excluded.embedding;`,
    );
    writeFileSync(resolve(root, sqlOutPath), statements.join("\n") + "\n");
    console.log(`Wrote ${records.length} upsert statements to ${sqlOutPath}`);
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Set them in .env.local, or use --sql <file> to emit SQL instead.",
    );
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey);
  const { error } = await supabase
    .from("bi_rules_chunks")
    .upsert(records, { onConflict: "rule_id" });

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
  console.log(`Seeded ${records.length} rules into bi_rules_chunks.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
