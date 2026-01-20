import Papa from "papaparse";
import * as XLSX from "xlsx";

export type DatasetValue = string | number | boolean | Date | null;

export type DatasetRow = Record<string, DatasetValue>;

export type ColumnType = "number" | "date" | "boolean" | "string" | "unknown";
export type ColumnRole = "numeric" | "categorical" | "datetime" | "id_like" | "text_long";

export interface ColumnInfo {
  name: string;
  type: ColumnType;
}

export interface NumericStats {
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  sum: number | null;
  count: number;
}

export interface CategoricalStats {
  topValue: string | null;
  topCount: number;
}

export interface DateRangeStats {
  min: Date | null;
  max: Date | null;
}

export interface DatasetStats {
  numeric: Record<string, NumericStats>;
  categorical: Record<string, CategoricalStats>;
  dateRanges: Record<string, DateRangeStats>;
}

export interface ColumnProfile {
  name: string;
  role: ColumnRole;
  missingRate: number;
  cardinality: number;
  uniqueRatio: number;
  avgLength: number;
  dateParseSuccess: number;
  isIdLike: boolean;
  isTextLong: boolean;
}

export interface DatasetProfile {
  columns: ColumnProfile[];
  rowCount: number;
}

export interface DatasetState {
  fileName: string;
  rows: DatasetRow[];
  columns: ColumnInfo[];
  stats: DatasetStats;
  profile: DatasetProfile;
}

export interface ChartConfig {
  id: string;
  type: "line" | "bar";
  title: string;
  subtitle: string;
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
}

const dateFormatOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "2-digit",
};

const numericFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function looksLikeNumber(value: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(value);
}

function looksLikeDate(value: string): boolean {
  return /[-/]|T|:/.test(value);
}

function normalizeValue(value: unknown): DatasetValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (looksLikeNumber(trimmed)) {
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? numeric : trimmed;
    }

    if (looksLikeDate(trimmed)) {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    if (trimmed.toLowerCase() === "true") {
      return true;
    }
    if (trimmed.toLowerCase() === "false") {
      return false;
    }

    return trimmed;
  }

  return String(value);
}

function normalizeRows(rows: Record<string, unknown>[]): DatasetRow[] {
  return rows.map((row) => {
    const next: DatasetRow = {};
    for (const [key, value] of Object.entries(row)) {
      next[key] = normalizeValue(value);
    }
    return next;
  });
}

function getColumnNames(rows: DatasetRow[], seedColumns?: string[]): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  if (seedColumns) {
    for (const name of seedColumns) {
      if (!seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
  }
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        names.push(key);
      }
    }
  }
  return names;
}

