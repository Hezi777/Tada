import type { Column, DashboardState } from "./types";
import { buildCharts } from "./charts";
import { inferColumns } from "./infer";
import { buildKpis } from "./kpis";
import { getDatasetRows, getDatasetState, updateDatasetState } from "./state";

type Row = Record<string, unknown>;

type ParsedIntent = {
  intent: string;
  column?: string;
};

type InsightContext = {
  rowCount: number;
  columnCount: number;
  kpis: Array<{ label: string; value: string | number }>;
  chartTitles: string[];
};

const HF_API_URL = "https://api-inference.huggingface.co/models";

async function callLLM(message: string, columns: Column[]): Promise<ParsedIntent> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) {
    throw new Error("missing_api_key");
  }
  const model = process.env.HF_MODEL || "HuggingFaceH4/zephyr-7b-beta";
  const prompt = [
    "Return strict JSON only. No prose.",
    'Allowed intents: "hide chart <n>", "show chart <n>", "set metric <column>", "set category <column>", "set time <column>", "reset".',
    "Use the provided column names when setting metric/category/time.",
    JSON.stringify({
      columns: columns.map((column) => ({ name: column.name, kind: column.kind })),
      message,
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
      parameters: {
        max_new_tokens: 120,
        temperature: 0.2,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`llm_error_${response.status}`);
  }
  const payload = (await response.json()) as unknown;
  const text = extractText(payload);
  if (!text) {
    throw new Error("invalid_json");
  }
  const parsed = parseJsonFromText(text);
  if (!parsed || typeof parsed.intent !== "string") {
    throw new Error("invalid_json");
  }
  return parsed;
}

async function callInsights(context: InsightContext): Promise<string> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) {
    throw new Error("missing_api_key");
  }
  const model = process.env.HF_MODEL || "HuggingFaceH4/zephyr-7b-beta";
  const prompt = [
    "Return natural language insights only. No JSON. No bullets. No actions or recommendations.",
    "Use only KPI values, chart titles, and dataset size info.",
    "Do not mention missing data or limitations.",
    JSON.stringify(context),
  ].join("\n");
  const response = await fetch(`${HF_API_URL}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 120,
        temperature: 0.2,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`llm_error_${response.status}`);
  }
  const payload = (await response.json()) as unknown;
  const text = extractText(payload);
  if (!text) {
    throw new Error("invalid_text");
  }
  return text.trim();
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

function parseJsonFromText(text: string): ParsedIntent | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as ParsedIntent;
  } catch {
    return null;
  }
}

function parseIntentFallback(message: string): ParsedIntent | null {
  const lower = message.toLowerCase();
  if (/\breset\b/.test(lower)) {
    return { intent: "reset" };
  }
  const chartMatch = /\b(hide|show)\s+chart\s*(\d+)\b/i.exec(message);
  if (chartMatch) {
    const action = chartMatch[1].toLowerCase();
    const index = chartMatch[2];
    return { intent: `${action} chart ${index}` };
  }
  const metricMatch = /\bset\s+metric\s+(.+)/i.exec(message);
  if (metricMatch) {
    return { intent: "set metric", column: metricMatch[1].trim() };
  }
  const categoryMatch = /\bset\s+category\s+(.+)/i.exec(message);
  if (categoryMatch) {
    return { intent: "set category", column: categoryMatch[1].trim() };
  }
  const timeMatch = /\bset\s+time\s+(.+)/i.exec(message);
  if (timeMatch) {
    return { intent: "set time", column: timeMatch[1].trim() };
  }
  return null;
}

function resolveColumn(columns: Column[], name: string, kind: Column["kind"]): Column | null {
  const lower = name.toLowerCase();
  const match = columns.find((column) => column.name.toLowerCase() === lower && column.kind === kind);
  return match ?? null;
}

function extractColumnFromIntent(intentText: string, prefix: string): string | null {
  if (!intentText.startsWith(prefix)) {
    return null;
  }
  const remainder = intentText.slice(prefix.length).trim();
  return remainder ? remainder : null;
}

function moveColumnToFront(columns: Column[], target: Column): Column[] {
  return [target, ...columns.filter((column) => column.name !== target.name)];
}

function rebuildState(
  state: DashboardState,
  rows: Row[],
  columns: Column[],
  resetHidden: boolean,
): DashboardState {
  const kpis = buildKpis(rows, columns);
  const charts = buildCharts(rows, columns);
  return {
    ...state,
    columns,
    kpis,
    charts,
    hiddenChartIds: resetHidden ? [] : state.hiddenChartIds,
  };
}

function applyHideShow(
  state: DashboardState,
  chartIndex: number,
  hide: boolean,
): DashboardState | null {
  const chart = state.charts[chartIndex - 1];
  if (!chart) {
    return null;
  }
  const hidden = new Set(state.hiddenChartIds);
  if (hide) {
    hidden.add(chart.id);
  } else {
    hidden.delete(chart.id);
  }
  return {
    ...state,
    hiddenChartIds: Array.from(hidden),
  };
}

export async function handleChat({
  datasetId,
  message,
}: {
  datasetId: string;
  message: string;
}): Promise<{ assistantMessage: string; dashboardState: DashboardState }> {
  const state = getDatasetState(datasetId);
  if (!state) {
    throw new Error("not_found");
  }
  const rows = getDatasetRows(datasetId);
  if (!rows) {
    throw new Error("missing_rows");
  }

  let intent: ParsedIntent | null = null;
  try {
    intent = await callLLM(message, state.columns);
  } catch {
    intent = parseIntentFallback(message);
  }
  if (!intent) {
    throw new Error("invalid_intent");
  }

  const intentText = intent.intent.toLowerCase();
  let updatedState: DashboardState | null = null;

  if (intentText.startsWith("hide chart")) {
    const match = /\d+/.exec(intentText);
    const chartIndex = match ? Number(match[0]) : NaN;
    if (!Number.isInteger(chartIndex) || chartIndex < 1 || chartIndex > 4) {
      throw new Error("invalid_chart");
    }
    updatedState = updateDatasetState(datasetId, (current) => {
      const next = applyHideShow(current, chartIndex, true);
      if (!next) {
        throw new Error("invalid_chart");
      }
      return next;
    });
  }

  if (!updatedState && intentText.startsWith("show chart")) {
    const match = /\d+/.exec(intentText);
    const chartIndex = match ? Number(match[0]) : NaN;
    if (!Number.isInteger(chartIndex) || chartIndex < 1 || chartIndex > 4) {
      throw new Error("invalid_chart");
    }
    updatedState = updateDatasetState(datasetId, (current) => {
      const next = applyHideShow(current, chartIndex, false);
      if (!next) {
        throw new Error("invalid_chart");
      }
      return next;
    });
  }

  if (!updatedState && intentText.startsWith("set metric")) {
    const columnName = intent.column ?? extractColumnFromIntent(intentText, "set metric");
    if (!columnName) {
      throw new Error("missing_column");
    }
    const target = resolveColumn(state.columns, columnName, "numeric");
    if (!target) {
      throw new Error("invalid_column");
    }
    updatedState = updateDatasetState(datasetId, (current) => {
      const columns = moveColumnToFront(current.columns, target);
      return rebuildState(current, rows, columns, false);
    });
  }

  if (!updatedState && intentText.startsWith("set category")) {
    const columnName = intent.column ?? extractColumnFromIntent(intentText, "set category");
    if (!columnName) {
      throw new Error("missing_column");
    }
    const target = resolveColumn(state.columns, columnName, "categorical");
    if (!target) {
      throw new Error("invalid_column");
    }
    updatedState = updateDatasetState(datasetId, (current) => {
      const columns = moveColumnToFront(current.columns, target);
      return rebuildState(current, rows, columns, false);
    });
  }

  if (!updatedState && intentText.startsWith("set time")) {
    const columnName = intent.column ?? extractColumnFromIntent(intentText, "set time");
    if (!columnName) {
      throw new Error("missing_column");
    }
    const target = resolveColumn(state.columns, columnName, "date");
    if (!target) {
      throw new Error("invalid_column");
    }
    updatedState = updateDatasetState(datasetId, (current) => {
      const columns = moveColumnToFront(current.columns, target);
      return rebuildState(current, rows, columns, false);
    });
  }

  if (!updatedState && intentText === "reset") {
    updatedState = updateDatasetState(datasetId, (current) => {
      const columns = inferColumns(rows);
      return rebuildState(current, rows, columns, true);
    });
  }

  if (!updatedState) {
    throw new Error("invalid_intent");
  }

  const insightContext: InsightContext = {
    rowCount: rows.length,
    columnCount: updatedState.columns.length,
    kpis: updatedState.kpis.map((kpi) => ({ label: kpi.label, value: kpi.value })),
    chartTitles: updatedState.charts.map((chart) => chart.title),
  };

  let assistantMessage = "Insights are not available right now.";
  try {
    assistantMessage = await callInsights(insightContext);
  } catch {
    assistantMessage = "Insights are not available right now.";
  }

  return { assistantMessage, dashboardState: updatedState };
}
