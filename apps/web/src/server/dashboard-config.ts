import {
  BI_GENERATION_RULES,
  BI_RULE_LIMITS,
  ChartAggregationSchema,
  ChartConfigSchema,
  type ChartConfig,
  type ChartSource,
  type ChartType,
  type KPIConfig,
} from "@tada/shared";
import Groq from "groq-sdk";
import { env, getGroqApiKey } from "@/lib/env";
import type { Column } from "./types";

type Row = Record<string, unknown>;

export type ColumnPromptStats = {
  min: number | string | null;
  max: number | string | null;
  uniqueCount: number;
  nullCount: number;
  topValues: Array<{ value: string | number | boolean | null; count: number }>;
};

type IncomingChartConfig = {
  type: ChartType;
  title: string;
  insight: string;
  columns: string[];
  aggregation: ChartConfig["aggregation"];
  groupBy: string | null;
  timeColumn: string | null;
  size: ChartConfig["size"];
};

function nowIso(): string {
  return new Date().toISOString();
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

function toDate(value: unknown): Date | null {
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
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const avg = mean(values);
  return (
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length
  );
}

function pearsonCorrelation(left: number[], right: number[]): number | null {
  if (
    left.length !== right.length ||
    left.length < BI_RULE_LIMITS.minScatterPoints
  ) {
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

function createChartId(order: number): string {
  return `chart_${String(order + 1).padStart(2, "0")}`;
}

function hasHumanTitle(title: string): boolean {
  const trimmed = title.trim();
  if (trimmed.length < 4) {
    return false;
  }
  return !/^chart(\s+\d+)?$/i.test(trimmed);
}

function findColumn(
  columns: Column[],
  name: string | null | undefined,
): Column | null {
  if (!name) {
    return null;
  }
  return columns.find((column) => column.name === name) ?? null;
}

function toPromptValue(value: unknown): string | number | boolean | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value as string | number | boolean | null;
  }
  return value === undefined ? null : String(value);
}

function comparePromptValues(
  left: string | number | boolean,
  right: string | number | boolean,
): number {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right));
}

export function buildColumnPromptStats(
  rows: Row[],
  columns: Column[],
): Record<string, ColumnPromptStats> {
  const stats: Record<string, ColumnPromptStats> = {};

  for (const column of columns) {
    const normalizedValues = rows.map((row) => toPromptValue(row[column.name]));
    const nullCount = normalizedValues.filter((value) => value === null).length;
    const nonNullValues = normalizedValues.filter(
      (value): value is string | number | boolean => value !== null,
    );
    const uniqueValues = new Set(
      nonNullValues.map((value) => `${typeof value}:${String(value)}`),
    );
    const counts = new Map<
      string,
      { value: string | number | boolean | null; count: number }
    >();

    for (const value of normalizedValues) {
      const key = value === null ? "null" : `${typeof value}:${String(value)}`;
      const current = counts.get(key);
      if (current) {
        current.count += 1;
      } else {
        counts.set(key, { value, count: 1 });
      }
    }

    let min: number | string | null = null;
    let max: number | string | null = null;

    if (column.kind === "numeric") {
      const numericValues = nonNullValues.filter(
        (value): value is number => typeof value === "number",
      );
      if (numericValues.length > 0) {
        min = Math.min(...numericValues);
        max = Math.max(...numericValues);
      }
    } else if (column.kind === "date") {
      const dateValues = nonNullValues
        .filter((value): value is string => typeof value === "string")
        .map((value) => Date.parse(value))
        .filter((value) => Number.isFinite(value))
        .sort((left, right) => left - right);
      if (dateValues.length > 0) {
        min = new Date(dateValues[0]).toISOString();
        max = new Date(dateValues[dateValues.length - 1]).toISOString();
      }
    } else if (nonNullValues.length > 0) {
      const sortedValues = [...nonNullValues].sort(comparePromptValues);
      min = String(sortedValues[0]);
      max = String(sortedValues[sortedValues.length - 1]);
    }

    stats[column.name] = {
      min,
      max,
      uniqueCount: uniqueValues.size,
      nullCount,
      topValues: Array.from(counts.values())
        .sort((left, right) => right.count - left.count)
        .slice(0, 5),
    };
  }

  return stats;
}

function listNumericColumns(
  rows: Row[],
  columns: Column[],
): Array<{ column: Column; values: number[] }> {
  return columns
    .filter((column) => column.kind === "numeric")
    .map((column) => ({
      column,
      values: rows
        .map((row) => toNumber(row[column.name]))
        .filter((value): value is number => value !== null),
    }))
    .filter((entry) => entry.values.length > 0);
}

