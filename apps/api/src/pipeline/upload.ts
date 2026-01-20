import path from "path";
import Papa from "papaparse";
import XLSX from "xlsx";
import type {
  ChartPayload,
  ChartSpec,
  DashboardChart,
  DashboardState,
  DatasetMeta,
} from "@tada/shared";
import type { NormalizationDebug } from "../legacy/data/normalize";
import { setDatasetRecord } from "../state-store";

type ColumnType = "metric" | "date" | "dimension" | "categorical";
type NormalizedRow = Record<string, string | number | boolean | null>;

const DATE_RATIO = 0.7;
const NUMERIC_RATIO = 0.7;
const BOOLEAN_RATIO = 0.9;
const TOP_VALUES_LIMIT = 10;
const BIN_COUNT = 10;
const SAMPLE_LIMIT = 5;
const TABLE_LIMIT = 15;

let datasetCounter = 0;

function nextDatasetId(): string {
  datasetCounter += 1;
  return `dataset_${datasetCounter}`;
}

function parseCsv(buffer: Buffer): Record<string, unknown>[] {
  const parsed = Papa.parse<Record<string, unknown>>(buffer.toString("utf8"), {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data.filter((row) => Object.keys(row).length > 0);
}

function parseXlsx(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

function parseUpload(file: Express.Multer.File): Record<string, unknown>[] {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".csv" || file.mimetype.includes("csv")) {
    return parseCsv(file.buffer);
  }
  if (ext === ".xlsx" || ext === ".xls") {
    return parseXlsx(file.buffer);
  }
  return [];
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "true") {
      return true;
    }
    if (trimmed === "false") {
      return false;
    }
  }
  return null;
}

function parseDate(value: unknown): number | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const hasDateHints = /[a-zA-Z\/:\-]/.test(trimmed);
    if (!hasDateHints) {
      return null;
    }
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function normalizeCategory(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }
  return String(value);
}

function detectColumnTypes(rows: Record<string, unknown>[]): Record<string, ColumnType> {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const types: Record<string, ColumnType> = {};

  for (const column of columns) {
    const values = rows.map((row) => row[column]).filter((value) => value !== null && value !== undefined && value !== "");
    const total = values.length || 1;
    let numericCount = 0;
    let dateCount = 0;
    let booleanCount = 0;

    for (const value of values) {
      if (parseNumeric(value) !== null) {
        numericCount += 1;
        continue;
      }
      if (parseDate(value) !== null) {
        dateCount += 1;
        continue;
      }
      if (parseBoolean(value) !== null) {
        booleanCount += 1;
      }
    }

    const numericRatio = numericCount / total;
    const dateRatio = dateCount / total;
    const booleanRatio = booleanCount / total;
    const uniqueRatio = total === 0 ? 0 : new Set(values.map((value) => String(value))).size / total;

    if (dateRatio >= DATE_RATIO) {
      types[column] = "date";
    } else if (numericRatio >= NUMERIC_RATIO) {
      types[column] = "metric";
    } else if (booleanRatio >= BOOLEAN_RATIO || uniqueRatio <= 0.2) {
      types[column] = "dimension";
    } else {
      types[column] = "categorical";
    }
  }

  return types;
}

