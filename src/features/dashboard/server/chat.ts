import {
  BI_GENERATION_RULES,
  BI_RULE_LIMITS,
  ChatbotChartPatchSchema,
  normalizeChartConfig,
  type ChatChartProposal,
  type ChatbotChartPatch,
  type ChatKpiValue,
  type ChartConfig,
  type DatasetProfile,
} from "@/shared/contracts";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env, getGroqApiKey } from "@/shared/lib/env";
import { jsonCompletion } from "@/shared/lib/ai/groq";
import { retrieveDatasetContext } from "@/features/rag/server/user-data";
import type { Column, DashboardState } from "./types";
import { buildColumnPromptStats, validateChartCollection } from "./config";
import { ensureDatasetContext } from "./context";

type Row = Record<string, unknown>;

type ChatResponse = {
  assistantMessage: string;
  mode: "answer" | "apply_patch" | "proposal";
  patch: ChatbotChartPatch | null;
  proposal: ChatChartProposal | null;
};

type AggregatedPoint = {
  label: string;
  value: number;
};

type ScatterPoint = {
  x: number;
  y: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

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

function toDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Date.parse(value.trim());
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pearsonCorrelation(left: number[], right: number[]): number | null {
  if (left.length !== right.length || left.length < 5) {
    return null;
  }
  const leftMean = mean(left);
  const rightMean = mean(right);
  let numerator = 0;
  let leftDenominator = 0;
  let rightDenominator = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    numerator += leftDelta * rightDelta;
    leftDenominator += leftDelta ** 2;
    rightDenominator += rightDelta ** 2;
  }

  if (leftDenominator === 0 || rightDenominator === 0) {
    return null;
  }

  return numerator / Math.sqrt(leftDenominator * rightDenominator);
}

function reduceAggregation(
  values: number[],
  aggregation: ChartConfig["aggregation"],
): number {
  if (aggregation === "avg") {
    return values.length ? mean(values) : 0;
  }
  if (aggregation === "min") {
    return values.length ? Math.min(...values) : 0;
  }
  if (aggregation === "max") {
    return values.length ? Math.max(...values) : 0;
  }
  if (aggregation === "count" || aggregation === null) {
    return values.length;
  }
  return values.reduce((sum, value) => sum + value, 0);
}

function formatValue(value: string | number | boolean | null): string {
  if (value === null) {
    return "none";
  }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? `${value}`
      : value.toFixed(2).replace(/\.00$/, "");
  }
  return String(value);
}

const LlmChatPayloadSchema = z.object({
  assistantMessage: z.string().optional(),
  patch: z.unknown().optional(),
});

function toChatResponse(
  parsed: z.infer<typeof LlmChatPayloadSchema>,
): ChatResponse {
  const patchResult =
    parsed.patch === null || parsed.patch === undefined
      ? null
      : ChatbotChartPatchSchema.safeParse(parsed.patch);
  const patch = patchResult && patchResult.success ? patchResult.data : null;

  return {
    assistantMessage:
      typeof parsed.assistantMessage === "string" && parsed.assistantMessage
        ? parsed.assistantMessage
        : patch
          ? "I prepared a dashboard change."
          : "I could not produce a valid answer.",
    mode: patch ? "apply_patch" : "answer",
    patch,
    proposal: null,
  };
}

function isChartVisible(chart: ChartConfig): boolean {
  return chart.visibilityState === "visible" && chart.visible;
}

function aggregateByTime(
  rows: Row[],
  timeColumn: string,
  valueColumn: string | null,
  aggregation: ChartConfig["aggregation"],
): AggregatedPoint[] {
  const buckets = new Map<string, number[]>();

  for (const row of rows) {
    const dateValue = toDate(row[timeColumn]);
    if (!dateValue) {
      continue;
    }
    const bucket = dateValue.toISOString().slice(0, 10);
    const values = buckets.get(bucket) ?? [];
    if (valueColumn) {
      const numericValue = toNumber(row[valueColumn]);
      if (numericValue !== null) {
        values.push(numericValue);
      }
    } else {
      values.push(1);
    }
    buckets.set(bucket, values);
  }

  return Array.from(buckets.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([label, values]) => ({
      label,
      value: reduceAggregation(values, valueColumn ? aggregation : "count"),
    }));
}

