import type { Chart, ChartType, Column, ColumnKind } from "./types";
import { pickPrimaryColumns } from "./infer";

type Row = Record<string, unknown>;
type ChartSpecInput = {
  id?: string;
  type: ChartType;
  x?: string;
  y?: string;
  title?: string;
  aggregation?: "sum" | "avg" | "count";
};

type ChartSuggestion = {
  type: ChartType;
  x?: string;
  y?: string;
  title?: string;
  aggregation?: "sum" | "avg" | "count";
};

const TABLE_PREVIEW_LIMIT = 20;
const CATEGORY_LIMIT = 10;
const HF_API_URL = "https://api-inference.huggingface.co/models";

function buildTablePreview(rows: Row[], selectedColumns?: string[]): Chart["payload"] {
  const previewRows = rows.slice(0, TABLE_PREVIEW_LIMIT);
  const columns =
    selectedColumns && selectedColumns.length > 0
      ? selectedColumns
      : previewRows.length > 0
        ? Object.keys(previewRows[0])
        : [];
  return {
    columns,
    rows: previewRows.map((row) => {
      if (!selectedColumns || selectedColumns.length === 0) {
        return row;
      }
      const next: Row = {};
      for (const column of columns) {
        next[column] = row[column];
      }
      return next;
    }),
  };
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/^[0-9]+$/.test(trimmed)) {
    if (trimmed.length === 8) {
      const year = Number(trimmed.slice(0, 4));
      const month = Number(trimmed.slice(4, 6));
      const day = Number(trimmed.slice(6, 8));
      if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(Date.UTC(year, month - 1, day));
      }
    }
    return null;
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function getColumnByKind(columns: Column[], kind: ColumnKind): Column | null {
  return columns.find((column) => column.kind === kind) ?? null;
}

function createChartId(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let index = 2;
  while (used.has(`${base}_${index}`)) {
    index += 1;
  }
  const next = `${base}_${index}`;
  used.add(next);
  return next;
}

function resolveColumn(columns: Column[], name?: string): Column | null {
  if (!name) {
    return null;
  }
  const lower = name.toLowerCase();
  const match = columns.find((column) => column.name.toLowerCase() === lower);
  return match ?? null;
}

function buildCountByCategory(rows: Row[], category: Column | null, usedIds: Set<string>): Chart {
  if (!category) {
    const id = createChartId("count_by_category", usedIds);
    return {
      id,
      type: "table",
      title: "Count by Category",
      payload: buildTablePreview(rows),
      config: {},
    };
  }
  const counts = new Map<string, number>();
  for (const row of rows) {
    const raw = row[category.name];
    if (raw === null || raw === undefined || raw === "") {
      continue;
    }
    const key = String(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, CATEGORY_LIMIT);
  const other = sorted.slice(CATEGORY_LIMIT).reduce((sum, [, count]) => sum + count, 0);
  const labels = top.map(([label]) => label);
  const values = top.map(([, count]) => count);
  if (other > 0) {
    labels.push("Other");
    values.push(other);
  }
  const id = createChartId("count_by_category", usedIds);
  return {
    id,
    type: "bar",
    title: "Count by Category",
    payload: { labels, values },
    config: { x: category.name, aggregation: "count" },
  };
}

function buildAvgNumericByCategory(
  rows: Row[],
  numeric: Column | null,
  category: Column | null,
  usedIds: Set<string>,
): Chart {
  if (!numeric || !category) {
    const id = createChartId("avg_numeric_by_category", usedIds);
    return {
      id,
      type: "table",
      title: "Avg Numeric by Category",
      payload: buildTablePreview(rows),
      config: {},
    };
  }
  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const categoryValue = row[category.name];
    if (categoryValue === null || categoryValue === undefined || categoryValue === "") {
      continue;
    }
    const numericValue = toNumber(row[numeric.name]);
    if (numericValue === null) {
      continue;
    }
    const key = String(categoryValue);
    const current = totals.get(key) ?? { sum: 0, count: 0 };
    current.sum += numericValue;
    current.count += 1;
    totals.set(key, current);
  }
  const averages = Array.from(totals.entries())
    .filter(([, value]) => value.count > 0)
    .map(([label, value]) => ({ label, avg: value.sum / value.count }))
    .sort((a, b) => b.avg - a.avg);
  const id = createChartId("avg_numeric_by_category", usedIds);
  return {
    id,
    type: "bar",
    title: "Avg Numeric by Category",
    payload: {
      labels: averages.map((item) => item.label).slice(0, CATEGORY_LIMIT),
      values: averages.map((item) => Math.round(item.avg * 100) / 100).slice(0, CATEGORY_LIMIT),
    },
    config: { x: category.name, y: numeric.name, aggregation: "avg" },
  };
}