function listCategoricalColumns(rows: Row[], columns: Column[]): Column[] {
  return columns.filter((column) => {
    if (column.kind !== "categorical") {
      return false;
    }
    const distinct = new Set<string>();
    for (const row of rows) {
      const raw = row[column.name];
      if (raw === null || raw === undefined || raw === "") {
        continue;
      }
      distinct.add(String(raw));
      if (distinct.size > 20) {
        return false;
      }
    }
    return distinct.size > 0;
  });
}

function pickPrimaryNumeric(rows: Row[], columns: Column[]): Column | null {
  const candidates = listNumericColumns(rows, columns)
    .map((entry) => ({
      column: entry.column,
      variance: variance(entry.values),
    }))
    .sort((left, right) => right.variance - left.variance);
  return candidates[0]?.column ?? null;
}

function pickPrimaryCategory(rows: Row[], columns: Column[]): Column | null {
  return listCategoricalColumns(rows, columns)[0] ?? null;
}

function pickPrimaryDate(columns: Column[]): Column | null {
  return columns.find((column) => column.kind === "date") ?? null;
}

function detectTimeGranularity(
  rows: Row[],
  timeColumn: string,
): "day" | "month" | "year" {
  const dates = rows
    .map((row) => toDate(row[timeColumn]))
    .filter((d): d is Date => d !== null);
  if (dates.length < 2) return "month";
  const min = Math.min(...dates.map((d) => d.getTime()));
  const max = Math.max(...dates.map((d) => d.getTime()));
  const spanDays = (max - min) / (1000 * 60 * 60 * 24);
  if (spanDays < 90) return "day";
  if (spanDays < 730) return "month";
  return "year";
}

function toBucketKey(
  date: Date,
  granularity: "day" | "month" | "year",
): string {
  if (granularity === "day") return date.toISOString().slice(0, 10);
  if (granularity === "month") return date.toISOString().slice(0, 7);
  return String(date.getUTCFullYear());
}

function aggregateByTime(
  rows: Row[],
  timeColumn: string,
  valueColumn: string | null,
  aggregation: ChartConfig["aggregation"],
): Array<{ key: string; value: number }> {
  const granularity = detectTimeGranularity(rows, timeColumn);
  const buckets = new Map<
    string,
    { sum: number; count: number; min: number | null; max: number | null }
  >();

  for (const row of rows) {
    const dateValue = toDate(row[timeColumn]);
    if (!dateValue) {
      continue;
    }
    const bucket = toBucketKey(dateValue, granularity);
    const current = buckets.get(bucket) ?? {
      sum: 0,
      count: 0,
      min: null,
      max: null,
    };
    const numericValue = valueColumn ? toNumber(row[valueColumn]) : null;

    if (aggregation === "count" || !valueColumn) {
      current.count += 1;
    } else if (numericValue !== null) {
      current.sum += numericValue;
      current.count += 1;
      current.min =
        current.min === null
          ? numericValue
          : Math.min(current.min, numericValue);
      current.max =
        current.max === null
          ? numericValue
          : Math.max(current.max, numericValue);
    }

    buckets.set(bucket, current);
  }

  return Array.from(buckets.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, bucket]) => ({
      key,
      value: reduceAggregate(bucket, aggregation),
    }))
    .filter((entry) => Number.isFinite(entry.value));
}

function aggregateByCategory(
  rows: Row[],
  categoryColumn: string,
  valueColumn: string | null,
  aggregation: ChartConfig["aggregation"],
): Array<{ key: string; value: number }> {
  const buckets = new Map<
    string,
    { sum: number; count: number; min: number | null; max: number | null }
  >();

  for (const row of rows) {
    const rawCategory = row[categoryColumn];
    if (
      rawCategory === null ||
      rawCategory === undefined ||
      rawCategory === ""
    ) {
      continue;
    }
    const key = String(rawCategory);
    const current = buckets.get(key) ?? {
      sum: 0,
      count: 0,
      min: null,
      max: null,
    };
    const numericValue = valueColumn ? toNumber(row[valueColumn]) : null;

    if (aggregation === "count" || !valueColumn) {
      current.count += 1;
    } else if (numericValue !== null) {
      current.sum += numericValue;
      current.count += 1;
      current.min =
        current.min === null
          ? numericValue
          : Math.min(current.min, numericValue);
      current.max =
        current.max === null
          ? numericValue
          : Math.max(current.max, numericValue);
    }

    buckets.set(key, current);
  }

  return Array.from(buckets.entries())
    .map(([key, bucket]) => ({
      key,
      value: reduceAggregate(bucket, aggregation),
    }))
    .filter((entry) => Number.isFinite(entry.value))
    .sort((left, right) => right.value - left.value);
}