function aggregateByCategory(
  rows: Row[],
  categoryColumn: string,
  valueColumn: string | null,
  aggregation: ChartConfig["aggregation"],
): AggregatedPoint[] {
  const buckets = new Map<string, number[]>();

  for (const row of rows) {
    const rawGroup = row[categoryColumn];
    if (rawGroup === null || rawGroup === undefined || rawGroup === "") {
      continue;
    }
    const key = String(rawGroup);
    const values = buckets.get(key) ?? [];
    if (valueColumn) {
      const numericValue = toNumber(row[valueColumn]);
      if (numericValue !== null) {
        values.push(numericValue);
      }
    } else {
      values.push(1);
    }
    buckets.set(key, values);
  }

  return Array.from(buckets.entries())
    .map(([label, values]) => ({
      label,
      value: reduceAggregation(values, valueColumn ? aggregation : "count"),
    }))
    .sort((left, right) => right.value - left.value);
}

function buildScatterSeries(chart: ChartConfig, rows: Row[]): ScatterPoint[] {
  const [leftColumn, rightColumn] = chart.columns;
  if (!leftColumn || !rightColumn) {
    return [];
  }
  return rows
    .map((row) => {
      const x = toNumber(row[leftColumn]);
      const y = toNumber(row[rightColumn]);
      return x === null || y === null ? null : { x, y };
    })
    .filter((point): point is ScatterPoint => Boolean(point));
}

function buildChartSummary(chart: ChartConfig, rows: Row[]): string | null {
  if (chart.type === "area") {
    const timeColumn = chart.timeColumn;
    if (!timeColumn) {
      return null;
    }
    const valueColumn =
      chart.columns.find((column) => column !== timeColumn) ?? null;
    const series = aggregateByTime(
      rows,
      timeColumn,
      valueColumn,
      chart.aggregation,
    );
    if (series.length === 0) {
      return null;
    }
    const first = series[0];
    const last = series[series.length - 1];
    const peak = [...series].sort((left, right) => right.value - left.value)[0];
    return `${chart.title} uses ${valueColumn ?? "record count"} and ${timeColumn}. It starts at ${formatValue(first.value)} on ${first.label}, ends at ${formatValue(last.value)} on ${last.label}, and peaks at ${formatValue(peak.value)} on ${peak.label}.`;
  }

  if (chart.type === "scatter") {
    const series = buildScatterSeries(chart, rows);
    if (series.length === 0) {
      return null;
    }
    const correlation = pearsonCorrelation(
      series.map((point) => point.x),
      series.map((point) => point.y),
    );
    const direction =
      correlation === null
        ? "does not show a clear pattern"
        : correlation >= 0
          ? "usually move up together"
          : "usually move in opposite directions";
    return `${chart.title} compares ${chart.columns[0]} with ${chart.columns[1]}. In this data, those two numbers ${direction}.`;
  }

  const groupColumn = chart.groupBy ?? chart.columns.find(Boolean) ?? null;
  if (!groupColumn) {
    return null;
  }
  const valueColumn =
    chart.columns.find((column) => column !== groupColumn) ?? null;
  const series = aggregateByCategory(
    rows,
    groupColumn,
    valueColumn,
    chart.aggregation,
  );
  if (series.length === 0) {
    return null;
  }
  const top = series[0];
  const second = series[1];
  const valueLabel = valueColumn ?? "record count";
  if (second) {
    return `${chart.title} shows ${groupColumn} against ${valueLabel}. ${top.label} is highest at ${formatValue(top.value)}, followed by ${second.label} at ${formatValue(second.value)}.`;
  }
  return `${chart.title} shows ${groupColumn} against ${valueLabel}. ${top.label} is at ${formatValue(top.value)}.`;
}

function parseExplicitRemoveCommand(
  message: string,
  charts: ChartConfig[],
): ChatbotChartPatch | null {
  const match = /^\s*(?:remove|delete)\s+chart\s+(\d+)\s*$/i.exec(message);
  if (!match) {
    return null;
  }
  const chart = charts[Number(match[1]) - 1];
  return chart ? { action: "remove", chartId: chart.id } : null;
}