function buildNumericDistribution(rows: Row[], numeric: Column | null, usedIds: Set<string>): Chart {
  if (!numeric) {
    const id = createChartId("numeric_distribution", usedIds);
    return {
      id,
      type: "table",
      title: "Numeric Distribution",
      payload: buildTablePreview(rows),
      config: {},
    };
  }
  const values: number[] = [];
  for (const row of rows) {
    const value = toNumber(row[numeric.name]);
    if (value !== null) {
      values.push(value);
    }
  }
  if (values.length === 0) {
    const id = createChartId("numeric_distribution", usedIds);
    return {
      id,
      type: "table",
      title: "Numeric Distribution",
      payload: buildTablePreview(rows),
      config: {},
    };
  }
  const n = values.length;
  const binCount = Math.max(8, Math.min(20, Math.round(Math.sqrt(n))));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const step = range === 0 ? 1 : range / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    min: min + step * index,
    max: min + step * (index + 1),
    count: 0,
  }));
  for (const value of values) {
    const bucket = range === 0 ? 0 : Math.min(binCount - 1, Math.floor((value - min) / step));
    bins[bucket].count += 1;
  }
  const labels = bins.map((bin) => {
    const left = Math.round(bin.min * 100) / 100;
    const right = Math.round(bin.max * 100) / 100;
    return `${left}-${right}`;
  });
  const id = createChartId("numeric_distribution", usedIds);
  return {
    id,
    type: "bar",
    title: "Numeric Distribution",
    payload: { labels, values: bins.map((bin) => bin.count) },
    config: { x: numeric.name, aggregation: "count" },
  };
}

