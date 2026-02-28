import {
  BI_GENERATION_RULES,
  ChatbotChartPatchSchema,
  type ChatbotChartPatch,
  type ChartConfig,
} from "@tada/shared";
import type { Column, DashboardState } from "./types.js";
import { getDatasetRows, getDatasetState } from "./state.js";

type Row = Record<string, unknown>;

const HF_API_URL = "https://api-inference.huggingface.co/models";

function nowIso(): string {
  return new Date().toISOString();
}

function nextChartId(charts: ChartConfig[]): string {
  return `chart_${String(charts.length + 1).padStart(2, "0")}`;
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

function findColumnByInput(columns: Column[], input: string): Column | null {
  const lower = input.toLowerCase();
  const exact = columns.find((column) => column.name.toLowerCase() === lower);
  if (exact) {
    return exact;
  }
  const partial = columns.find((column) => lower.includes(column.name.toLowerCase()));
  return partial ?? null;
}

function findChartByRef(charts: ChartConfig[], message: string): ChartConfig | null {
  const indexMatch = /\bchart\s*(\d+)\b/i.exec(message);
  if (indexMatch) {
    const index = Number(indexMatch[1]) - 1;
    return charts[index] ?? null;
  }
  const lower = message.toLowerCase();
  return charts.find((chart) => lower.includes(chart.title.toLowerCase())) ?? null;
}

function extractRequestedType(message: string): ChartConfig["type"] | null {
  if (/\barea\b/i.test(message)) {
    return "area";
  }
  if (/\bbar\b/i.test(message)) {
    return "bar";
  }
  if (/\bdonut\b/i.test(message)) {
    return "donut";
  }
  if (/\bscatter\b/i.test(message)) {
    return "scatter";
  }
  if (/\bkpi\b/i.test(message)) {
    return "kpi";
  }
  return null;
}

function pickPrimaryColumn(columns: Column[], kind: Column["kind"]): Column | null {
  return columns.find((column) => column.kind === kind) ?? null;
}

function buildChartConfigTemplate(
  type: Exclude<ChartConfig["type"], "kpi">,
  columns: Column[],
  currentCharts: ChartConfig[],
  message: string,
): ChartConfig | null {
  const categoryColumn = pickPrimaryColumn(columns, "categorical");
  const numericColumn = pickPrimaryColumn(columns, "numeric");
  const dateColumn = pickPrimaryColumn(columns, "date");
  const ofByMatch = /\bof\s+(.+?)\s+by\s+(.+)\b/i.exec(message);
  const ofMatch = /\bof\s+(.+?)(?:\s+by|\s*$)/i.exec(message);
  const byMatch = /\bby\s+(.+)\b/i.exec(message);
  const requestedMetric = ofByMatch?.[1] ?? ofMatch?.[1] ?? "";
  const requestedGroup = ofByMatch?.[2] ?? byMatch?.[1] ?? "";
  const metricColumn = findColumnByInput(columns, requestedMetric) ?? numericColumn;
  const groupColumn = findColumnByInput(columns, requestedGroup) ?? categoryColumn;

  if (type === "area") {
    const timeColumn = dateColumn;
    if (!timeColumn) {
      return null;
    }
    const metricLabel = metricColumn?.kind === "numeric" ? metricColumn.name : "record count";
    return {
      id: nextChartId(currentCharts),
      type,
      title: metricColumn?.kind === "numeric" ? `${metricColumn.name} over time` : `Records over time`,
      insight: `${metricLabel} is tracked across ${timeColumn.name}.`,
      columns: metricColumn?.kind === "numeric" ? [metricColumn.name, timeColumn.name] : [timeColumn.name],
      aggregation: metricColumn?.kind === "numeric" ? "sum" : "count",
      groupBy: null,
      timeColumn: timeColumn.name,
      size: "large",
      visible: true,
      order: currentCharts.length,
      source: "chatbot",
      chatbotGenerated: true,
      generatedAt: nowIso(),
    };
  }

  if (type === "scatter") {
    const numericColumns = columns.filter((column) => column.kind === "numeric");
    const left = metricColumn?.kind === "numeric" ? metricColumn : numericColumns[0] ?? null;
    const right = numericColumns.find((column) => column.name !== left?.name) ?? null;
    if (!left || !right) {
      return null;
    }
    return {
      id: nextChartId(currentCharts),
      type,
      title: `${left.name} vs ${right.name}`,
      insight: `${left.name} is compared directly against ${right.name}.`,
      columns: [left.name, right.name],
      aggregation: null,
      groupBy: null,
      timeColumn: null,
      size: "medium",
      visible: true,
      order: currentCharts.length,
      source: "chatbot",
      chatbotGenerated: true,
      generatedAt: nowIso(),
    };
  }

  if (!groupColumn) {
    return null;
  }

  const aggregation = metricColumn?.kind === "numeric" ? "sum" : "count";
  const metricLabel = metricColumn?.kind === "numeric" ? metricColumn.name : "record count";
  return {
    id: nextChartId(currentCharts),
    type,
    title:
      metricColumn?.kind === "numeric"
        ? `${metricColumn.name} by ${groupColumn.name}`
        : `Records by ${groupColumn.name}`,
    insight: `${groupColumn.name} segments ${metricLabel}.`,
    columns: metricColumn?.kind === "numeric" ? [metricColumn.name, groupColumn.name] : [groupColumn.name],
    aggregation,
    groupBy: groupColumn.name,
    timeColumn: null,
    size: type === "donut" ? "small" : "medium",
    visible: true,
    order: currentCharts.length,
    source: "chatbot",
    chatbotGenerated: true,
    generatedAt: nowIso(),
  };
}

function parseRulePatch(message: string, charts: ChartConfig[], columns: Column[]): ChatbotChartPatch | null {
  const lower = message.toLowerCase();

  if (lower.includes("remove") || lower.includes("delete")) {
    const chart = findChartByRef(charts, message);
    return chart ? { action: "remove", chartId: chart.id } : null;
  }

  if (lower.includes("add") || lower.includes("create") || lower.includes("make")) {
    const requestedType = extractRequestedType(message);
    if (!requestedType || requestedType === "kpi") {
      return null;
    }
    const config = buildChartConfigTemplate(requestedType, columns, charts, message);
    return config ? { action: "add", config } : null;
  }

  if (lower.includes("update") || lower.includes("change") || lower.includes("switch")) {
    const chart = findChartByRef(charts, message);
    if (!chart) {
      return null;
    }
    const nextType = extractRequestedType(message);
    if (nextType && nextType !== "kpi") {
      const replacement = buildChartConfigTemplate(nextType, columns, charts, message);
      if (!replacement) {
        return null;
      }
      return {
        action: "update",
        chartId: chart.id,
        config: {
          type: replacement.type,
          title: replacement.title,
          insight: replacement.insight,
          columns: replacement.columns,
          aggregation: replacement.aggregation,
          groupBy: replacement.groupBy,
          timeColumn: replacement.timeColumn,
          size: replacement.size,
          source: "chatbot",
          chatbotGenerated: true,
          generatedAt: nowIso(),
        },
      };
    }

    return {
      action: "update",
      chartId: chart.id,
      config: {
        title: `${chart.title} (updated)`,
        insight: chart.insight,
        source: "chatbot",
        chatbotGenerated: true,
        generatedAt: nowIso(),
      },
    };
  }

  return null;
}

function extractText(payload: unknown): string | null {
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0] as { generated_text?: string };
    return typeof first?.generated_text === "string" ? first.generated_text : null;
  }
  if (typeof payload === "object" && payload !== null && "generated_text" in payload) {
    const generatedText = (payload as { generated_text?: string }).generated_text;
    return typeof generatedText === "string" ? generatedText : null;
  }
  return null;
}

