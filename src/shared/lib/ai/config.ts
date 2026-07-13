// Single source of truth for AI model identifiers. Swap models here.

// Primary generation/classification model (Groq).
export const GROQ_MODEL = "llama-3.3-70b-versatile";

// Local embedding model. Groq exposes no embeddings endpoint, so vectors are
// computed in-process with Transformers.js. Multilingual is required because
// datasets, BI rules and chat queries mix Hebrew and English.
export const EMBEDDING_MODEL = "Xenova/multilingual-e5-small";
export const EMBEDDING_DIM = 384;