function reduceAggregate(
  bucket: {
    sum: number;
    count: number;
    min: number | null;
    max: number | null;
  },
  aggregation: ChartConfig["aggregation"],
): number {
  if (aggregation === "avg") {
    return bucket.count > 0 ? bucket.sum / bucket.count : 0;
  }
  if (aggregation === "min") {
    return bucket.min ?? 0;
  }
  if (aggregation === "max") {
    return bucket.max ?? 0;
  }
  if (aggregation === "count" || aggregation === null) {
    return bucket.count;
  }
  return bucket.sum;
}

function buildAreaInsight(
  series: Array<{ key: string; value: number }>,
  metricLabel: string,
): string {
  if (series.length < 2) {
    return `${metricLabel} has limited time coverage in the uploaded dataset.`;
  }
  const first = series[0].value;
  const last = series[series.length - 1].value;
  if (last > first * 1.05) {
    return `${metricLabel} rises over the observed time period.`;
  }
  if (last < first * 0.95) {
    return `${metricLabel} declines over the observed time period.`;
  }
  return `${metricLabel} stays relatively stable over time.`;
}

function buildBarInsight(
  series: Array<{ key: string; value: number }>,
  groupBy: string,
  metricLabel: string,
): string {
  const top = series[0];
  if (!top) {
    return `No strong ${groupBy} breakout was detected for ${metricLabel}.`;
  }
  return `${top.key} leads ${groupBy} on ${metricLabel}.`;
}

function buildDonutInsight(
  series: Array<{ key: string; value: number }>,
  groupBy: string,
): string {
  const top = series[0];
  if (!top) {
    return `No clear category share was found for ${groupBy}.`;
  }
  const total = series.reduce((sum, entry) => sum + entry.value, 0);
  const share = total > 0 ? Math.round((top.value / total) * 100) : 0;
  return `${top.key} represents about ${share}% of ${groupBy}.`;
}

function buildScatterInsight(
  correlation: number,
  left: string,
  right: string,
): string {
  if (correlation >= BI_RULE_LIMITS.minScatterCorrelation) {
    return `${left} and ${right} move together with a positive correlation.`;
  }
  return `${left} and ${right} move in opposite directions with a negative correlation.`;
}

function buildAreaChart(
  rows: Row[],
  dateColumn: Column,
  numericColumn: Column | null,
): IncomingChartConfig | null {
  const aggregation = numericColumn ? "sum" : "count";
  const series = aggregateByTime(
    rows,
    dateColumn.name,
    numericColumn?.name ?? null,
    aggregation,
  );
  if (series.length < 2) {
    return null;
  }
  const metricLabel = numericColumn ? numericColumn.name : "record count";
  return {
    type: "area",
    title: numericColumn
      ? `${numericColumn.name} over time`
      : `Records over time by ${dateColumn.name}`,
    insight: buildAreaInsight(series, metricLabel),
    columns: numericColumn
      ? [numericColumn.name, dateColumn.name]
      : [dateColumn.name],
    aggregation,
    groupBy: null,
    timeColumn: dateColumn.name,
    size: "large",
  };
}

function buildBarChart(
  rows: Row[],
  categoryColumn: Column,
  numericColumn: Column | null,
): IncomingChartConfig | null {
  const aggregation = numericColumn ? "sum" : "count";
  const series = aggregateByCategory(
    rows,
    categoryColumn.name,
    numericColumn?.name ?? null,
    aggregation,
  );
  if (series.length === 0) {
    return null;
  }
  const metricLabel = numericColumn ? numericColumn.name : "record count";
  return {
    type: "bar",
    title: numericColumn
      ? `${numericColumn.name} by ${categoryColumn.name}`
      : `Records by ${categoryColumn.name}`,
    insight: buildBarInsight(series, categoryColumn.name, metricLabel),
    columns: numericColumn
      ? [numericColumn.name, categoryColumn.name]
      : [categoryColumn.name],
    aggregation,
    groupBy: categoryColumn.name,
    timeColumn: null,
    size: "medium",
  };
}