function parseLlmPatch(text: string): { assistantMessage: string; patch: ChatbotChartPatch | null } | null {
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
            ? "I prepared a chart change."
            : "I did not detect a valid chart change.",
      patch,
    };
  } catch {
    return null;
  }
}

async function requestPatchFromLlm(
  message: string,
  state: DashboardState,
  chartConfigs: ChartConfig[],
): Promise<{ assistantMessage: string; patch: ChatbotChartPatch | null } | null> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.HF_MODEL || "HuggingFaceH4/zephyr-7b-beta";
  const prompt = [
    "Return strict JSON only. No prose outside JSON.",
    `Follow these rules exactly: ${BI_GENERATION_RULES.join(" ")}`,
    'Schema: {"assistantMessage":"string","patch":{"action":"add","config":{"id":"string","type":"area|bar|donut|scatter|kpi","title":"string","insight":"string","columns":["col"],"aggregation":"sum|avg|count|min|max|null","groupBy":"string|null","timeColumn":"string|null","size":"small|medium|large","visible":true,"order":0,"source":"chatbot","chatbotGenerated":true,"generatedAt":"ISO"}} | {"action":"remove","chartId":"string"} | {"action":"update","chartId":"string","config":{"title":"string?"}} | null}',
    "Use only provided columns and current chart IDs.",
    JSON.stringify({
      message,
      columns: state.columns.map((column) => ({ name: column.name, kind: column.kind })),
      sampleRows: state.datasetMeta?.sampleRows ?? [],
      charts: chartConfigs.map((chart) => ({
        id: chart.id,
        type: chart.type,
        title: chart.title,
        insight: chart.insight,
        columns: chart.columns,
        aggregation: chart.aggregation,
        groupBy: chart.groupBy,
        timeColumn: chart.timeColumn,
        order: chart.order,
      })),
    }),
  ].join("\n");

  const response = await fetch(`${HF_API_URL}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      options: { wait_for_model: true },
      parameters: {
        max_new_tokens: 420,
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as unknown;
  const text = extractText(payload);
  return text ? parseLlmPatch(text) : null;
}

function buildFallbackAssistantMessage(patch: ChatbotChartPatch | null): string {
  if (!patch) {
    return "I could not map that request to a valid chart change.";
  }
  if (patch.action === "add") {
    return `I prepared a new ${patch.config.type} chart for the dashboard.`;
  }
  if (patch.action === "remove") {
    return "I prepared a chart removal.";
  }
  return "I prepared an update to the selected chart.";
}

function validatePatchColumns(
  config: Pick<ChartConfig, "type" | "columns" | "groupBy" | "timeColumn">,
  columns: Column[],
): boolean {
  const columnNames = new Set(columns.map((column) => column.name));
  if (config.type === "kpi") {
    return false;
  }
  if (config.columns.some((column) => !columnNames.has(column))) {
    return false;
  }
  if (config.groupBy && !columnNames.has(config.groupBy)) {
    return false;
  }
  if (config.timeColumn && !columnNames.has(config.timeColumn)) {
    return false;
  }
  return true;
}

function validateChatPatch(
  patch: ChatbotChartPatch | null,
  currentCharts: ChartConfig[],
  columns: Column[],
): ChatbotChartPatch | null {
  if (!patch) {
    return null;
  }

  const chartIds = new Set(currentCharts.map((chart) => chart.id));

  if (patch.action === "add") {
    return validatePatchColumns(patch.config, columns) ? patch : null;
  }

  if (!chartIds.has(patch.chartId)) {
    return null;
  }

  if (patch.action === "remove") {
    return patch;
  }

  const currentChart = currentCharts.find((chart) => chart.id === patch.chartId);
  if (!currentChart) {
    return null;
  }

  const nextType = patch.config.type ?? currentChart.type;
  const nextColumns = patch.config.columns ?? currentChart.columns;
  const nextGroupBy =
    patch.config.groupBy === undefined ? currentChart.groupBy : patch.config.groupBy;
  const nextTimeColumn =
    patch.config.timeColumn === undefined ? currentChart.timeColumn : patch.config.timeColumn;

  return validatePatchColumns(
    {
      type: nextType,
      columns: nextColumns,
      groupBy: nextGroupBy,
      timeColumn: nextTimeColumn,
    },
    columns,
  )
    ? patch
    : null;
}

function finalizeChatResponse(
  response: { assistantMessage: string; patch: ChatbotChartPatch | null },
  currentCharts: ChartConfig[],
  columns: Column[],
): { assistantMessage: string; patch: ChatbotChartPatch | null } {
  const patch = validateChatPatch(response.patch, currentCharts, columns);
  if (response.patch && !patch) {
    return {
      assistantMessage: "I could not prepare a valid chart change from that request.",
      patch: null,
    };
  }
  return {
    assistantMessage: response.assistantMessage,
    patch,
  };
}

export async function handleChat({
  datasetId,
  message,
  chartConfigs,
}: {
  datasetId: string;
  message: string;
  chartConfigs: ChartConfig[];
}): Promise<{
  assistantMessage: string;
  patch: ChatbotChartPatch | null;
}> {
  const state = getDatasetState(datasetId);
  if (!state) {
    throw new Error("not_found");
  }
  const rows = getDatasetRows(datasetId);
  if (!rows) {
    throw new Error("missing_rows");
  }
  void rows;

  const rulePatch = parseRulePatch(message, chartConfigs, state.columns);
  if (rulePatch) {
    const validatedRulePatch = finalizeChatResponse(
      {
        assistantMessage: buildFallbackAssistantMessage(rulePatch),
        patch: rulePatch,
      },
      chartConfigs,
      state.columns,
    );
    return validatedRulePatch;
  }

  const llmResponse = await requestPatchFromLlm(message, state, chartConfigs);
  if (llmResponse) {
    return finalizeChatResponse(llmResponse, chartConfigs, state.columns);
  }

  return {
    assistantMessage: "I could not prepare a chart change from that request.",
    patch: null,
  };
}
