import {
  BI_GENERATION_RULES,
  ChatbotChartPatchSchema,
  type ChatbotChartPatch,
  type ChatKpiValue,
  type ChartConfig,
} from "@tada/shared";
import Groq from "groq-sdk";
import type { Column, DashboardState } from "./types.js";
import { buildColumnPromptStats, validateChartCollection } from "./dashboard-config.js";
import { getDatasetRows, getDatasetState } from "./state.js";

type Row = Record<string, unknown>;

type ChatResponse = {
  assistantMessage: string;
  patch: ChatbotChartPatch | null;
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

function reduceAggregation(values: number[], aggregation: ChartConfig["aggregation"]): number {
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
    return Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/\.00$/, "");
  }
  return String(value);
}

function extractText(payload: unknown): string | null {
  return typeof payload === "string" ? payload : null;
}

function parseLlmResponse(text: string): ChatResponse | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as {
      assistantMessage?: unknown;
      patch?: unknown;
    };
    const patch =
      parsed.patch === null || parsed.patch === undefined
        ? null
        : ChatbotChartPatchSchema.safeParse(parsed.patch).success
          ? (parsed.patch as ChatbotChartPatch)
          : null;

    return {
      assistantMessage:
        typeof parsed.assistantMessage === "string"
          ? parsed.assistantMessage
          : patch
            ? "I prepared a dashboard change."
            : "I could not produce a valid answer.",
      patch,
    };
  } catch {
    return null;
  }
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
    const valueColumn = chart.columns.find((column) => column !== timeColumn) ?? null;
    const series = aggregateByTime(rows, timeColumn, valueColumn, chart.aggregation);
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
  const valueColumn = chart.columns.find((column) => column !== groupColumn) ?? null;
  const series = aggregateByCategory(rows, groupColumn, valueColumn, chart.aggregation);
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

function parseExplicitRemoveCommand(message: string, charts: ChartConfig[]): ChatbotChartPatch | null {
  const match = /^\s*(?:remove|delete)\s+chart\s+(\d+)\s*$/i.exec(message);
  if (!match) {
    return null;
  }
  const chart = charts[Number(match[1]) - 1];
  return chart ? { action: "remove", chartId: chart.id } : null;
}

async function requestChatResponseFromLlm(input: {
  message: string;
  state: DashboardState;
  chartConfigs: ChartConfig[];
  rows: Row[];
  kpis: ChatKpiValue[];
}): Promise<ChatResponse | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.GROQ_CHAT_MODEL;
  if (!model) {
    return null;
  }

  const client = new Groq({ apiKey });
  const columnStats = buildColumnPromptStats(input.rows, input.state.columns);
  const prompt = [
    "Return strict JSON only. No prose outside JSON.",
    `Follow these BI rules exactly: ${BI_GENERATION_RULES.join(" ")}`,
    'Return this schema exactly: {"assistantMessage":"string","patch":{"action":"add","config":{"id":"string","type":"area|bar|donut|scatter|kpi","title":"string","insight":"string","columns":["col"],"aggregation":"sum|avg|count|min|max|null","groupBy":"string|null","timeColumn":"string|null","size":"small|medium|large","visible":true,"order":0,"source":"chatbot","chatbotGenerated":true,"generatedAt":"ISO"}} | {"action":"remove","chartId":"string"} | {"action":"update","chartId":"string","config":{"title":"string?"}} | null}',
    "You are a live dashboard co-pilot.",
    "Handle all user intents in one response:",
    "1. Data questions: answer with specific values grounded in the dataset context below.",
    "2. Dashboard modifications: return a patch that follows the BI rules and uses only provided columns and chart IDs.",
    "3. Insight suggestions: if the user asks what they should look at, return 2 to 3 specific findings with actual values and set patch to null.",
    "4. Chart explanations: explain what a chart means in plain language for a small business owner. Do not use analyst terminology. Mention actual column names and actual values from the dataset context.",
    "If the user is only asking a question or explanation, set patch to null.",
    "If you cannot ground a requested change or answer in the provided context, explain that clearly and set patch to null.",
    JSON.stringify({
      userMessage: input.message,
      rowCount: input.rows.length,
      columns: input.state.columns.map((column) => ({ name: column.name, kind: column.kind })),
      columnStats,
      sampleRows: input.rows.slice(0, 20),
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
        summary: buildChartSummary(chart, input.rows),
      })),
    }),
  ].join("\n");

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      max_completion_tokens: 420,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    const payload = completion.choices[0]?.message?.content ?? null;
    const text = extractText(payload);
    return text ? parseLlmResponse(text) : null;
  } catch {
    return null;
  }
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