function normalizeRows(
  rows: Record<string, unknown>[],
  types: Record<string, ColumnType>
): NormalizedRow[] {
  return rows.map((row) => {
    const next: NormalizedRow = {};
    for (const column of Object.keys(types)) {
      const raw = row[column];
      if (raw === null || raw === undefined || raw === "") {
        next[column] = null;
        continue;
      }
      const type = types[column];
      if (type === "metric") {
        next[column] = parseNumeric(raw);
        continue;
      }
      if (type === "date") {
        next[column] = parseDate(raw);
        continue;
      }
      const bool = parseBoolean(raw);
      next[column] = bool !== null ? bool : String(raw);
    }
    return next;
  });
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function buildDatasetMeta(
  rows: NormalizedRow[],
  types: Record<string, ColumnType>
): DatasetMeta {
  const columns = Object.keys(types).map((name) => ({ name, type: types[name] }));
  const numericStats: DatasetMeta["numericStats"] = {};
  const topCategoricalValues: DatasetMeta["topCategoricalValues"] = {};
  const dateRanges: DatasetMeta["dateRanges"] = {};

  for (const column of columns) {
    const values = rows.map((row) => row[column.name]).filter((value) => value !== null);
    if (column.type === "metric") {
      const nums = values.filter((value): value is number => typeof value === "number");
      const min = nums.length ? Math.min(...nums) : null;
      const max = nums.length ? Math.max(...nums) : null;
      const mean = nums.length ? nums.reduce((sum, val) => sum + val, 0) / nums.length : null;
      numericStats[column.name] = { min, max, mean, median: median(nums) };
    }
    if (column.type === "categorical" || column.type === "dimension") {
      const counts = new Map<string, number>();
      for (const value of values) {
        const key = normalizeCategory(value);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const topValues = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_VALUES_LIMIT)
        .map(([value, count]) => ({ value, count }));
      topCategoricalValues[column.name] = topValues;
    }
    if (column.type === "date") {
      const nums = values.filter((value): value is number => typeof value === "number");
      const min = nums.length ? Math.min(...nums) : null;
      const max = nums.length ? Math.max(...nums) : null;
      dateRanges[column.name] = { min, max };
    }
  }

  return {
    columns,
    rowCount: rows.length,
    sampleRows: rows.slice(0, SAMPLE_LIMIT),
    numericStats,
    topCategoricalValues,
    dateRanges,
  };
}

function buildTablePayload(rows: NormalizedRow[], columns: string[]): ChartPayload {
  const data = rows.slice(0, TABLE_LIMIT).map((row) => {
    const next: Record<string, unknown> = {};
    for (const column of columns) {
      next[column] = row[column] ?? null;
    }
    return next;
  });
  return { columns, rows: data };
}

function buildCategoricalPayload(
  rows: NormalizedRow[],
  xKey: string,
  yKey: string | undefined,
  aggregation: "sum" | "avg" | "count"
): ChartPayload {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const xValue = normalizeCategory(row[xKey]);
    const entry = totals.get(xValue) ?? { sum: 0, count: 0 };
    if (aggregation === "count" || !yKey) {
      entry.count += 1;
    } else {
      const yValue = row[yKey];
      if (typeof yValue === "number") {
        entry.sum += yValue;
        entry.count += 1;
      }
    }
    totals.set(xValue, entry);
  }

  const values = Array.from(totals.entries()).map(([x, entry]) => {
    const value =
      aggregation === "avg"
        ? entry.count
          ? entry.sum / entry.count
          : 0
        : aggregation === "sum"
          ? entry.sum
          : entry.count;
    return [x, value] as const;
  });

  const sorted = values.sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, TOP_VALUES_LIMIT);
  const remainder = sorted.slice(TOP_VALUES_LIMIT);
  if (remainder.length) {
    const otherSum = remainder.reduce((sum, [, value]) => sum + value, 0);
    top.push(["Other", otherSum]);
  }

  const data = top.map(([x, y]) => ({ x, y }));
  return { data, xKey: "x", yKey: "y" };
}

function buildDistributionPayload(values: number[]): ChartPayload {
  if (!values.length) {
    return { data: [], xKey: "x", yKey: "y" };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return { data: [{ x: String(min), y: values.length }], xKey: "x", yKey: "y" };
  }
  const step = (max - min) / BIN_COUNT;
  const bins = Array.from({ length: BIN_COUNT }, (_, index) => ({
    start: min + step * index,
    end: index === BIN_COUNT - 1 ? max : min + step * (index + 1),
    count: 0,
  }));
  for (const value of values) {
    const position = Math.min(Math.floor((value - min) / step), BIN_COUNT - 1);
    bins[position].count += 1;
  }
  const data = bins.map((bin) => ({
    x: `${bin.start.toFixed(2)}-${bin.end.toFixed(2)}`,
    y: bin.count,
  }));
  return { data, xKey: "x", yKey: "y" };
}

function buildTimeSeriesPayload(
  rows: NormalizedRow[],
  xKey: string,
  yKey: string | undefined,
  aggregation: "sum" | "avg" | "count"
): ChartPayload {
  const timestamps = rows
    .map((row) => row[xKey])
    .filter((value): value is number => typeof value === "number");
  if (!timestamps.length) {
    return { data: [], xKey: "x", yKey: "y" };
  }
  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  const spanDays = (max - min) / (1000 * 60 * 60 * 24);
  const bucket = spanDays > 365 ? "month" : "day";
  const totals = new Map<number, { sum: number; count: number }>();

  for (const row of rows) {
    const raw = row[xKey];
    if (typeof raw !== "number") {
      continue;
    }
    const date = new Date(raw);
    const bucketDate =
      bucket === "month"
        ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
        : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const key = bucketDate.getTime();
    const entry = totals.get(key) ?? { sum: 0, count: 0 };
    if (aggregation === "count" || !yKey) {
      entry.count += 1;
    } else {
      const yValue = row[yKey];
      if (typeof yValue === "number") {
        entry.sum += yValue;
        entry.count += 1;
      }
    }
    totals.set(key, entry);
  }

  const data = Array.from(totals.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([x, entry]) => {
      const value =
        aggregation === "avg"
          ? entry.count
            ? entry.sum / entry.count
            : 0
          : aggregation === "sum"
            ? entry.sum
            : entry.count;
      return { x, y: value };
    });
  return { data, xKey: "x", yKey: "y" };
}

