import type { DatasetMeta, LLMChatResponse, LLMPlanResponse } from "@tada/shared";
import { LLMChatResponseSchema, LLMPlanResponseSchema } from "@tada/shared";
import { buildFallbackCharts } from "../data/fallback";

export type LLMPlanContext = {
  datasetMeta: DatasetMeta;
  schema: Array<{ name: string; type: string }>;
  rowCount: number;
  sampleRows: Array<Record<string, unknown>>;
  numericStats: Record<string, unknown>;
  topCategoricalValues: Record<string, unknown>;
  dateRanges: Record<string, unknown>;
};

export type LLMChatContext = {
  datasetMeta: Record<string, unknown>;
  charts: Array<Record<string, unknown>>;
  aggregates: Record<string, unknown>;
  message: string;
};

const HF_API_URL = "https://api-inference.huggingface.co/models";

function buildPlanPrompt(context: LLMPlanContext): string {
  return [
    "Return strict JSON only. No prose.",
    "You are given dataset schema, sample rows, and summaries only.",
    "Produce JSON with keys: datasetTopic, metrics, dimensions, charts.",
    "Charts must be 3-5 items with id, type (line|bar|pie|table), x, optional y, title, optional filters, colorIntent.",
    "Do not include raw rows.",
    JSON.stringify({
      schema: context.schema,
      rowCount: context.rowCount,
      sampleRows: context.sampleRows,
      numericStats: context.numericStats,
      topCategoricalValues: context.topCategoricalValues,
      dateRanges: context.dateRanges,
    }),
  ].join("\n");
}

function buildChatPrompt(context: LLMChatContext): string {
  return [
    "Return strict JSON only. No prose.",
    "Use only provided dataset meta, chart specs, and aggregates.",
    "JSON keys: assistantMessage, actions.",
    "Each action is one of: remove_chart, add_chart, update_chart, show_chart.",
    JSON.stringify(context),
  ].join("\n");
}

async function callHF(prompt: string): Promise<unknown> {
  const apiKey = process.env.HF_API_KEY;
  const model = process.env.HF_MODEL || "HuggingFaceH4/zephyr-7b-beta";
  if (!apiKey) {
    throw new Error("HF_API_KEY missing");
  }
  const response = await fetch(`${HF_API_URL}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 800,
        temperature: 0.2,
      },
    }),
  });
  if (!response.ok) {
    const error = new Error(`HF error ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return response.json();
}

function extractText(payload: unknown): string | null {
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0] as { generated_text?: string };
    return typeof first?.generated_text === "string" ? first.generated_text : null;
  }
  if (typeof payload === "object" && payload !== null && "generated_text" in payload) {
    const value = (payload as { generated_text?: string }).generated_text;
    return typeof value === "string" ? value : null;
  }
  return null;
}

function parseJsonFromText(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("invalid_json");
  }
  const jsonSlice = trimmed.slice(start, end + 1);
  return JSON.parse(jsonSlice);
}

export async function planDashboard(context: LLMPlanContext): Promise<LLMPlanResponse> {
  try {
    const payload = await callHF(buildPlanPrompt(context));
    const text = extractText(payload);
    if (!text) {
      throw new Error("invalid_json");
    }
    const parsed = LLMPlanResponseSchema.safeParse(parseJsonFromText(text));
    if (!parsed.success) {
      throw new Error("invalid_json");
    }
    return parsed.data;
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status === 402 || status === 429 || error instanceof Error) {
      return {
        datasetTopic: "Dataset overview",
        metrics: [],
        dimensions: [],
        charts: buildFallbackCharts(context.datasetMeta),
      };
    }
    throw error;
  }
}

export async function chatActions(context: LLMChatContext): Promise<LLMChatResponse> {
  try {
    const payload = await callHF(buildChatPrompt(context));
    const text = extractText(payload);
    if (!text) {
      throw new Error("invalid_json");
    }
    const parsed = LLMChatResponseSchema.safeParse(parseJsonFromText(text));
    if (!parsed.success) {
      throw new Error("invalid_json");
    }
    return parsed.data;
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status === 402 || status === 429 || error instanceof Error) {
      return {
        assistantMessage:
          "AI suggestions are limited right now, but your dashboard is still up to date.",
        actions: [],
      };
    }
    throw error;
  }
}