function applyPatchToCharts(charts: ChartConfig[], patch: ChatbotChartPatch): ChartConfig[] {
  if (patch.action === "add") {
    return [...charts, patch.config].map((chart, index) => ({ ...chart, order: index }));
  }
  if (patch.action === "remove") {
    return charts
      .filter((chart) => chart.id !== patch.chartId)
      .map((chart, index) => ({ ...chart, order: index }));
  }
  return charts
    .map((chart) =>
      chart.id === patch.chartId
        ? {
            ...chart,
            ...patch.config,
            id: chart.id,
          }
        : chart,
    )
    .map((chart, index) => ({ ...chart, order: index }));
}

function validateChatPatch(
  patch: ChatbotChartPatch | null,
  currentCharts: ChartConfig[],
  columns: Column[],
  rows: Row[],
): { patch: ChatbotChartPatch | null; error: string | null } {
  if (!patch) {
    return { patch: null, error: null };
  }

  const chartIds = new Set(currentCharts.map((chart) => chart.id));

  if (patch.action === "add") {
    const columnError = validatePatchColumns(patch.config, columns);
    if (columnError) {
      return { patch: null, error: columnError };
    }
  } else {
    if (!chartIds.has(patch.chartId)) {
      return { patch: null, error: "That chart no longer exists on the current dashboard." };
    }
    if (patch.action === "update") {
      const currentChart = currentCharts.find((chart) => chart.id === patch.chartId);
      if (!currentChart) {
        return { patch: null, error: "That chart no longer exists on the current dashboard." };
      }
      const columnError = validatePatchColumns(
        {
          type: patch.config.type ?? currentChart.type,
          columns: patch.config.columns ?? currentChart.columns,
          groupBy: patch.config.groupBy === undefined ? currentChart.groupBy : patch.config.groupBy,
          timeColumn:
            patch.config.timeColumn === undefined ? currentChart.timeColumn : patch.config.timeColumn,
        },
        columns,
      );
      if (columnError) {
        return { patch: null, error: columnError };
      }
    }
  }

  const nextCharts = applyPatchToCharts(currentCharts, patch);
  const collectionError = validateChartCollection(nextCharts, columns, rows);
  if (collectionError) {
    return { patch: null, error: collectionError };
  }

  return { patch, error: null };
}

function finalizeChatResponse(
  response: ChatResponse,
  currentCharts: ChartConfig[],
  columns: Column[],
  rows: Row[],
): ChatResponse {
  const validated = validateChatPatch(response.patch, currentCharts, columns, rows);
  if (validated.error) {
    return {
      assistantMessage: `I could not apply that chart change: ${validated.error}`,
      patch: null,
    };
  }
  return {
    assistantMessage: response.assistantMessage,
    patch: validated.patch,
  };
}

export async function handleChat({
  datasetId,
  message,
  chartConfigs,
  kpis,
}: {
  datasetId: string;
  message: string;
  chartConfigs: ChartConfig[];
  kpis: ChatKpiValue[];
}): Promise<ChatResponse> {
  const state = getDatasetState(datasetId);
  if (!state) {
    throw new Error("not_found");
  }
  const rows = getDatasetRows(datasetId);
  if (!rows) {
    throw new Error("missing_rows");
  }

  const explicitRemove = parseExplicitRemoveCommand(message, chartConfigs);
  if (explicitRemove) {
    return finalizeChatResponse(
      {
        assistantMessage: "I prepared a chart removal.",
        patch: explicitRemove,
      },
      chartConfigs,
      state.columns,
      rows,
    );
  }

  const llmResponse = await requestChatResponseFromLlm({
    message,
    state,
    chartConfigs,
    rows,
    kpis,
  });
  if (llmResponse) {
    return finalizeChatResponse(llmResponse, chartConfigs, state.columns, rows);
  }

  return {
    assistantMessage: "I could not produce a grounded answer or a valid chart change from that request.",
    patch: null,
  };
}