function filterPiiFromStats(
  stats: Record<string, unknown>,
  profile: DatasetProfile | null,
): Record<string, unknown> {
  if (!profile || profile.piiColumns.length === 0) {
    return stats;
  }
  const piiSet = new Set(profile.piiColumns);
  return Object.fromEntries(
    Object.entries(stats).filter(([name]) => !piiSet.has(name)),
  );
}

async function requestChatResponseFromLlm(input: {
  message: string;
  state: DashboardState;
  chartConfigs: ChartConfig[];
  rows: Row[];
  kpis: ChatKpiValue[];
  retrievedContext: string[];
  profile: DatasetProfile | null;
  topic: string;
  focusChartId?: string;
}): Promise<ChatResponse | null> {
  if (!getGroqApiKey()) {
    return null;
  }

  const columnStats = filterPiiFromStats(
    buildColumnPromptStats(input.rows, input.state.columns),
    input.profile,
  );

  const prompt = [
    "Return strict JSON only. No prose outside JSON.",
    `Follow these BI rules exactly: ${BI_GENERATION_RULES.join(" ")}`,
    'Return this schema exactly: {"assistantMessage":"string","patch":{"action":"add","config":{"id":"string","type":"area|bar|donut|scatter|kpi","title":"string","insight":"string","columns":["col"],"aggregation":"sum|avg|count|min|max|null","groupBy":"string|null","timeColumn":"string|null","size":"small|medium|large","visible":true,"order":0,"source":"chatbot","chatbotGenerated":true,"generatedAt":"ISO"}} | {"action":"remove","chartId":"string"} | {"action":"update","chartId":"string","config":{"title":"string?"}} | null}',
    "You are a live dashboard co-pilot.",
    "IMPORTANT: Reply in the language of the user's message - Hebrew questions get Hebrew answers, English questions get English answers.",
    "Handle all user intents in one response:",
    "1. Data questions: answer with specific values grounded ONLY in the retrieved dataset context below. Do not invent numbers.",
    "2. Dashboard modifications: return a patch that follows the BI rules and uses only provided columns and chart IDs.",
    "3. Insight suggestions: if the user asks what they should look at, return 2 to 3 specific findings with actual values and set patch to null.",
    "4. Chart explanations: explain what a chart means in plain language for a small business owner. Do not use analyst terminology. Mention actual column names and actual values from the dataset context.",
    "5. Trend explanations: when asked why something changed, describe the movement visible in the retrieved context and clearly separate observation from speculation.",
    "If the user is only asking a question or explanation, set patch to null.",
    "If you cannot ground a requested change or answer in the provided context, say so clearly and set patch to null.",
    ...(input.focusChartId
      ? [
          `The user is editing the chart with id=${input.focusChartId}. Return a patch with action "update" and chartId="${input.focusChartId}" applying their requested change; do not add or remove charts.`,
        ]
      : []),
    JSON.stringify({
      userMessage: input.message,
      datasetTopic: input.topic,
      rowCount: input.rows.length,
      columns: input.state.columns.map((column) => ({
        name: column.name,
        kind: column.kind,
      })),
      columnStats,
      retrievedDatasetContext: input.retrievedContext,
      currentKpis: input.kpis,
      currentCharts: input.chartConfigs.map((chart) => ({
        id: chart.id,
        type: chart.type,
        title: chart.title,
        insight: chart.insight,
        columns: chart.columns,
        aggregation: chart.aggregation,
        groupBy: chart.groupBy,
        timeColumn: chart.timeColumn,
        order: chart.order,
        visible: chart.visible,
        pinned: chart.pinned,
        visibilityState: chart.visibilityState,
        summary: buildChartSummary(chart, input.rows),
      })),
    }),
  ].join("\n");

  const parsed = await jsonCompletion(prompt, LlmChatPayloadSchema, {
    model: env.GROQ_CHAT_MODEL,
    temperature: 0.2,
    maxTokens: 700,
  });
  return parsed ? toChatResponse(parsed) : null;
}

