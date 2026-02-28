import type { ChartType, Column, DashboardState } from "./types";
import { buildChartFromSpec, buildCharts } from "./charts";
import { inferColumns, pickPrimaryColumns } from "./infer";
import { buildKpis } from "./kpis";
import { getDatasetRows, getDatasetState, updateDatasetState } from "./state";

type Row = Record<string, unknown>;

type ChartIntent = {
  type: ChartType;
  x?: string;
  y?: string;
  title?: string;
  aggregation?: "sum" | "avg" | "count";
};

type ChatAction =
  | { type: "add_chart"; chart: ChartIntent }
  | { type: "remove_chart"; chartId: string }
  | { type: "update_chart"; chartId: string; patch: Partial<ChartIntent> }
  | { type: "show_chart"; chartId: string }
  | { type: "hide_chart"; chartId: string }
  | { type: "reset" };

type InsightContext = {
  rowCount: number;
  columnCount: number;
  kpis: Array<{ label: string; value: string | number }>;
  chartTitles: string[];
  chartHighlights: string[];
};

type LlmDebug = {
  status?: number;
  body?: string;
  error?: string;
};

const HF_API_URL = "https://api-inference.huggingface.co/models";

function getEnvFlag(name: string): boolean {
  const value = process.env[name];
  if (!value) {
    return false;
  }
  return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}

async function callLLM(message: string, state: DashboardState): Promise<ChatAction[]> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) {
    throw new Error("missing_api_key");
  }
  const model = process.env.HF_MODEL || "HuggingFaceH4/zephyr-7b-beta";
  const prompt = [
    "Return strict JSON only. No prose.",
    'Schema: {"actions":[{"type":"add_chart","chart":{"type":"line|bar|pie|table","x":"column?","y":"column?","title":"string?","aggregation":"sum|avg|count?"}} | {"type":"remove_chart","chartId":"id"} | {"type":"update_chart","chartId":"id","patch":{"type":"line|bar|pie|table?","x":"column?","y":"column?","title":"string?","aggregation":"sum|avg|count?"}} | {"type":"show_chart","chartId":"id"} | {"type":"hide_chart","chartId":"id"} | {"type":"reset"}]}',
    "Use only provided column names. If no chart changes are needed, return an empty actions array.",
    JSON.stringify({
      message,
      columns: state.columns.map((column) => ({ name: column.name, kind: column.kind })),
      charts: state.charts.map((chart) => ({
        id: chart.id,
        title: chart.title,
        type: chart.type,
        x: chart.config?.x ?? null,
        y: chart.config?.y ?? null,
      })),
      hiddenChartIds: state.hiddenChartIds,
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
      options: {
        wait_for_model: true,
      },
      parameters: {
        max_new_tokens: 220,
        temperature: 0.2,
      },
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = new Error(`llm_error_${response.status}`);
    (error as { llmStatus?: number }).llmStatus = response.status;
    (error as { llmBody?: string }).llmBody = body.slice(0, 800);
    throw error;
  }
  const payload = (await response.json()) as unknown;
  const text = extractText(payload);
  if (!text) {
    throw new Error("invalid_json");
  }
  const parsed = parseJsonFromText(text);
  if (!parsed) {
    throw new Error("invalid_json");
  }
  return normalizeActions(parsed);
}

async function callInsights(context: InsightContext): Promise<string> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) {
    throw new Error("missing_api_key");
  }
  const model = process.env.HF_MODEL || "HuggingFaceH4/zephyr-7b-beta";
  const prompt = [
    "Return 2-3 short sentences. No JSON. No bullets. No actions or recommendations.",
    "Be concise, plain language, and friendly.",
    "Use only KPI values, chart titles, and dataset size info.",
    "Do not mention missing data or limitations.",
    'Example: "Your dataset has 15,266 rows across 10 columns. The most common category is Male. Activity trends upward over time."',
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
      options: {
        wait_for_model: true,
      },
      parameters: {
        max_new_tokens: 120,
        temperature: 0.2,
      },
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = new Error(`llm_error_${response.status}`);
    (error as { llmStatus?: number }).llmStatus = response.status;
    (error as { llmBody?: string }).llmBody = body.slice(0, 800);
    throw error;
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

function parseJsonFromText(text: string): { actions: unknown[] } | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as { actions: unknown[] };
  } catch {
    return null;
  }
}