function detectValueType(value: DatasetValue): ColumnType {
  if (value === null) {
    return "unknown";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (value instanceof Date) {
    return "date";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (typeof value === "string") {
    return "string";
  }
  return "unknown";
}

function inferColumns(rows: DatasetRow[], seedColumns?: string[]): ColumnInfo[] {
  const columns = getColumnNames(rows, seedColumns);
  return columns.map((name) => {
    const counts: Record<ColumnType, number> = {
      number: 0,
      date: 0,
      boolean: 0,
      string: 0,
      unknown: 0,
    };

    for (const row of rows) {
      const value = row[name];
      const type = detectValueType(value);
      counts[type] += 1;
    }

    let type: ColumnType = "unknown";
    if (counts.date > 0 && counts.date >= counts.number && counts.date >= counts.string) {
      type = "date";
    } else if (counts.number > 0 && counts.number >= counts.string) {
      type = "number";
    } else if (counts.boolean > 0 && counts.boolean >= counts.string) {
      type = "boolean";
    } else if (counts.string > 0) {
      type = "string";
    }

    return { name, type };
  });
}

function computeNumericStats(values: number[]): NumericStats {
  if (!values.length) {
    return { min: null, max: null, mean: null, median: null, sum: null, count: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return {
    min: sorted[0] ?? null,
    max: sorted[sorted.length - 1] ?? null,
    mean: sum / sorted.length,
    median,
    sum,
    count: sorted.length,
  };
}

function computeCategoricalStats(values: DatasetValue[]): CategoricalStats {
  if (!values.length) {
    return { topValue: null, topCount: 0 };
  }
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value === null) {
      continue;
    }
    const key = value instanceof Date ? value.toISOString() : String(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let topValue: string | null = null;
  let topCount = 0;
  for (const [value, count] of counts.entries()) {
    if (count > topCount) {
      topValue = value;
      topCount = count;
    }
  }
  return { topValue, topCount };
}

function computeDateRange(values: DatasetValue[]): DateRangeStats {
  const dates = values
    .filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()))
    .map((value) => value.getTime());
  if (!dates.length) {
    return { min: null, max: null };
  }
  const min = new Date(Math.min(...dates));
  const max = new Date(Math.max(...dates));
  return { min, max };
}

function buildStats(rows: DatasetRow[], columns: ColumnInfo[]): DatasetStats {
  const numeric: Record<string, NumericStats> = {};
  const categorical: Record<string, CategoricalStats> = {};
  const dateRanges: Record<string, DateRangeStats> = {};

  for (const column of columns) {
    const values = rows.map((row) => row[column.name]).filter((value) => value !== null);
    if (column.type === "number") {
      const numericValues = values.filter((value): value is number => typeof value === "number");
      numeric[column.name] = computeNumericStats(numericValues);
    } else if (column.type === "date") {
      dateRanges[column.name] = computeDateRange(values);
    } else if (column.type === "string" || column.type === "boolean") {
      categorical[column.name] = computeCategoricalStats(values);
    }
  }

  return { numeric, categorical, dateRanges };
}

const ID_HINTS = ["id", "uuid", "submission", "key", "hash"];
const LONG_TEXT_THRESHOLD = 40;

function hasHint(name: string, hints: string[]): boolean {
  const lower = name.toLowerCase();
  return hints.some((hint) => lower.includes(hint));
}

function buildProfile(rows: DatasetRow[], columns: ColumnInfo[]): DatasetProfile {
  const profiles = columns.map((column) => {
    const values = rows.map((row) => row[column.name]);
    const nonNull = values.filter((value) => value !== null && value !== undefined);
    const missingRate = rows.length === 0 ? 0 : 1 - nonNull.length / rows.length;
    const uniqueValues = new Set(nonNull.map((value) => String(value)));
    const uniqueRatio = nonNull.length === 0 ? 0 : uniqueValues.size / nonNull.length;
    const cardinality = uniqueValues.size;

    let stringCount = 0;
    let totalLength = 0;
    let dateCount = 0;
    for (const value of nonNull) {
      if (typeof value === "string") {
        stringCount += 1;
        totalLength += value.length;
      }
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        dateCount += 1;
      }
    }
    const avgLength = stringCount === 0 ? 0 : totalLength / stringCount;
    const dateParseSuccess = nonNull.length === 0 ? 0 : dateCount / nonNull.length;
    const isIdLike = hasHint(column.name, ID_HINTS) || uniqueRatio > 0.98;
    const isTextLong = avgLength >= LONG_TEXT_THRESHOLD;

    let role: ColumnRole = "categorical";
    if (isIdLike) {
      role = "id_like";
    } else if (isTextLong) {
      role = "text_long";
    } else if (column.type === "date" && dateParseSuccess >= 0.7) {
      role = "datetime";
    } else if (column.type === "number") {
      role = "numeric";
    } else {
      role = "categorical";
    }

    return {
      name: column.name,
      role,
      missingRate,
      cardinality,
      uniqueRatio,
      avgLength,
      dateParseSuccess,
      isIdLike,
      isTextLong,
    };
  });

  return { columns: profiles, rowCount: rows.length };
}

export async function parseDatasetFile(file: File): Promise<DatasetState> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  let rawRows: Record<string, unknown>[] = [];
  let seedColumns: string[] | undefined;

  if (extension === "csv") {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    rawRows = parsed.data.filter((row) => Object.keys(row).length > 0);
    seedColumns = parsed.meta.fields ?? undefined;
  } else if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (sheetName) {
      const sheet = workbook.Sheets[sheetName];
      rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    }
  }

  const rows = normalizeRows(rawRows);
  const columns = inferColumns(rows, seedColumns);
  const stats = buildStats(rows, columns);
  const profile = buildProfile(rows, columns);

  return {
    fileName: file.name,
    rows,
    columns,
    stats,
    profile,
  };
}