function validatePatchColumns(
  config: Pick<ChartConfig, "type" | "columns" | "groupBy" | "timeColumn">,
  columns: Column[],
): string | null {
  const columnNames = new Set(columns.map((column) => column.name));
  if (config.type === "kpi") {
    return "KPI chart patches are not supported in this dashboard.";
  }
  if (config.columns.some((column) => !columnNames.has(column))) {
    return "The requested chart uses a column that is not in this dataset.";
  }
  if (config.groupBy && !columnNames.has(config.groupBy)) {
    return `The requested group column "${config.groupBy}" is not in this dataset.`;
  }
  if (config.timeColumn && !columnNames.has(config.timeColumn)) {
    return `The requested time column "${config.timeColumn}" is not in this dataset.`;
  }
  return null;
}

function applyPatchToCharts(
  charts: ChartConfig[],
  patch: ChatbotChartPatch,
): ChartConfig[] {
  if (patch.action === "add") {
    const nextCharts = [...charts, normalizeChartConfig(patch.config)];
    const visibleCharts = nextCharts.filter(isChartVisible);
    const hiddenCharts = nextCharts.filter((chart) => !isChartVisible(chart));
    return [...visibleCharts, ...hiddenCharts].map((chart, index) =>
      normalizeChartConfig({ ...chart, order: index }),
    );
  }
  if (patch.action === "remove") {
    return charts
      .filter((chart) => chart.id !== patch.chartId)
      .map((chart, index) => normalizeChartConfig({ ...chart, order: index }));
  }
  return charts
    .map((chart) =>
      chart.id === patch.chartId
        ? normalizeChartConfig({
            ...chart,
            ...patch.config,
            id: chart.id,
          })
        : chart,
    )
    .map((chart, index) => normalizeChartConfig({ ...chart, order: index }));
}

function pickReplacementChart(
  charts: ChartConfig[],
  nextType: ChartConfig["type"],
): ChartConfig | null {
  const replaceable = [...charts]
    .filter(
      (chart) => isChartVisible(chart) && chart.order !== 0 && !chart.pinned,
    )
    .sort((left, right) => right.order - left.order);

  return (
    replaceable.find(
      (chart) => chart.type === nextType && chart.chatbotGenerated,
    ) ??
    replaceable.find((chart) => chart.type === nextType) ??
    replaceable.find((chart) => chart.chatbotGenerated) ??
    replaceable[0] ??
    null
  );
}

function buildReplacementProposal(
  incomingConfig: ChartConfig,
  currentCharts: ChartConfig[],
): ChatChartProposal | null {
  const replacementChart = pickReplacementChart(
    currentCharts,
    incomingConfig.type,
  );
  if (!replacementChart) {
    return null;
  }

  return {
    type: "replace_chart",
    targetChartId: replacementChart.id,
    targetChartTitle: replacementChart.title,
    incomingConfig: normalizeChartConfig({
      ...incomingConfig,
      order: replacementChart.order,
      priority: replacementChart.priority,
    }),
    reason: `I can add that view by replacing ${replacementChart.title}.`,
  };
}

function normalizeIncomingChatChart(
  config: ChartConfig,
  currentCharts: ChartConfig[],
): ChartConfig {
  const visibleCharts = currentCharts.filter(isChartVisible);
  return normalizeChartConfig({
    ...config,
    // Chatbot-added charts never take the hero (xlarge) slot;
    // normalizeChartConfig clamps to the type's supported size classes.
    size: config.size === "xlarge" ? "large" : config.size,
    visible: true,
    pinned: false,
    priority: visibleCharts.length,
    lastTouchedBy: "chatbot",
    visibilityState: "visible",
  });
}

