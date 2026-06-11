import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { DatasetProfile } from "@/shared/contracts";
import {
  embedQuery,
  embedTexts,
  toVectorLiteral,
} from "@/shared/lib/ai/embeddings";
import { redactPiiColumns, summarizeProfile } from "@/features/dashboard/server/profile";

type Row = Record<string, unknown>;

// Per-user Data RAG: at upload time the dataset is distilled into compact
// text chunks (overview, per-column stats, category aggregates, time buckets,
// sample rows), embedded, and stored in user_data_chunks scoped to the
// owning user. Chat retrieves from this index instead of re-reading the file.

const MAX_CHUNKS = 30;

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatNumber(value: number): string {
  return Math.abs(value) >= 1000
    ? Math.round(value).toLocaleString("en-US")
    : String(Math.round(value * 100) / 100);
}

function columnChunks(profile: DatasetProfile): string[] {
  return profile.columns
    .filter((column) => column.kind !== "ignored" && !column.isPii)
    .map((column) => {
      const parts = [
        `Column "${column.name}" (${column.kind}):`,
        `${profile.rowCount - column.nullCount} populated values, ${column.nullCount} empty, ${column.uniqueCount} distinct.`,
      ];
      if (column.kind === "numeric" && column.mean !== null) {
        parts.push(
          `Range ${column.min} to ${column.max}, average ${column.mean}.`,
        );
      } else if (column.topValues.length > 0) {
        parts.push(
          `Most frequent: ${column.topValues
            .map((entry) => `${entry.value} (${entry.count}x)`)
            .join(", ")}.`,
        );
      }
      return parts.join(" ");
    });
}

function aggregateChunks(profile: DatasetProfile, rows: Row[]): string[] {
  const chunks: string[] = [];
  const numericColumns = profile.columns
    .filter((column) => column.kind === "numeric" && !column.isPii)
    .slice(0, 2);
  const categoricalColumns = profile.columns
    .filter((column) => column.kind === "categorical" && !column.isPii)
    .slice(0, 3);

  for (const categorical of categoricalColumns) {
    for (const numeric of numericColumns) {
      const totals = new Map<string, number>();
      for (const row of rows) {
        const key = row[categorical.name];
        const value = toNumber(row[numeric.name]);
        if (key === null || key === undefined || key === "" || value === null) {
          continue;
        }
        const label = String(key);
        totals.set(label, (totals.get(label) ?? 0) + value);
      }
      if (totals.size < 2) {
        continue;
      }
      const top = Array.from(totals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      chunks.push(
        `Total ${numeric.name} by ${categorical.name}: ${top
          .map(([label, total]) => `${label}: ${formatNumber(total)}`)
          .join(", ")}.`,
      );
    }
    // Plain frequency distribution for the category itself.
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = row[categorical.name];
      if (key === null || key === undefined || key === "") {
        continue;
      }
      counts.set(String(key), (counts.get(String(key)) ?? 0) + 1);
    }
    if (counts.size >= 2) {
      const top = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      chunks.push(
        `Row count by ${categorical.name}: ${top
          .map(([label, count]) => `${label}: ${count}`)
          .join(", ")}.`,
      );
    }
  }
  return chunks;
}

function timeChunks(profile: DatasetProfile, rows: Row[]): string[] {
  const dateColumn = profile.columns.find((column) => column.kind === "date");
  if (!dateColumn) {
    return [];
  }
  const numericColumns = profile.columns
    .filter((column) => column.kind === "numeric" && !column.isPii)
    .slice(0, 2);

  const chunks: string[] = [];
  for (const numeric of numericColumns.length > 0
    ? numericColumns
    : [null]) {
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      const raw = row[dateColumn.name];
      const parsed =
        raw instanceof Date ? raw : new Date(Date.parse(String(raw)));
      if (Number.isNaN(parsed.getTime())) {
        continue;
      }
      const key = parsed.toISOString().slice(0, 7);
      const bucket = buckets.get(key) ?? { sum: 0, count: 0 };
      const value = numeric ? toNumber(row[numeric.name]) : null;
      if (value !== null) {
        bucket.sum += value;
      }
      bucket.count += 1;
      buckets.set(key, bucket);
    }
    if (buckets.size < 2) {
      continue;
    }
    const series = Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-24);
    chunks.push(
      numeric
        ? `Monthly ${numeric.name} by ${dateColumn.name}: ${series
            .map(([month, bucket]) => `${month}: ${formatNumber(bucket.sum)}`)
            .join(", ")}.`
        : `Monthly record counts by ${dateColumn.name}: ${series
            .map(([month, bucket]) => `${month}: ${bucket.count}`)
            .join(", ")}.`,
    );
  }
  return chunks;
}

function sampleChunks(profile: DatasetProfile, rows: Row[]): string[] {
  const redacted = redactPiiColumns(rows.slice(0, 8), profile);
  if (redacted.length === 0) {
    return [];
  }
  return [
    `Sample rows (PII columns removed): ${JSON.stringify(redacted)}`,
  ];
}

