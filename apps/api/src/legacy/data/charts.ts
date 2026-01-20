import type { ChartPayload, ChartSpec } from "@tada/shared";
import type { NormalizedRow } from "../../state-store";

const TOP_CATEGORY_LIMIT = 12;
const BIN_COUNT = 10;

function normalizeCategory(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }
  return String(value);
}

function aggregateByCategory(
  rows: NormalizedRow[],
  xKey: string,
  yKey: string | undefined,
  aggregation: "sum" | "avg" | "count"
): Array<{ x: string; y: number }> {
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
      aggregation === "avg" ? (entry.count ? entry.sum / entry.count : 0) : aggregation === "sum"
        ? entry.sum
        : entry.count;
    return [x, value] as const;
  });

  const sorted = values.sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, TOP_CATEGORY_LIMIT);
  const remainder = sorted.slice(TOP_CATEGORY_LIMIT);
  if (remainder.length) {
    const otherSum = remainder.reduce((sum, [, value]) => sum + value, 0);
    top.push(["Other", otherSum]);
  }
  return top.map(([x, y]) => ({ x, y }));
}

function bucketByTime(
  rows: NormalizedRow[],
  xKey: string,
  yKey: string | undefined,
  aggregation: "sum" | "avg" | "count"
): Array<{ x: number; y: number }> {
  const timestamps = rows
    .map((row) => row[xKey])
    .filter((value): value is number => typeof value === "number");
  if (!timestamps.length) {
    return [];
  }
  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  const spanDays = (max - min) / (1000 * 60 * 60 * 24);
  const bucket = spanDays <= 90 ? "day" : spanDays <= 730 ? "month" : "year";
  const totals = new Map<number, { sum: number; count: number }>();

  for (const row of rows) {
    const raw = row[xKey];
    if (typeof raw !== "number") {
      continue;
    }
    const date = new Date(raw);
    const bucketDate =
      bucket === "year"
        ? new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
        : bucket === "day"
          ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
        : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
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

  return Array.from(totals.entries())
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
}

function bucketNumericDistribution(values: number[]): Array<{ x: string; y: number }> {
  if (!values.length) {
    return [];
  }
  const uniqueValues = new Set(values);
  if (uniqueValues.size <= 12) {
    const counts = new Map<number, number>();
    for (const value of values) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([x, y]) => ({ x: String(x), y }));
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return [{ x: `${min}`, y: values.length }];
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
  return bins.map((bin) => ({
    x: `${bin.start.toFixed(2)}-${bin.end.toFixed(2)}`,
    y: bin.count,
  }));
}

export function buildChartPayload(spec: ChartSpec, rows: NormalizedRow[]): ChartPayload {
  let chartRows = rows;
  let xKey = spec.x;
  if (
    spec.x.toLowerCase().includes("duration") &&
    rows.some((row) => row.duration_unit !== undefined)
  ) {
    const minutesCount = rows.filter((row) => row.duration_unit === "min").length;
    const seasonsCount = rows.filter((row) => row.duration_unit === "season").length;
    const useMinutes = minutesCount >= seasonsCount;
    xKey = useMinutes ? "duration_minutes" : "seasons_count";
    chartRows = rows.filter((row) => row[xKey] !== null);
  }

  if (spec.type === "table") {
    const columns = spec.y ? [xKey, spec.y] : [xKey];
    const data = chartRows.slice(0, 15).map((row) => {
      const next: Record<string, unknown> = {};
      for (const column of columns) {
        next[column] = row[column] ?? null;
      }
      return next;
    });
    return { columns, rows: data };
  }

  const aggregation = spec.aggregation ?? (spec.y ? "sum" : "count");
  const xValues = chartRows.map((row) => row[xKey]).filter((value) => value !== null);
  const isDate = xValues.some((value) => typeof value === "number") && spec.type === "line";

  if (isDate) {
    const data = bucketByTime(chartRows, xKey, spec.y, aggregation);
    return { data, xKey: "x", yKey: "y" };
  }

  const numericXValues = chartRows
    .map((row) => row[xKey])
    .filter((value): value is number => typeof value === "number");
  if (spec.type === "bar" && aggregation === "count" && numericXValues.length) {
    const data = bucketNumericDistribution(numericXValues);
    return { data, xKey: "x", yKey: "y" };
  }

  const data = aggregateByCategory(chartRows, xKey, spec.y, aggregation);
  return { data, xKey: "x", yKey: "y" };
}