function validateChatPatch(
  patch: ChatbotChartPatch | null,
  currentCharts: ChartConfig[],
  columns: Column[],
  rows: Row[],
): {
  patch: ChatbotChartPatch | null;
  error: string | null;
  proposal: ChatChartProposal | null;
} {
  if (!patch) {
    return { patch: null, error: null, proposal: null };
  }

  const chartIds = new Set(currentCharts.map((chart) => chart.id));
  const nextPatch =
    patch.action === "add"
      ? {
          action: "add" as const,
          config: normalizeIncomingChatChart(patch.config, currentCharts),
        }
      : patch;

  if (nextPatch.action === "add") {
    const columnError = validatePatchColumns(nextPatch.config, columns);
    if (columnError) {
      return { patch: null, error: columnError, proposal: null };
    }

    if (
      currentCharts.filter(isChartVisible).length >= BI_RULE_LIMITS.maxCharts ||
      currentCharts.length >= BI_RULE_LIMITS.maxSavedCharts
    ) {
      const proposal = buildReplacementProposal(
        nextPatch.config,
        currentCharts,
      );
      if (proposal) {
        return { patch: null, error: null, proposal };
      }
      return {
        patch: null,
        error:
          "Your dashboard is already full. I can only replace an unpinned chart.",
        proposal: null,
      };
    }
  } else {
    if (!chartIds.has(nextPatch.chartId)) {
      return {
        patch: null,
        error: "That chart no longer exists on the current dashboard.",
        proposal: null,
      };
    }
    if (nextPatch.action === "update") {
      const currentChart = currentCharts.find(
        (chart) => chart.id === nextPatch.chartId,
      );
      if (!currentChart) {
        return {
          patch: null,
          error: "That chart no longer exists on the current dashboard.",
          proposal: null,
        };
      }
      const columnError = validatePatchColumns(
        {
          type: nextPatch.config.type ?? currentChart.type,
          columns: nextPatch.config.columns ?? currentChart.columns,
          groupBy:
            nextPatch.config.groupBy === undefined
              ? currentChart.groupBy
              : nextPatch.config.groupBy,
          timeColumn:
            nextPatch.config.timeColumn === undefined
              ? currentChart.timeColumn
              : nextPatch.config.timeColumn,
        },
        columns,
      );
      if (columnError) {
        return { patch: null, error: columnError, proposal: null };
      }
    }
  }

  const nextCharts = applyPatchToCharts(currentCharts, nextPatch);
  const collectionError = validateChartCollection(nextCharts, columns, rows);
  if (collectionError) {
    return { patch: null, error: collectionError, proposal: null };
  }

  return {
    patch: nextPatch,
    error: null,
    proposal: null,
  };
}

function finalizeChatResponse(
  response: ChatResponse,
  currentCharts: ChartConfig[],
  columns: Column[],
  rows: Row[],
): ChatResponse {
  const validated = validateChatPatch(
    response.patch,
    currentCharts,
    columns,
    rows,
  );
  if (validated.error) {
    return {
      assistantMessage: `I could not apply that chart change: ${validated.error}`,
      mode: "answer",
      patch: null,
      proposal: null,
    };
  }
  if (validated.proposal) {
    return {
      assistantMessage: validated.proposal.reason,
      mode: "proposal",
      patch: null,
      proposal: validated.proposal,
    };
  }
  return {
    assistantMessage: response.assistantMessage,
    mode: response.patch ? "apply_patch" : "answer",
    patch: validated.patch,
    proposal: null,
  };
}

export async function handleChat({
  supabase,
  datasetId,
  message,
  chartConfigs,
  kpis,
  focusChartId,
}: {
  supabase: SupabaseClient;
  datasetId: string;
  message: string;
  chartConfigs: ChartConfig[];
  kpis: ChatKpiValue[];
  focusChartId?: string;
}): Promise<ChatResponse> {
  const context = await ensureDatasetContext(supabase, datasetId);
  if (!context) {
    throw new Error("not_found");
  }
  const { state, rows, profile, topic } = context;

  const explicitRemove = parseExplicitRemoveCommand(message, chartConfigs);
  if (explicitRemove) {
    return finalizeChatResponse(
      {
        assistantMessage: "I prepared a chart removal.",
        mode: "apply_patch",
        patch: explicitRemove,
        proposal: null,
      },
      chartConfigs,
      state.columns,
      rows,
    );
  }

  // Ground the answer in the per-user data RAG instead of re-shipping raw
  // rows on every turn. Retrieval is cached per (dataset, question).
  const retrievedChunks = await retrieveDatasetContext(
    supabase,
    datasetId,
    message,
  );
  const retrievedContext = retrievedChunks.map((chunk) => chunk.content);

  const llmResponse = await requestChatResponseFromLlm({
    message,
    state,
    chartConfigs,
    rows,
    kpis,
    retrievedContext,
    profile,
    topic,
    focusChartId,
  });
  if (llmResponse) {
    return finalizeChatResponse(llmResponse, chartConfigs, state.columns, rows);
  }

  return {
    assistantMessage:
      "I could not produce a grounded answer or a valid chart change from that request.",
    mode: "answer",
    patch: null,
    proposal: null,
  };
}