function buildDonutChart(
  rows: Row[],
  categoryColumn: Column,
  numericColumn: Column | null,
): IncomingChartConfig | null {
  const aggregation = numericColumn ? "sum" : "count";
  const series = aggregateByCategory(
    rows,
    categoryColumn.name,
    numericColumn?.name ?? null,
    aggregation,
  );
  if (series.length === 0) {
    return null;
  }
  return {
    type: "donut",
    title: numericColumn
      ? `${numericColumn.name} share by ${categoryColumn.name}`
      : `${categoryColumn.name} share`,
    insight: buildDonutInsight(series, categoryColumn.name),
    columns: numericColumn
      ? [numericColumn.name, categoryColumn.name]
      : [categoryColumn.name],
    aggregation,
    groupBy: categoryColumn.name,
    timeColumn: null,
    size: "small",
  };
}

function buildScatterChart(
  rows: Row[],
  columns: Column[],
): IncomingChartConfig | null {
  const numericColumns = columns.filter((column) => column.kind === "numeric");
  let best: {
    left: Column;
    right: Column;
    correlation: number;
  } | null = null;

  for (let leftIndex = 0; leftIndex < numericColumns.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < numericColumns.length;
      rightIndex += 1
    ) {
      const left = numericColumns[leftIndex];
      const right = numericColumns[rightIndex];
      const leftValues: number[] = [];
      const rightValues: number[] = [];

      for (const row of rows) {
        const leftValue = toNumber(row[left.name]);
        const rightValue = toNumber(row[right.name]);
        if (leftValue === null || rightValue === null) {
          continue;
        }
        leftValues.push(leftValue);
        rightValues.push(rightValue);
      }

      const correlation = pearsonCorrelation(leftValues, rightValues);
      if (
        correlation === null ||
        Math.abs(correlation) < BI_RULE_LIMITS.minScatterCorrelation
      ) {
        continue;
      }
      if (!best || Math.abs(correlation) > Math.abs(best.correlation)) {
        best = { left, right, correlation };
      }
    }
  }

  if (!best) {
    return null;
  }

  return {
    type: "scatter",
    title: `${best.left.name} vs ${best.right.name}`,
    insight: buildScatterInsight(
      best.correlation,
      best.left.name,
      best.right.name,
    ),
    columns: [best.left.name, best.right.name],
    aggregation: null,
    groupBy: null,
    timeColumn: null,
    size: "medium",
  };
}

function buildSingleValueBar(
  rows: Row[],
  numericColumn: Column,
): IncomingChartConfig | null {
  const values = rows
    .map((row) => toNumber(row[numericColumn.name]))
    .filter((value): value is number => value !== null);
  if (values.length === 0) {
    return null;
  }
  const avg = mean(values);
  return {
    type: "bar",
    title: `Average ${numericColumn.name}`,
    insight: `${numericColumn.name} averages ${Math.round(avg * 100) / 100} across the dataset.`,
    columns: [numericColumn.name],
    aggregation: "avg",
    groupBy: null,
    timeColumn: null,
    size: "small",
  };
}

function buildSingleValueDonut(
  rows: Row[],
  numericColumn: Column,
): IncomingChartConfig | null {
  const values = rows
    .map((row) => toNumber(row[numericColumn.name]))
    .filter((value): value is number => value !== null);
  if (values.length === 0) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    type: "donut",
    title: `${numericColumn.name} share`,
    insight: `${numericColumn.name} totals ${Math.round(total * 100) / 100} across the dataset.`,
    columns: [numericColumn.name],
    aggregation: "sum",
    groupBy: null,
    timeColumn: null,
    size: "small",
  };
}

function buildRecordCountBar(rows: Row[]): IncomingChartConfig | null {
  if (rows.length === 0) {
    return null;
  }
  return {
    type: "bar",
    title: "Record count overview",
    insight: `The dataset contains ${rows.length} uploaded records.`,
    columns: [],
    aggregation: "count",
    groupBy: null,
    timeColumn: null,
    size: "small",
  };
}

function buildRecordCountDonut(rows: Row[]): IncomingChartConfig | null {
  if (rows.length === 0) {
    return null;
  }
  return {
    type: "donut",
    title: "Record count share",
    insight: `All ${rows.length} records are currently in the uploaded slice.`,
    columns: [],
    aggregation: "count",
    groupBy: null,
    timeColumn: null,
    size: "small",
  };
}