function normalizeChartType(value: unknown): ChartType | null {
  if (value === "bar" || value === "line" || value === "pie" || value === "table") {
    return value;
  }
  return null;
}

function normalizeChartIntent(input: unknown): ChartIntent | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const chart = input as {
    type?: unknown;
    x?: unknown;
    y?: unknown;
    title?: unknown;
    aggregation?: unknown;
  };
  const type = normalizeChartType(chart.type);
  if (!type) {
    return null;
  }
  const aggregation =
    chart.aggregation === "sum" || chart.aggregation === "avg" || chart.aggregation === "count"
      ? chart.aggregation
      : undefined;
  return {
    type,
    x: typeof chart.x === "string" ? chart.x : undefined,
    y: typeof chart.y === "string" ? chart.y : undefined,
    title: typeof chart.title === "string" ? chart.title : undefined,
    aggregation,
  };
}

function normalizeChartPatch(input: unknown): Partial<ChartIntent> | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const patch = input as {
    type?: unknown;
    x?: unknown;
    y?: unknown;
    title?: unknown;
    aggregation?: unknown;
  };
  const type = normalizeChartType(patch.type);
  const aggregation =
    patch.aggregation === "sum" || patch.aggregation === "avg" || patch.aggregation === "count"
      ? patch.aggregation
      : undefined;
  const normalized: Partial<ChartIntent> = {
    type: type ?? undefined,
    x: typeof patch.x === "string" ? patch.x : undefined,
    y: typeof patch.y === "string" ? patch.y : undefined,
    title: typeof patch.title === "string" ? patch.title : undefined,
    aggregation,
  };
  if (
    normalized.type ||
    normalized.x ||
    normalized.y ||
    normalized.title ||
    normalized.aggregation
  ) {
    return normalized;
  }
  return null;
}

function normalizeActions(parsed: { actions: unknown[] }): ChatAction[] {
  const actions: ChatAction[] = [];
  for (const item of parsed.actions ?? []) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const action = item as { type?: unknown; chartId?: unknown; chart?: unknown; patch?: unknown };
    const type = typeof action.type === "string" ? action.type : null;
    if (type === "add_chart") {
      const chart = normalizeChartIntent(action.chart);
      if (chart) {
        actions.push({ type: "add_chart", chart });
      }
    } else if (type === "remove_chart" && typeof action.chartId === "string") {
      actions.push({ type: "remove_chart", chartId: action.chartId });
    } else if (type === "show_chart" && typeof action.chartId === "string") {
      actions.push({ type: "show_chart", chartId: action.chartId });
    } else if (type === "hide_chart" && typeof action.chartId === "string") {
      actions.push({ type: "hide_chart", chartId: action.chartId });
    } else if (type === "update_chart" && typeof action.chartId === "string") {
      const patch = normalizeChartPatch(action.patch);
      if (patch) {
        actions.push({ type: "update_chart", chartId: action.chartId, patch });
      }
    } else if (type === "reset") {
      actions.push({ type: "reset" });
    }
  }
  return actions;
}

function findColumnByInput(columns: Column[], input: string): Column | null {
  const lower = input.toLowerCase();
  const exact = columns.find((column) => column.name.toLowerCase() === lower);
  if (exact) {
    return exact;
  }
  let candidates = columns.filter((column) => lower.includes(column.name.toLowerCase()));
  if (candidates.length === 0) {
    candidates = columns.filter((column) => column.name.toLowerCase().includes(lower));
  }
  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => b.name.length - a.name.length);
  return candidates[0] ?? null;
}