function aggregateByDate(
  rows: DatasetRow[],
  dateKey: string,
  valueKey?: string
): Array<Record<string, string | number>> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const raw = row[dateKey];
    if (!(raw instanceof Date)) {
      continue;
    }
    const key = raw.toISOString().slice(0, 10);
    const value = valueKey && typeof row[valueKey] === "number" ? (row[valueKey] as number) : 1;
    totals.set(key, (totals.get(key) ?? 0) + value);
  }
  return Array.from(totals.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, value]) => ({ date, value }));
}

function aggregateByCategory(
  rows: DatasetRow[],
  categoryKey: string,
  valueKey?: string
): Array<Record<string, string | number>> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const raw = row[categoryKey];
    if (raw === null || raw === undefined) {
      continue;
    }
    const key = raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw);
    const value = valueKey && typeof row[valueKey] === "number" ? (row[valueKey] as number) : 1;
    totals.set(key, (totals.get(key) ?? 0) + value);
  }
  return Array.from(totals.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([category, value]) => ({ category, value }));
}

export function buildCharts(dataset: DatasetState): ChartConfig[] {
  const dateColumn = dataset.columns.find((column) => column.type === "date");
  const numericColumn = dataset.columns.find((column) => column.type === "number");
  const categoricalColumn = dataset.columns.find(
    (column) => column.type === "string" || column.type === "boolean"
  );

  const charts: ChartConfig[] = [];

  if (dateColumn) {
    const data = aggregateByDate(dataset.rows, dateColumn.name, numericColumn?.name);
    if (data.length > 0) {
      charts.push({
        id: "time-series",
        type: "line",
        title: numericColumn ? `${numericColumn.name} over time` : "Records over time",
        subtitle: `By ${dateColumn.name}`,
        data,
        xKey: "date",
        yKey: "value",
      });
    }
  }

  if (categoricalColumn) {
    const data = aggregateByCategory(dataset.rows, categoricalColumn.name, numericColumn?.name);
    if (data.length > 0) {
      charts.push({
        id: "category-breakdown",
        type: "bar",
        title: numericColumn
          ? `${numericColumn.name} by ${categoricalColumn.name}`
          : `Records by ${categoricalColumn.name}`,
        subtitle: `Top ${Math.min(12, data.length)} categories`,
        data,
        xKey: "category",
        yKey: "value",
      });
    }
  }

  return charts;
}

export function formatDateRange(range: DateRangeStats): string | null {
  if (!range.min || !range.max) {
    return null;
  }
  const formatter = new Intl.DateTimeFormat("en-US", dateFormatOptions);
  const min = formatter.format(range.min);
  const max = formatter.format(range.max);
  return min === max ? min : `${min} → ${max}`;
}

export function formatNumber(value: number | null): string | null {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  return numericFormatter.format(value);
}

export function getPrimaryMetricLabel(columnName: string): "sum" | "average" {
  const lowered = columnName.toLowerCase();
  if (
    lowered.includes("avg") ||
    lowered.includes("average") ||
    lowered.includes("mean") ||
    lowered.includes("rate") ||
    lowered.includes("ratio") ||
    lowered.includes("percent") ||
    lowered.includes("percentage") ||
    lowered.includes("pct")
  ) {
    return "average";
  }
  return "sum";
}