function computeKpis(rows: NormalizedRow[], types: Record<string, ColumnType>) {
  const rowCount = rows.length;
  const columnCount = Object.keys(types).length;
  const totalCells = rowCount * columnCount;
  let missing = 0;
  for (const row of rows) {
    for (const column of Object.keys(types)) {
      if (row[column] === null || row[column] === undefined || row[column] === "") {
        missing += 1;
      }
    }
  }
  const missingRate = totalCells === 0 ? 0 : missing / totalCells;
  const numericColumns = Object.values(types).filter((type) => type === "metric").length;
  return { rowCount, columnCount, missingRate, numericColumns };
}

function chartId(base: string, used: Set<string>): string {
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

function buildCharts(
  rows: NormalizedRow[],
  types: Record<string, ColumnType>
): DashboardChart[] {
  const used = new Set<string>();
  const charts: DashboardChart[] = [];
  const columns = Object.keys(types);
  const metric = columns.find((col) => types[col] === "metric");
  const date = columns.find((col) => types[col] === "date");
  const categorical = columns.find(
    (col) => types[col] === "categorical" || types[col] === "dimension"
  );

  if (date) {
    const spec: ChartSpec = {
      id: chartId("chart_time", used),
      type: "line",
      x: date,
      y: metric ?? undefined,
      title: metric ? `${metric} over time` : "Records over time",
      colorIntent: "time",
      aggregation: metric ? "sum" : "count",
    };
    const payload = buildTimeSeriesPayload(rows, spec.x, spec.y, spec.aggregation ?? "count");
    charts.push({ id: spec.id, spec, payload });
  }

  if (categorical) {
    const spec: ChartSpec = {
      id: chartId("chart_categories", used),
      type: "bar",
      x: categorical,
      y: metric ?? undefined,
      title: metric ? `${metric} by ${categorical}` : `Top ${categorical}`,
      colorIntent: "categorical",
      aggregation: metric ? "sum" : "count",
    };
    const payload = buildCategoricalPayload(rows, spec.x, spec.y, spec.aggregation ?? "count");
    charts.push({ id: spec.id, spec, payload });
  }

  if (metric) {
    const spec: ChartSpec = {
      id: chartId("chart_distribution", used),
      type: "bar",
      x: metric,
      title: `Distribution of ${metric}`,
      colorIntent: "distribution",
      aggregation: "count",
    };
    const values = rows
      .map((row) => row[metric])
      .filter((value): value is number => typeof value === "number");
    const payload = buildDistributionPayload(values);
    charts.push({ id: spec.id, spec, payload });
  }

  const tableColumns = columns.slice(0, 2);
  const spec: ChartSpec = {
    id: chartId("chart_table", used),
    type: "table",
    x: tableColumns[0] ?? "column",
    y: tableColumns[1],
    title: "Sample records",
    colorIntent: "focus",
    aggregation: "count",
  };
  const payload = buildTablePayload(rows, [spec.x, spec.y].filter(Boolean) as string[]);
  charts.push({ id: spec.id, spec, payload });

  while (charts.length < 4) {
    const fillSpec: ChartSpec = {
      id: chartId("chart_table", used),
      type: "table",
      x: tableColumns[0] ?? "column",
      y: tableColumns[1],
      title: "Sample records",
      colorIntent: "focus",
      aggregation: "count",
    };
    const fillPayload = buildTablePayload(rows, [fillSpec.x, fillSpec.y].filter(Boolean) as string[]);
    charts.push({ id: fillSpec.id, spec: fillSpec, payload: fillPayload });
  }

  return charts.slice(0, 4);
}

function buildDebug(types: Record<string, ColumnType>): NormalizationDebug {
  return {
    detectedColumnTypes: types,
    dateParseSuccess: {},
    durationUnitCounts: { minutes: 0, seasons: 0 },
    warnings: [],
  };
}

export async function handleUpload(file: Express.Multer.File): Promise<{
  dashboardState: DashboardState;
  debug: NormalizationDebug;
}> {
  const rawRows = parseUpload(file);
  const types = detectColumnTypes(rawRows);
  const rows = normalizeRows(rawRows, types);
  const meta = buildDatasetMeta(rows, types);

  const kpis = computeKpis(rows, types);
  void kpis;

  const dashboardState: DashboardState = {
    version: 1,
    datasetId: nextDatasetId(),
    datasetTopic: "Dataset overview",
    datasetMeta: meta,
    charts: buildCharts(rows, types),
    hiddenChartIds: [],
  };

  setDatasetRecord(dashboardState.datasetId, {
    normalizedRows: rows,
    meta,
    dashboardState,
    debug: buildDebug(types),
  });

  return { dashboardState, debug: buildDebug(types) };
}