function normalizeCharts(
  input: IncomingChartConfig[],
  source: ChartSource,
  chatbotGenerated: boolean,
): ChartConfig[] {
  const timestamp = nowIso();
  return input.map((chart, index) =>
    ChartConfigSchema.parse({
      id: createChartId(index),
      type: chart.type,
      title: chart.title.trim(),
      insight: chart.insight.trim(),
      columns: [...chart.columns],
      aggregation: chart.aggregation,
      groupBy: chart.groupBy,
      timeColumn: chart.timeColumn,
      size: chart.size,
      visible: true,
      order: index,
      source,
      chatbotGenerated,
      generatedAt: timestamp,
    }),
  );
}

export function validateChartCollection(
  charts: ChartConfig[],
  columns: Column[],
  rows: Row[],
): string | null {
  if (
    charts.length < BI_RULE_LIMITS.minCharts ||
    charts.length > BI_RULE_LIMITS.maxCharts
  ) {
    return "invalid_chart_count";
  }

  const columnNames = new Set(columns.map((column) => column.name));
  const duplicateKeys = new Set<string>();

  for (const chart of charts) {
    if (!hasHumanTitle(chart.title) || !chart.insight.trim()) {
      return "invalid_chart_text";
    }

    for (const column of chart.columns) {
      if (!columnNames.has(column)) {
        return "invalid_chart_column";
      }
    }

    if (chart.groupBy && !columnNames.has(chart.groupBy)) {
      return "invalid_group_by";
    }

    if (chart.timeColumn && !columnNames.has(chart.timeColumn)) {
      return "invalid_time_column";
    }

    if (chart.type === "area") {
      const timeColumn = findColumn(columns, chart.timeColumn);
      if (!timeColumn || timeColumn.kind !== "date") {
        return "area_requires_time";
      }
    }

    if (chart.type === "scatter") {
      if (chart.columns.length !== 2) {
        return "scatter_requires_two_columns";
      }
      const pair = chart.columns.map((name) => findColumn(columns, name));
      if (pair.some((column) => !column || column.kind !== "numeric")) {
        return "scatter_requires_numeric_columns";
      }
      const leftValues: number[] = [];
      const rightValues: number[] = [];
      for (const row of rows) {
        const leftValue = toNumber(row[chart.columns[0]]);
        const rightValue = toNumber(row[chart.columns[1]]);
        if (leftValue === null || rightValue === null) {
          continue;
        }
        leftValues.push(leftValue);
        rightValues.push(rightValue);
      }
      const correlation = pearsonCorrelation(leftValues, rightValues);
      if (
        correlation === null ||
        Math.abs(correlation) < BI_RULE_LIMITS.minScatterCorrelation
      ) {
        return "scatter_requires_correlation";
      }
    }

    const duplicateKey = `${chart.type}:${[...chart.columns].sort().join("|")}`;
    if (duplicateKeys.has(duplicateKey)) {
      return "duplicate_chart_type_column";
    }
    duplicateKeys.add(duplicateKey);
  }

  const ordered = [...charts].sort((left, right) => left.order - right.order);
  if (ordered[0]?.order !== 0) {
    return "missing_primary_order";
  }

  return null;
}