function buildOverTime(rows: Row[], dateColumn: Column | null, usedIds: Set<string>): Chart {
  if (!dateColumn) {
    const id = createChartId("over_time", usedIds);
    return {
      id,
      type: "table",
      title: "Over Time",
      payload: buildTablePreview(rows),
      config: {},
    };
  }
  const counts = new Map<string, number>();
  for (const row of rows) {
    const dateValue = parseDateValue(row[dateColumn.name]);
    if (!dateValue) {
      continue;
    }
    const label = `${dateValue.getUTCFullYear()}-${String(dateValue.getUTCMonth() + 1).padStart(2, "0")}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const ordered = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const id = createChartId("over_time", usedIds);
  return {
    id,
    type: "line",
    title: "Over Time",
    payload: {
      labels: ordered.map(([label]) => label),
      values: ordered.map(([, count]) => count),
    },
    config: { x: dateColumn.name, aggregation: "count" },
  };
}

function buildPieByCategory(rows: Row[], category: Column | null, usedIds: Set<string>): Chart {
  if (!category) {
    const id = createChartId("pie_by_category", usedIds);
    return {
      id,
      type: "table",
      title: "Category Share",
      payload: buildTablePreview(rows),
      config: {},
    };
  }
  const counts = new Map<string, number>();
  for (const row of rows) {
    const raw = row[category.name];
    if (raw === null || raw === undefined || raw === "") {
      continue;
    }
    const key = String(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, CATEGORY_LIMIT);
  const other = sorted.slice(CATEGORY_LIMIT).reduce((sum, [, count]) => sum + count, 0);
  const labels = top.map(([label]) => label);
  const values = top.map(([, count]) => count);
  if (other > 0) {
    labels.push("Other");
    values.push(other);
  }
  const id = createChartId("pie_by_category", usedIds);
  return {
    id,
    type: "pie",
    title: "Category Share",
    payload: { labels, values },
    config: { x: category.name, aggregation: "count" },
  };
}

function aggregateByCategory(
  rows: Row[],
  category: string,
  numeric: string | null,
  aggregation: "sum" | "avg" | "count",
): { labels: string[]; values: number[] } {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const rawCategory = row[category];
    if (rawCategory === null || rawCategory === undefined || rawCategory === "") {
      continue;
    }
    const key = String(rawCategory);
    const entry = totals.get(key) ?? { sum: 0, count: 0 };
    if (aggregation === "count" || !numeric) {
      entry.count += 1;
    } else {
      const numericValue = toNumber(row[numeric]);
      if (numericValue !== null) {
        entry.sum += numericValue;
        entry.count += 1;
      }
    }
    totals.set(key, entry);
  }
  const entries = Array.from(totals.entries()).map(([label, entry]) => {
    if (aggregation === "avg") {
      return [label, entry.count ? entry.sum / entry.count : 0] as const;
    }
    if (aggregation === "sum") {
      return [label, entry.sum] as const;
    }
    return [label, entry.count] as const;
  });
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, CATEGORY_LIMIT);
  const other = sorted.slice(CATEGORY_LIMIT).reduce((sum, [, value]) => sum + value, 0);
  const labels = top.map(([label]) => label);
  const values = top.map(([, value]) => Math.round(value * 100) / 100);
  if (other > 0) {
    labels.push("Other");
    values.push(Math.round(other * 100) / 100);
  }
  return { labels, values };
}

function aggregateByDate(
  rows: Row[],
  dateColumn: string,
  numeric: string | null,
  aggregation: "sum" | "avg" | "count",
): { labels: string[]; values: number[] } {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const dateValue = parseDateValue(row[dateColumn]);
    if (!dateValue) {
      continue;
    }
    const label = `${dateValue.getUTCFullYear()}-${String(dateValue.getUTCMonth() + 1).padStart(2, "0")}`;
    const entry = totals.get(label) ?? { sum: 0, count: 0 };
    if (aggregation === "count" || !numeric) {
      entry.count += 1;
    } else {
      const numericValue = toNumber(row[numeric]);
      if (numericValue !== null) {
        entry.sum += numericValue;
        entry.count += 1;
      }
    }
    totals.set(label, entry);
  }
  const sorted = Array.from(totals.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const labels = sorted.map(([label]) => label);
  const values = sorted.map(([, entry]) => {
    if (aggregation === "avg") {
      return entry.count ? Math.round((entry.sum / entry.count) * 100) / 100 : 0;
    }
    if (aggregation === "sum") {
      return Math.round(entry.sum * 100) / 100;
    }
    return entry.count;
  });
  return { labels, values };
}

function defaultTitle(spec: ChartSpecInput): string {
  if (spec.type === "table") {
    return "Sample records";
  }
  if (spec.type === "line") {
    return spec.y ? `${spec.y} over time` : "Records over time";
  }
  if (spec.type === "pie") {
    return spec.y ? `${spec.y} share by ${spec.x}` : `Share by ${spec.x}`;
  }
  if (spec.type === "bar") {
    return spec.y ? `${spec.y} by ${spec.x}` : `Count by ${spec.x}`;
  }
  return "Chart";
}

export function buildChartFromSpec(
  rows: Row[],
  columns: Column[],
  spec: ChartSpecInput,
  usedIds: Set<string>,
): Chart | null {
  const resolvedX = resolveColumn(columns, spec.x);
  const resolvedY = resolveColumn(columns, spec.y ?? undefined);
  const title =
    spec.title ?? defaultTitle({ ...spec, x: resolvedX?.name ?? spec.x, y: resolvedY?.name ?? spec.y });

  if (spec.type === "table") {
    const selectedColumns = [resolvedX?.name, resolvedY?.name].filter(Boolean) as string[];
    return {
      id: spec.id ?? createChartId("table", usedIds),
      type: "table",
      title,
      payload: buildTablePreview(rows, selectedColumns),
      config: { x: resolvedX?.name ?? undefined, y: resolvedY?.name ?? undefined },
    };
  }

  if (spec.type === "line") {
    const dateColumn =
      resolvedX && resolvedX.kind === "date"
        ? resolvedX.name
        : getColumnByKind(columns, "date")?.name ?? null;
    if (!dateColumn) {
      return null;
    }
    const numericColumn = resolvedY && resolvedY.kind === "numeric" ? resolvedY.name : null;
    const aggregation = spec.aggregation ?? (numericColumn ? "sum" : "count");
    const payload = aggregateByDate(rows, dateColumn, numericColumn, aggregation);
    if (payload.labels.length === 0) {
      return null;
    }
    return {
      id: spec.id ?? createChartId("line", usedIds),
      type: "line",
      title,
      payload,
      config: { x: dateColumn, y: numericColumn ?? undefined, aggregation },
    };
  }

  if (spec.type === "bar" || spec.type === "pie") {
    const categoryColumn =
      resolvedX && resolvedX.kind === "categorical"
        ? resolvedX.name
        : getColumnByKind(columns, "categorical")?.name ?? null;
    if (!categoryColumn) {
      return null;
    }
    const numericColumn = resolvedY && resolvedY.kind === "numeric" ? resolvedY.name : null;
    const aggregation = spec.aggregation ?? (numericColumn ? "sum" : "count");
    const payload = aggregateByCategory(rows, categoryColumn, numericColumn, aggregation);
    if (payload.labels.length === 0) {
      return null;
    }
    return {
      id: spec.id ?? createChartId(spec.type, usedIds),
      type: spec.type,
      title,
      payload,
      config: { x: categoryColumn, y: numericColumn ?? undefined, aggregation },
    };
  }

  return null;
}

function parseJsonFromText(text: string): ChartSuggestion[] | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as {
      charts?: ChartSuggestion[];
    };
    if (!Array.isArray(parsed?.charts)) {
      return null;
    }
    return parsed.charts;
  } catch {
    return null;
  }
}

async function suggestCharts(rows: Row[], columns: Column[]): Promise<ChartSuggestion[]> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) {
    throw new Error("missing_api_key");
  }
  const model = process.env.HF_MODEL || "HuggingFaceH4/zephyr-7b-beta";
  const sampleRows = rows.slice(0, 8);
  const prompt = [
    "Return strict JSON only. No prose.",
    'Schema: {"charts":[{"type":"line|bar|pie|table","x":"column","y":"column?","title":"string?","aggregation":"sum|avg|count?"}]}',
    "Return 3 to 5 charts. Use only provided column names.",
    JSON.stringify({
      rowCount: rows.length,
      columns: columns.map((column) => ({ name: column.name, kind: column.kind })),
      sampleRows,
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
    throw new Error(`llm_error_${response.status}`);
  }
  const payload = (await response.json()) as unknown;
  const text = extractText(payload);
  if (!text) {
    throw new Error("invalid_json");
  }
  const charts = parseJsonFromText(text);
  if (!charts) {
    throw new Error("invalid_json");
  }
  return charts;
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

export function buildCharts(rows: Row[], columns: Column[], usedIds?: Set<string>): Chart[] {
  const { primaryCategory, primaryNumeric, primaryDate } = pickPrimaryColumns(columns);
  const safeCategory = primaryCategory && primaryCategory.kind !== "ignored" ? primaryCategory : null;
  const safeNumeric = primaryNumeric && primaryNumeric.kind !== "ignored" ? primaryNumeric : null;
  const safeDate = primaryDate && primaryDate.kind !== "ignored" ? primaryDate : null;
  const ids = usedIds ?? new Set<string>();

  const charts: Chart[] = [];
  if (safeDate) {
    charts.push(buildOverTime(rows, safeDate, ids));
  }
  if (safeCategory) {
    charts.push(buildCountByCategory(rows, safeCategory, ids));
    charts.push(buildPieByCategory(rows, safeCategory, ids));
  }
  if (safeNumeric && charts.length < 3) {
    charts.push(buildNumericDistribution(rows, safeNumeric, ids));
  }
  charts.push({
    id: createChartId("table", ids),
    type: "table",
    title: "Sample records",
    payload: buildTablePreview(rows),
    config: {},
  });
  return charts.filter(Boolean).slice(0, 5);
}

export async function buildChartsWithLLM(rows: Row[], columns: Column[]): Promise<Chart[]> {
  const usedIds = new Set<string>();
  let suggestions: ChartSuggestion[] = [];
  try {
    suggestions = await suggestCharts(rows, columns);
  } catch (error) {
    if (error instanceof Error && error.message === "missing_api_key") {
      throw error;
    }
  }
  const charts = suggestions
    .map((spec) => buildChartFromSpec(rows, columns, spec, usedIds))
    .filter((chart): chart is Chart => Boolean(chart));

  const fallback = buildCharts(rows, columns, usedIds);
  for (const chart of fallback) {
    if (charts.length >= 5) {
      break;
    }
    charts.push(chart);
  }

  if (charts.length < 3) {
    const extra = buildCharts(rows, columns, usedIds);
    for (const chart of extra) {
      if (charts.length >= 3) {
        break;
      }
      charts.push(chart);
    }
  }

  return charts.slice(0, 5);
}