function findChartByRef(state: DashboardState, message: string): string | null {
  const indexMatch = /\bchart\s*(\d+)\b/i.exec(message);
  if (indexMatch) {
    const index = Number(indexMatch[1]);
    if (Number.isInteger(index) && index >= 1 && index <= state.charts.length) {
      return state.charts[index - 1]?.id ?? null;
    }
  }
  const lower = message.toLowerCase();
  const chart = state.charts.find((candidate) => lower.includes(candidate.title.toLowerCase()));
  return chart?.id ?? null;
}

function parseAddChart(message: string, columns: Column[]): ChartIntent | null {
  const match = /\b(add|create|make)\s+(a|an)?\s*(pie|bar|line|table)\s+chart\b/i.exec(message);
  if (!match) {
    return null;
  }
  const type = match[3] as ChartType;
  const lower = message.toLowerCase();
  const { primaryCategory, primaryNumeric, primaryDate } = pickPrimaryColumns(columns);

  let x: string | undefined;
  let y: string | undefined;
  let aggregation: "sum" | "avg" | "count" | undefined;

  const ofByMatch = /\bof\s+(.+?)\s+by\s+(.+)\b/i.exec(message);
  if (ofByMatch) {
    const metric = findColumnByInput(columns, ofByMatch[1]);
    const category = findColumnByInput(columns, ofByMatch[2]);
    if (metric?.kind === "numeric") {
      y = metric.name;
    }
    if (category?.kind === "categorical") {
      x = category.name;
    }
  } else {
    const byMatch = /\bby\s+(.+)\b/i.exec(message);
    if (byMatch) {
      const category = findColumnByInput(columns, byMatch[1]);
      if (category?.kind === "categorical") {
        x = category.name;
      }
    }
    const ofMatch = /\bof\s+(.+)\b/i.exec(message);
    if (ofMatch) {
      const metric = findColumnByInput(columns, ofMatch[1]);
      if (metric?.kind === "numeric") {
        y = metric.name;
      } else if (metric?.kind === "categorical") {
        x = metric.name;
      }
    }
  }

  if (type === "line") {
    if (!x) {
      x = primaryDate?.name;
    }
    if (!y) {
      y = primaryNumeric?.name;
    }
    aggregation = y ? "sum" : "count";
  } else if (type === "pie") {
    if (!x) {
      x = primaryCategory?.name;
    }
    aggregation = y ? "sum" : "count";
  } else if (type === "bar") {
    if (!x) {
      x = primaryCategory?.name;
    }
    if (!y && lower.includes("count")) {
      aggregation = "count";
    } else if (!y) {
      y = primaryNumeric?.name;
    }
    aggregation = aggregation ?? (y ? "sum" : "count");
  }

  return { type, x, y, aggregation };
}

function parseUpdateChart(message: string, state: DashboardState): ChatAction | null {
  const typeMatch = /\b(to|into)\s+(pie|bar|line|table)\b/i.exec(message);
  const chartId = findChartByRef(state, message);
  if (!chartId || !typeMatch) {
    return null;
  }
  const type = typeMatch[2] as ChartType;
  const ofByMatch = /\bof\s+(.+?)\s+by\s+(.+)\b/i.exec(message);
  const patch: Partial<ChartIntent> = { type };
  if (ofByMatch) {
    const metric = findColumnByInput(state.columns, ofByMatch[1]);
    const category = findColumnByInput(state.columns, ofByMatch[2]);
    patch.y = metric?.name;
    patch.x = category?.name;
  } else {
    const byMatch = /\bby\s+(.+)\b/i.exec(message);
    if (byMatch) {
      const category = findColumnByInput(state.columns, byMatch[1]);
      patch.x = category?.name;
    }
    const ofMatch = /\bof\s+(.+)\b/i.exec(message);
    if (ofMatch) {
      const metric = findColumnByInput(state.columns, ofMatch[1]);
      patch.y = metric?.name;
    }
  }
  return { type: "update_chart", chartId, patch };
}