function buildFallbackCharts(rows: Row[], columns: Column[]): ChartConfig[] {
  const primaryNumeric = pickPrimaryNumeric(rows, columns);
  const primaryCategory = pickPrimaryCategory(rows, columns);
  const primaryDate = pickPrimaryDate(columns);

  const candidates: IncomingChartConfig[] = [];
  const seen = new Set<string>();

  const maybeAdd = (chart: IncomingChartConfig | null) => {
    if (!chart) {
      return;
    }
    const key = `${chart.type}:${[...chart.columns].sort().join("|")}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    candidates.push(chart);
  };

  if (primaryDate) {
    maybeAdd(buildAreaChart(rows, primaryDate, primaryNumeric));
  }
  if (primaryCategory) {
    maybeAdd(buildBarChart(rows, primaryCategory, primaryNumeric));
    maybeAdd(buildDonutChart(rows, primaryCategory, primaryNumeric));
  }
  maybeAdd(buildScatterChart(rows, columns));
  if (primaryNumeric) {
    maybeAdd(buildSingleValueBar(rows, primaryNumeric));
    maybeAdd(buildSingleValueDonut(rows, primaryNumeric));
  }
  maybeAdd(buildRecordCountBar(rows));
  maybeAdd(buildRecordCountDonut(rows));

  const normalized = normalizeCharts(
    candidates.slice(0, BI_RULE_LIMITS.maxCharts),
    "fallback",
    false,
  );
  const error = validateChartCollection(normalized, columns, rows);
  if (!error) {
    return normalized;
  }
  return normalizeCharts(
    candidates.slice(
      0,
      Math.max(BI_RULE_LIMITS.minCharts, Math.min(2, candidates.length)),
    ),
    "fallback",
    false,
  );
}

function extractText(payload: unknown): string | null {
  if (typeof payload === "string") {
    return payload;
  }
  return null;
}

function parseSuggestionPayload(text: string): IncomingChartConfig[] | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as {
      charts?: Array<Record<string, unknown>>;
    };
    if (!Array.isArray(parsed.charts)) {
      return null;
    }
    return parsed.charts
      .map((chart) => normalizeSuggestedChart(chart))
      .filter((chart): chart is IncomingChartConfig => Boolean(chart));
  } catch {
    return null;
  }
}

function normalizeSuggestedChart(
  chart: Record<string, unknown>,
): IncomingChartConfig | null {
  const type =
    chart.type === "area" ||
    chart.type === "bar" ||
    chart.type === "donut" ||
    chart.type === "scatter" ||
    chart.type === "kpi"
      ? chart.type
      : null;
  if (!type || type === "kpi") {
    return null;
  }

  const aggregation =
    chart.aggregation === null
      ? null
      : ChartAggregationSchema.safeParse(chart.aggregation).success
        ? (chart.aggregation as ChartConfig["aggregation"])
        : null;
  const columns = Array.isArray(chart.columns)
    ? chart.columns.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
    : [];

  return {
    type,
    title: typeof chart.title === "string" ? chart.title : "",
    insight: typeof chart.insight === "string" ? chart.insight : "",
    columns,
    aggregation,
    groupBy: typeof chart.groupBy === "string" ? chart.groupBy : null,
    timeColumn: typeof chart.timeColumn === "string" ? chart.timeColumn : null,
    size:
      chart.size === "small" || chart.size === "large" ? chart.size : "medium",
  };
}

async function suggestChartsWithLLM(
  rows: Row[],
  columns: Column[],
): Promise<ChartConfig[] | null> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    return null;
  }

  const client = new Groq({ apiKey });
  const model = env.GROQ_DASHBOARD_MODEL;
  const prompt = [
    "Return strict JSON only. No prose.",
    `Follow these rules exactly: ${BI_GENERATION_RULES.join(" ")}`,
    'Schema: {"charts":[{"type":"area|bar|donut|scatter","title":"string","insight":"string","columns":["col"],"aggregation":"sum|avg|count|min|max|null","groupBy":"string|null","timeColumn":"string|null","size":"small|medium|large"}]}',
    "Return 2 to 6 charts. Use only provided column names.",
    JSON.stringify({
      rowCount: rows.length,
      columns: columns.map((column) => ({
        name: column.name,
        kind: column.kind,
      })),
      sampleRows: rows.slice(0, 20),
      columnStats: buildColumnPromptStats(rows, columns),
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
    if (!text) {
      return null;
    }
    const parsed = parseSuggestionPayload(text);
    if (!parsed || parsed.length === 0) {
      return null;
    }

    const normalized = normalizeCharts(
      parsed.slice(0, BI_RULE_LIMITS.maxCharts),
      "ai_initial",
      false,
    );
    return validateChartCollection(normalized, columns, rows)
      ? null
      : normalized;
  } catch {
    return null;
  }
}

export async function buildInitialChartConfigs(
  rows: Row[],
  columns: Column[],
): Promise<ChartConfig[]> {
  const suggested = await suggestChartsWithLLM(rows, columns);
  if (suggested) {
    return suggested;
  }
  return buildFallbackCharts(rows, columns);
}

// ── KPI generation: LLM-first, heuristic fallback ──

function buildPrimaryKpi(rows: Row[], column: Column): KPIConfig | null {
  const values = rows
    .map((row) => toNumber(row[column.name]))
    .filter((value): value is number => value !== null);
  if (values.length === 0) {
    return null;
  }

  const lowerName = column.name.toLowerCase();
  const aggregation =
    lowerName.includes("avg") ||
    lowerName.includes("rate") ||
    lowerName.includes("ratio") ||
    lowerName.includes("percent")
      ? "avg"
      : "sum";

  return {
    id: "kpi_primary",
    column: column.name,
    aggregation,
    label:
      aggregation === "avg" ? `Average ${column.name}` : `Total ${column.name}`,
    description: `Primary KPI selected from the highest-variance metric column: ${column.name}.`,
    isPrimary: true,
  };
}

function buildSecondaryNumericKpi(
  rows: Row[],
  column: Column,
): KPIConfig | null {
  const values = rows
    .map((row) => toNumber(row[column.name]))
    .filter((value): value is number => value !== null);
  if (values.length === 0) {
    return null;
  }
  return {
    id: "kpi_peak",
    column: column.name,
    aggregation: "max",
    label: `Peak ${column.name}`,
    description: `Maximum observed value for ${column.name}.`,
    isPrimary: false,
  };
}

function buildCategoryKpi(rows: Row[], column: Column): KPIConfig | null {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const raw = row[column.name];
    if (raw === null || raw === undefined || raw === "") {
      continue;
    }
    const key = String(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let topCategory: string | null = null;
  let topCount = 0;
  for (const [key, count] of counts.entries()) {
    if (count > topCount) {
      topCategory = key;
      topCount = count;
    }
  }
  if (!topCategory) {
    return null;
  }
  return {
    id: "kpi_top_category",
    column: column.name,
    aggregation: "mode",
    label: `Top ${column.name}`,
    description: `${topCategory} appears most often in ${column.name}.`,
    isPrimary: false,
  };
}

function buildDateRangeKpi(rows: Row[], column: Column): KPIConfig | null {
  const dates = rows
    .map((row) => toDate(row[column.name]))
    .filter((value): value is Date => value !== null)
    .sort((left, right) => left.getTime() - right.getTime());
  if (dates.length === 0) {
    return null;
  }
  return {
    id: "kpi_time_span",
    column: column.name,
    aggregation: "range",
    label: `${column.name} span`,
    description: `Coverage runs from ${dates[0].toISOString().slice(0, 10)} to ${dates[dates.length - 1].toISOString().slice(0, 10)}.`,
    isPrimary: false,
  };
}

function buildCountKpi(rows: Row[], column: Column): KPIConfig | null {
  if (rows.length === 0) {
    return null;
  }
  return {
    id: "kpi_row_count",
    column: column.name,
    aggregation: "count",
    label: "Record count",
    description: `Total populated rows counted through ${column.name}.`,
    isPrimary: false,
  };
}

function buildPrimaryRowCountKpi(fallbackColumnName: string): KPIConfig {
  return {
    id: "kpi_primary",
    column: fallbackColumnName,
    aggregation: "count",
    label: "Total Rows",
    description: "Primary KPI fallback based on total uploaded records.",
    isPrimary: true,
  };
}

function buildFallbackKpis(rows: Row[], columns: Column[]): KPIConfig[] {
  const primaryNumeric = pickPrimaryNumeric(rows, columns);
  const primaryCategory = pickPrimaryCategory(rows, columns);
  const primaryDate = pickPrimaryDate(columns);
  const fallbackColumnName = columns[0]?.name ?? "__rows__";

  const kpis = [
    primaryNumeric ? buildPrimaryKpi(rows, primaryNumeric) : null,
    primaryNumeric ? buildSecondaryNumericKpi(rows, primaryNumeric) : null,
    primaryCategory ? buildCategoryKpi(rows, primaryCategory) : null,
    primaryDate ? buildDateRangeKpi(rows, primaryDate) : null,
  ].filter((kpi): kpi is KPIConfig => Boolean(kpi));

  if (!kpis.some((kpi) => kpi.isPrimary)) {
    kpis.unshift(buildPrimaryRowCountKpi(fallbackColumnName));
  }

  if (kpis.length < BI_RULE_LIMITS.minKpis) {
    const fallbackColumn = columns[0] ?? null;
    if (fallbackColumn) {
      const countKpi = buildCountKpi(rows, fallbackColumn);
      if (countKpi && !kpis.some((kpi) => kpi.id === countKpi.id)) {
        kpis.push(countKpi);
      }
    } else if (!kpis.some((kpi) => kpi.id === "kpi_row_count")) {
      kpis.push({
        id: "kpi_row_count",
        column: fallbackColumnName,
        aggregation: "count",
        label: "Rows Loaded",
        description: "Fallback KPI counting uploaded records.",
        isPrimary: false,
      });
    }
  }

  return kpis.slice(0, BI_RULE_LIMITS.maxKpis);
}

function parseKpiSuggestionPayload(text: string): KPIConfig[] | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as {
      kpis?: Array<Record<string, unknown>>;
    };
    if (!Array.isArray(parsed.kpis)) {
      return null;
    }

    const validAggregations = new Set([
      "sum",
      "avg",
      "count",
      "min",
      "max",
      "mode",
      "range",
    ]);

    return parsed.kpis
      .map((kpi, index): KPIConfig | null => {
        const column = typeof kpi.column === "string" ? kpi.column : "";
        const aggregation =
          typeof kpi.aggregation === "string" &&
          validAggregations.has(kpi.aggregation)
            ? kpi.aggregation
            : "sum";
        const label =
          typeof kpi.label === "string" && kpi.label.trim()
            ? kpi.label.trim()
            : "";
        const description =
          typeof kpi.description === "string" && kpi.description.trim()
            ? kpi.description.trim()
            : "";

        if (!column || !label) {
          return null;
        }

        return {
          id: `kpi_ai_${index}`,
          column,
          aggregation,
          label,
          description: description || `${label} computed from ${column}.`,
          isPrimary: index === 0,
        };
      })
      .filter((kpi): kpi is KPIConfig => Boolean(kpi));
  } catch {
    return null;
  }
}

async function suggestKpisWithLLM(
  rows: Row[],
  columns: Column[],
): Promise<KPIConfig[] | null> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    return null;
  }

  const client = new Groq({ apiKey });
  const model = env.GROQ_DASHBOARD_MODEL;

  const numericCols = columns
    .filter((c) => c.kind === "numeric")
    .map((c) => c.name);
  const categoricalCols = columns
    .filter((c) => c.kind === "categorical")
    .map((c) => c.name);
  const dateCols = columns.filter((c) => c.kind === "date").map((c) => c.name);

  const prompt = [
    "Return strict JSON only. No prose.",
    `Generate exactly ${BI_RULE_LIMITS.maxKpis} KPIs for a business dashboard.`,
    "Rules:",
    "- Pick the most business-relevant metrics. Think like a BI analyst.",
    "- Use DIFFERENT columns across KPIs for diversity. Do NOT repeat the same column.",
    "- The first KPI must be the single most important business metric (isPrimary: true).",
    "- Labels should be concise, human-readable, and specific to the data (e.g. 'Revenue' not 'Total column_name').",
    "- Descriptions must contain a specific value or finding from the data, not generic text.",
    `- For numeric columns use aggregations: sum, avg, min, max. For categorical columns use: mode. For date columns use: range. count is for row counting.`,
    `- Available numeric columns: ${JSON.stringify(numericCols)}`,
    `- Available categorical columns: ${JSON.stringify(categoricalCols)}`,
    `- Available date columns: ${JSON.stringify(dateCols)}`,
    'Schema: {"kpis":[{"column":"string","aggregation":"sum|avg|count|min|max|mode|range","label":"string","description":"string"}]}',
    `Return ${BI_RULE_LIMITS.minKpis} to ${BI_RULE_LIMITS.maxKpis} KPIs. The first one is the primary KPI.`,
    JSON.stringify({
      rowCount: rows.length,
      columns: columns.map((column) => ({
        name: column.name,
        kind: column.kind,
      })),
      sampleRows: rows.slice(0, 10),
      columnStats: buildColumnPromptStats(rows, columns),
    }),
  ].join("\n");

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.3,
      max_completion_tokens: 350,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const payload = completion.choices[0]?.message?.content ?? null;
    if (!payload) {
      return null;
    }

    const parsed = parseKpiSuggestionPayload(payload);
    if (!parsed || parsed.length < BI_RULE_LIMITS.minKpis) {
      return null;
    }

    // Validate all referenced columns exist
    const columnNames = new Set(columns.map((c) => c.name));
    const valid = parsed.filter((kpi) => columnNames.has(kpi.column));
    if (valid.length < BI_RULE_LIMITS.minKpis) {
      return null;
    }

    // Ensure exactly one isPrimary
    if (!valid.some((kpi) => kpi.isPrimary)) {
      valid[0].isPrimary = true;
    }

    return valid.slice(0, BI_RULE_LIMITS.maxKpis);
  } catch {
    return null;
  }
}

export async function buildKpiConfigs(
  rows: Row[],
  columns: Column[],
): Promise<KPIConfig[]> {
  const suggested = await suggestKpisWithLLM(rows, columns);
  if (suggested) {
    return suggested;
  }
  return buildFallbackKpis(rows, columns);
}