export function buildDatasetChunks(
  profile: DatasetProfile,
  rows: Row[],
): Array<{ chunkType: string; content: string }> {
  const chunks: Array<{ chunkType: string; content: string }> = [
    { chunkType: "overview", content: summarizeProfile(profile) },
    ...columnChunks(profile).map((content) => ({
      chunkType: "column",
      content,
    })),
    ...aggregateChunks(profile, rows).map((content) => ({
      chunkType: "aggregate",
      content,
    })),
    ...timeChunks(profile, rows).map((content) => ({
      chunkType: "time",
      content,
    })),
    ...sampleChunks(profile, rows).map((content) => ({
      chunkType: "sample",
      content,
    })),
  ];
  return chunks.slice(0, MAX_CHUNKS);
}

/**
 * Embed + store the dataset's chunks. Skips work when the content hash is
 * unchanged (no re-embedding of unchanged data); replaces existing chunks
 * when the dataset content changed (e.g. a chained file was added).
 */
export async function upsertDatasetChunks(
  supabase: SupabaseClient,
  input: {
    userId: string;
    datasetId: string;
    contentHash: string;
    profile: DatasetProfile;
    rows: Row[];
  },
): Promise<{ chunkCount: number; skipped: boolean }> {
  const { data: existing } = await supabase
    .from("user_data_chunks")
    .select("id, chunk_type")
    .eq("dataset_id", input.datasetId)
    .eq("chunk_type", `hash:${input.contentHash}`)
    .limit(1);

  if (existing && existing.length > 0) {
    return { chunkCount: 0, skipped: true };
  }

  const chunks = buildDatasetChunks(input.profile, input.rows);
  const vectors = await embedTexts(
    chunks.map((chunk) => chunk.content),
    "passage",
  );

  // Replace any chunks from a previous version of this dataset.
  await supabase
    .from("user_data_chunks")
    .delete()
    .eq("dataset_id", input.datasetId);

  const records = [
    ...chunks.map((chunk, index) => ({
      user_id: input.userId,
      dataset_id: input.datasetId,
      chunk_index: index,
      chunk_type: chunk.chunkType,
      content: chunk.content,
      embedding: toVectorLiteral(vectors[index]),
    })),
    // Sentinel row marking which content hash these chunks belong to.
    {
      user_id: input.userId,
      dataset_id: input.datasetId,
      chunk_index: chunks.length,
      chunk_type: `hash:${input.contentHash}`,
      content: "content-hash sentinel",
      embedding: toVectorLiteral(new Array(384).fill(0)),
    },
  ];

  const { error } = await supabase.from("user_data_chunks").insert(records);
  if (error) {
    console.error("[user-data] chunk insert failed:", error.message);
    return { chunkCount: 0, skipped: false };
  }
  return { chunkCount: chunks.length, skipped: false };
}

const ChunkMatchSchema = z.object({
  chunk_index: z.number(),
  chunk_type: z.string(),
  content: z.string(),
  similarity: z.number(),
});

export type RetrievedChunk = z.infer<typeof ChunkMatchSchema>;

const retrievalCache = new Map<string, RetrievedChunk[]>();
const RETRIEVAL_CACHE_MAX = 100;

/** Vector retrieval over the user's dataset chunks, with an LRU cache. */
export async function retrieveDatasetContext(
  supabase: SupabaseClient,
  datasetId: string,
  query: string,
  topK = 6,
): Promise<RetrievedChunk[]> {
  const cacheKey = `${datasetId}:${query}`;
  const cached = retrievalCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const queryEmbedding = await embedQuery(query);
    const { data, error } = await supabase.rpc("match_user_data_chunks", {
      query_embedding: toVectorLiteral(queryEmbedding),
      p_dataset_id: datasetId,
      match_count: topK + 1, // +1 headroom for the hash sentinel
    });
    if (error || !Array.isArray(data)) {
      if (error) {
        console.error("[user-data] retrieval failed:", error.message);
      }
      return [];
    }
    const results = data
      .map((row) => ChunkMatchSchema.safeParse(row))
      .filter(
        (parsed): parsed is { success: true; data: RetrievedChunk } =>
          parsed.success,
      )
      .map((parsed) => parsed.data)
      .filter((chunk) => !chunk.chunk_type.startsWith("hash:"))
      .slice(0, topK);

    if (retrievalCache.size >= RETRIEVAL_CACHE_MAX) {
      const oldest = retrievalCache.keys().next().value;
      if (oldest !== undefined) {
        retrievalCache.delete(oldest);
      }
    }
    retrievalCache.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error("[user-data] retrieval failed:", error);
    return [];
  }
}

/** Drop cached retrievals for a dataset whose content changed. */
export function invalidateDatasetRetrievalCache(datasetId: string): void {
  for (const key of retrievalCache.keys()) {
    if (key.startsWith(`${datasetId}:`)) {
      retrievalCache.delete(key);
    }
  }
}
