import { EMBEDDING_DIM, EMBEDDING_MODEL } from "@/shared/lib/ai/config";

// Local embeddings via Transformers.js (Groq exposes no embeddings endpoint).
// The e5 model family expects a "query: " prefix for search queries and a
// "passage: " prefix for indexed documents; mixing them up degrades recall.

export type EmbeddingKind = "query" | "passage";

type FeatureExtractor = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist: () => number[][] }>;

let extractorPromise: Promise<FeatureExtractor> | null = null;

async function getExtractor(): Promise<FeatureExtractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL, {
        dtype: "q8",
      });
      return extractor as unknown as FeatureExtractor;
    })();
  }
  return extractorPromise;
}

const queryCache = new Map<string, number[]>();
const QUERY_CACHE_MAX = 200;

function cacheKey(kind: EmbeddingKind, text: string): string {
  return `${kind}:${text}`;
}

export async function embedTexts(
  texts: string[],
  kind: EmbeddingKind,
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const extractor = await getExtractor();
  const prefixed = texts.map((text) => `${kind}: ${text.trim()}`);
  const output = await extractor(prefixed, {
    pooling: "mean",
    normalize: true,
  });
  const vectors = output.tolist();

  for (const vector of vectors) {
    if (vector.length !== EMBEDDING_DIM) {
      throw new Error(
        `embedding_dim_mismatch: expected ${EMBEDDING_DIM}, got ${vector.length}`,
      );
    }
  }
  return vectors;
}

export async function embedQuery(text: string): Promise<number[]> {
  const key = cacheKey("query", text);
  const cached = queryCache.get(key);
  if (cached) {
    return cached;
  }

  const [vector] = await embedTexts([text], "query");
  if (queryCache.size >= QUERY_CACHE_MAX) {
    const oldest = queryCache.keys().next().value;
    if (oldest !== undefined) {
      queryCache.delete(oldest);
    }
  }
  queryCache.set(key, vector);
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
  }
  // Vectors are normalized at embedding time, so the dot product is cosine.
  return dot;
}

/** pgvector accepts vectors as a "[v1,v2,...]" string literal. */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