function parseRuleActions(message: string, state: DashboardState): ChatAction[] {
  const actions: ChatAction[] = [];
  const lower = message.toLowerCase();

  if (/\breset\b/.test(lower)) {
    actions.push({ type: "reset" });
    return actions;
  }

  const hideMatch = /\bhide\s+chart\s*(\d+)\b/i.exec(message);
  if (hideMatch) {
    const index = Number(hideMatch[1]);
    if (Number.isInteger(index) && index >= 1 && index <= state.charts.length) {
      actions.push({ type: "hide_chart", chartId: state.charts[index - 1].id });
      return actions;
    }
  }

  const showMatch = /\bshow\s+chart\s*(\d+)\b/i.exec(message);
  if (showMatch) {
    const index = Number(showMatch[1]);
    if (Number.isInteger(index) && index >= 1 && index <= state.charts.length) {
      actions.push({ type: "show_chart", chartId: state.charts[index - 1].id });
      return actions;
    }
  }

  if (lower.includes("hide")) {
    const chartId = findChartByRef(state, message);
    if (chartId) {
      actions.push({ type: "hide_chart", chartId });
      return actions;
    }
  }

  if (lower.includes("show")) {
    const chartId = findChartByRef(state, message);
    if (chartId) {
      actions.push({ type: "show_chart", chartId });
      return actions;
    }
  }

  const removeMatch = /\b(remove|delete)\s+chart\s*(\d+)\b/i.exec(message);
  if (removeMatch) {
    const index = Number(removeMatch[2]);
    if (Number.isInteger(index) && index >= 1 && index <= state.charts.length) {
      actions.push({ type: "remove_chart", chartId: state.charts[index - 1].id });
      return actions;
    }
  }

  if (lower.includes("remove") || lower.includes("delete")) {
    const chartId = findChartByRef(state, message);
    if (chartId) {
      actions.push({ type: "remove_chart", chartId });
      return actions;
    }
  }

  const updateAction = parseUpdateChart(message, state);
  if (updateAction) {
    actions.push(updateAction);
    return actions;
  }

  const addChart = parseAddChart(message, state.columns);
  if (addChart) {
    actions.push({ type: "add_chart", chart: addChart });
    return actions;
  }

  const metricMatch = /\bset\s+metric\s+(.+)/i.exec(message);
  if (metricMatch) {
    const metric = findColumnByInput(state.columns, metricMatch[1].trim());
    if (metric?.name) {
      actions.push({
        type: "update_chart",
        chartId: state.charts[0]?.id ?? "",
        patch: { y: metric.name },
      });
    }
  }

  const categoryMatch = /\bset\s+category\s+(.+)/i.exec(message);
  if (categoryMatch) {
    const category = findColumnByInput(state.columns, categoryMatch[1].trim());
    if (category?.name) {
      actions.push({
        type: "update_chart",
        chartId: state.charts[0]?.id ?? "",
        patch: { x: category.name },
      });
    }
  }

  const timeMatch = /\bset\s+time\s+(.+)/i.exec(message);
  if (timeMatch) {
    const time = findColumnByInput(state.columns, timeMatch[1].trim());
    if (time?.name) {
      actions.push({
        type: "update_chart",
        chartId: state.charts[0]?.id ?? "",
        patch: { x: time.name },
      });
    }
  }

  return actions.filter((action) => !(action.type === "update_chart" && action.chartId === ""));
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

function applyHideShowById(
  state: DashboardState,
  chartId: string,
  hide: boolean,
): DashboardState | null {
  const chart = state.charts.find((candidate) => candidate.id === chartId);
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

function applyActions(state: DashboardState, rows: Row[], actions: ChatAction[]): DashboardState {
  let next: DashboardState = {
    ...state,
    charts: [...state.charts],
    hiddenChartIds: [...state.hiddenChartIds],
  };
  const usedIds = new Set(next.charts.map((chart) => chart.id));

  for (const action of actions) {
    if (action.type === "remove_chart") {
      next = {
        ...next,
        charts: next.charts.filter((chart) => chart.id !== action.chartId),
        hiddenChartIds: next.hiddenChartIds.filter((id) => id !== action.chartId),
      };
      continue;
    }

    if (action.type === "show_chart") {
      const updated = applyHideShowById(next, action.chartId, false);
      if (!updated) {
        continue;
      }
      next = updated;
      continue;
    }

    if (action.type === "hide_chart") {
      const updated = applyHideShowById(next, action.chartId, true);
      if (!updated) {
        continue;
      }
      next = updated;
      continue;
    }

    if (action.type === "add_chart") {
      const chart = buildChartFromSpec(rows, next.columns, action.chart, usedIds);
      if (!chart) {
        continue;
      }
      next = {
        ...next,
        charts: [...next.charts, chart],
      };
      continue;
    }

    if (action.type === "update_chart") {
      const index = next.charts.findIndex((chart) => chart.id === action.chartId);
      if (index === -1) {
        continue;
      }
      const existing = next.charts[index];
      const nextSpec: ChartIntent = {
        type: action.patch.type ?? existing.type,
        x: action.patch.x ?? existing.config?.x,
        y: action.patch.y ?? existing.config?.y,
        title: action.patch.title ?? existing.title,
        aggregation: action.patch.aggregation ?? existing.config?.aggregation,
      };
      const updatedChart = buildChartFromSpec(
        rows,
        next.columns,
        { ...nextSpec, id: existing.id },
        usedIds,
      );
      if (!updatedChart) {
        continue;
      }
      const charts = [...next.charts];
      charts[index] = updatedChart;
      next = { ...next, charts };
      continue;
    }

    if (action.type === "reset") {
      const columns = inferColumns(rows);
      next = rebuildState(next, rows, columns, true);
    }
  }

  return next;
}

function buildFallbackInsights(context: InsightContext): string {
  const sentences: string[] = [];
  sentences.push(`Your dataset has ${context.rowCount} rows across ${context.columnCount} columns.`);

  const primaryMetric = context.kpis.find((kpi) => kpi.label.toLowerCase().includes("primary"));
  const topCategory = context.kpis.find((kpi) => kpi.label.toLowerCase().includes("category"));
  const timeSpan = context.kpis.find((kpi) => kpi.label.toLowerCase().includes("time"));

  if (topCategory && topCategory.value && topCategory.value !== "—") {
    sentences.push(`The most common category is ${topCategory.value}.`);
  } else if (primaryMetric && primaryMetric.value && primaryMetric.value !== "—") {
    sentences.push(`The primary metric looks around ${primaryMetric.value}.`);
  }

  if (timeSpan && timeSpan.value && timeSpan.value !== "—") {
    sentences.push(`The data spans ${timeSpan.value}.`);
  }

  if (sentences.length < 3 && context.chartHighlights.length > 0) {
    sentences.push(context.chartHighlights[0]);
  } else if (sentences.length < 3 && context.chartTitles.length > 0) {
    const titles = context.chartTitles.slice(0, 2).join(" and ");
    sentences.push(`Key views include ${titles}.`);
  }

  return sentences.slice(0, 3).join(" ");
}

function formatPercent(value: number, total: number): string {
  if (total <= 0) {
    return "0%";
  }
  const pct = Math.round((value / total) * 100);
  return `${pct}%`;
}

function buildChartHighlights(charts: DashboardState["charts"]): string[] {
  const highlights: string[] = [];

  for (const chart of charts) {
    if (highlights.length >= 2) {
      break;
    }
    const payload = chart.payload as { labels?: unknown[]; values?: unknown[] };
    if (!Array.isArray(payload?.labels) || !Array.isArray(payload?.values)) {
      continue;
    }
    const labels = payload.labels.map((label) => String(label));
    const values = payload.values.map((value) =>
      typeof value === "number" ? value : Number(value),
    );
    if (labels.length === 0 || values.length === 0) {
      continue;
    }
    const total = values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
    const maxIndex = values.reduce((best, value, index) => (value > values[best] ? index : best), 0);
    const topLabel = labels[maxIndex];
    const topValue = values[maxIndex];

    if (chart.type === "pie" || chart.type === "bar") {
      const share = Number.isFinite(topValue) ? formatPercent(topValue, total) : "0%";
      highlights.push(`${topLabel} is the largest segment at about ${share}.`);
      continue;
    }

    if (chart.type === "line" && values.length >= 2) {
      const first = values[0];
      const last = values[values.length - 1];
      if (Number.isFinite(first) && Number.isFinite(last)) {
        if (last > first * 1.1) {
          highlights.push("The trend rises over time.");
        } else if (last < first * 0.9) {
          highlights.push("The trend declines over time.");
        } else {
          highlights.push("The trend stays fairly steady over time.");
        }
      }
    }
  }

  return highlights;
}

export async function handleChat({
  datasetId,
  message,
  dashboardState,
}: {
  datasetId: string;
  message: string;
  dashboardState?: DashboardState;
}): Promise<{
  assistantMessage: string;
  dashboardState: DashboardState;
  debug?: { llm?: LlmDebug; usedRules: boolean };
}> {
  const storedState = getDatasetState(datasetId);
  if (!storedState) {
    throw new Error("not_found");
  }
  const rows = getDatasetRows(datasetId);
  if (!rows) {
    throw new Error("missing_rows");
  }

  const baseState =
    dashboardState && dashboardState.datasetId === datasetId ? dashboardState : storedState;

  const debugEnabled = getEnvFlag("DEBUG_CHAT");
  const debug: { llm?: LlmDebug; usedRules: boolean } = { usedRules: false };

  const ruleActions = parseRuleActions(message, baseState);
  let actionsToApply = ruleActions;
  debug.usedRules = ruleActions.length > 0;

  if (actionsToApply.length === 0 && !getEnvFlag("DISABLE_CHAT_LLM")) {
    try {
      actionsToApply = await callLLM(message, baseState);
      if (debugEnabled) {
        debug.llm = { status: 200 };
      }
    } catch (error) {
      if (debugEnabled && error instanceof Error) {
        debug.llm = {
          status: (error as { llmStatus?: number }).llmStatus,
          body: (error as { llmBody?: string }).llmBody,
          error: error.message,
        };
      }
      actionsToApply = [];
    }
  }

  const nextState =
    actionsToApply.length > 0 ? applyActions(baseState, rows, actionsToApply) : baseState;
  const updatedState = updateDatasetState(datasetId, () => nextState) ?? nextState;

  const insightContext: InsightContext = {
    rowCount: rows.length,
    columnCount: updatedState.columns.length,
    kpis: updatedState.kpis.map((kpi) => ({ label: kpi.label, value: kpi.value })),
    chartTitles: updatedState.charts.map((chart) => chart.title),
    chartHighlights: buildChartHighlights(updatedState.charts),
  };

  let assistantMessage = buildFallbackInsights(insightContext);
  if (!getEnvFlag("DISABLE_CHAT_LLM")) {
    try {
      assistantMessage = await callInsights(insightContext);
      if (debugEnabled && debug.llm && !debug.llm.status) {
        debug.llm.status = 200;
      }
    } catch (error) {
      if (debugEnabled && error instanceof Error) {
        debug.llm = {
          status: (error as { llmStatus?: number }).llmStatus,
          body: (error as { llmBody?: string }).llmBody,
          error: error.message,
        };
      }
    }
  }

  if (debugEnabled) {
    return { assistantMessage, dashboardState: updatedState, debug };
  }
  return { assistantMessage, dashboardState: updatedState };
}
