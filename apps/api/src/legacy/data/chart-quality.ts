import type { ChartPayload, ChartSpec, DashboardChart } from "@tada/shared";
import type { NormalizedRow } from "../../state-store";
import type { ColumnProfile, DatasetProfile } from "./profile-dataset";

type RawChartCandidate = {
  id: string;
  spec: ChartSpec;
  payload: ChartPayload;
};

const MIN_POINTS = 3;
const MAX_CATEGORIES = 12;
const MIN_BINS = 8;
const MAX_BINS = 20;
const DATE_HINTS = ["date", "time", "timestamp", "created", "updated", "_at"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getColumn(profile: DatasetProfile, name: string): ColumnProfile | undefined {
  return profile.columns.find((column) => column.name === name);
}

function hasDateHint(name: string): boolean {
  const lower = name.toLowerCase();
  return DATE_HINTS.some((hint) => lower.includes(hint));
}

function isTimeLike(column: ColumnProfile | undefined): boolean {
  if (!column) {
    return false;
  }
  if (column.role === "datetime") {
    return true;
  }
  if (column.dateParseSuccess >= 0.7) {
    return true;
  }
  return hasDateHint(column.name);
}

function isIdLike(column: ColumnProfile | undefined): boolean {
  return column?.isIdLike ?? false;
}

function isTextLike(column: ColumnProfile | undefined): boolean {
  if (!column) {
    return false;
  }
  if (column.isTextLong) {
    return true;
  }
  return column.uniqueRatio > 0.9 && column.avgLength > 20;
}

function humanizeName(name: string): string {
  let label = name;
  label = label.replace(/(_id|_key|_raw)$/i, "");
  label = label.replace(/(Id|Key|Raw)$/g, "");
  label = label.replace(/[_-]+/g, " ");
  label = label.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  label = label.replace(/\s+/g, " ").trim();
  if (!label) {
    return name;
  }
  return label.replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatCompact(value: number, maxFractionDigits: number): string {
  const abs = Math.abs(value);
  const units = [
    { value: 1e9, suffix: "B" },
    { value: 1e6, suffix: "M" },
    { value: 1e3, suffix: "k" },
  ];
  const unit = units.find((entry) => abs >= entry.value);
  if (!unit) {
    return formatNumber(value, maxFractionDigits);
  }
  const scaled = value / unit.value;
  return `${formatNumber(scaled, maxFractionDigits)}${unit.suffix}`;
}

function formatNumber(value: number, maxFractionDigits: number): string {
  const rounded = value.toFixed(maxFractionDigits);
  return rounded.replace(/\.0+$/, "").replace(/(\.\d)0$/, "$1");
}

function formatRangeLabel(start: number, end: number): string {
  const max = Math.max(Math.abs(start), Math.abs(end));
  const isInteger = Math.abs(start - Math.round(start)) < 1e-6 && Math.abs(end - Math.round(end)) < 1e-6;
  const maxFractionDigits = isInteger ? 0 : max >= 100 ? 0 : max >= 10 ? 1 : 2;
  const format = (value: number) => (max >= 1000 ? formatCompact(value, maxFractionDigits) : formatNumber(value, maxFractionDigits));
  return `${format(start)}-${format(end)}`;
}

function ensureAggregation(spec: ChartSpec): ChartSpec {
  if (spec.aggregation) {
    return spec;
  }
  return spec.y ? { ...spec, aggregation: "sum" } : { ...spec, aggregation: "count" };
}

function normalizeCategory(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }
  return String(value);
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) {
    return 0;
  }
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function formatDateLabel(timestamp: number, interval: "day" | "week" | "month"): string {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  if (interval === "month") {
    return `${MONTHS[month]} ${year}`;
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function buildTablePayload(
  rows: NormalizedRow[],
  xKey: string,
  yKey?: string
): ChartPayload {
  const columns = yKey ? [xKey, yKey] : [xKey];
  const labelMap = new Map<string, string>();
  for (const column of columns) {
    labelMap.set(column, humanizeName(column));
  }
  const data = rows.slice(0, 20).map((row) => {
    const next: Record<string, unknown> = {};
    for (const column of columns) {
      const label = labelMap.get(column) ?? column;
      next[label] = row[column] ?? null;
    }
    return next;
  });
  return {
    columns: columns.map((column) => labelMap.get(column) ?? column),
    rows: data,
  };
}

function buildCategoricalData(
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
  const top = sorted.slice(0, MAX_CATEGORIES);
  const remainder = sorted.slice(MAX_CATEGORIES);
  if (remainder.length) {
    const otherSum = remainder.reduce((sum, [, value]) => sum + value, 0);
    top.push(["Other", otherSum]);
  }
  return top.map(([x, y]) => ({ x, y }));
}

function buildDistributionData(values: number[]): Array<{ x: string; y: number }> {
  if (values.length < MIN_POINTS) {
    return [];
  }
  const sorted = [...values].sort((a, b) => a - b);
  const p1 = percentile(sorted, 0.01);
  const p99 = percentile(sorted, 0.99);
  if (p1 === p99) {
    return [];
  }
  const filtered = values.filter((value) => value >= p1 && value <= p99);
  if (filtered.length < MIN_POINTS) {
    return [];
  }
  const binCount = clamp(Math.round(Math.sqrt(filtered.length)), MIN_BINS, MAX_BINS);
  const min = p1;
  const max = p99;
  const step = (max - min) / binCount;
  if (step <= 0) {
    return [];
  }
  const bins = Array.from({ length: binCount }, (_, index) => ({
    start: min + step * index,
    end: index === binCount - 1 ? max : min + step * (index + 1),
    count: 0,
  }));
  for (const value of filtered) {
    const position = Math.min(Math.floor((value - min) / step), binCount - 1);
    bins[position].count += 1;
  }
  return bins.map((bin) => ({
    x: formatRangeLabel(bin.start, bin.end),
    y: bin.count,
  }));
}

function buildTimeSeriesData(
  rows: NormalizedRow[],
  xKey: string,
  yKey: string | undefined,
  aggregation: "sum" | "avg" | "count"
): Array<{ x: string; y: number }> {
  const timestamps = rows
    .map((row) => row[xKey])
    .filter((value): value is number => typeof value === "number");
  if (timestamps.length < MIN_POINTS) {
    return [];
  }
  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  const spanDays = (max - min) / (1000 * 60 * 60 * 24);
  const interval = spanDays <= 60 ? "day" : spanDays <= 400 ? "week" : "month";
  const totals = new Map<number, { sum: number; count: number }>();

  for (const row of rows) {
    const raw = row[xKey];
    if (typeof raw !== "number") {
      continue;
    }
    const date = new Date(raw);
    const bucketDate =
      interval === "month"
        ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
        : interval === "day"
          ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
          : (() => {
              const day = date.getUTCDay();
              const diff = (day + 6) % 7;
              return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - diff));
            })();
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
    .map(([timestamp, entry]) => {
      const value =
        aggregation === "avg"
          ? entry.count
            ? entry.sum / entry.count
            : 0
          : aggregation === "sum"
            ? entry.sum
            : entry.count;
      return { x: formatDateLabel(timestamp, interval), y: value };
    });
}

function hasSignal(data: Array<{ x: string; y: number }>): boolean {
  if (data.length < MIN_POINTS) {
    return false;
  }
  const yValues = data.map((point) => point.y);
  const unique = new Set(yValues.map((value) => value.toFixed(6)));
  if (unique.size <= 1) {
    return false;
  }
  const min = Math.min(...yValues);
  const max = Math.max(...yValues);
  return Math.abs(max - min) > 1e-6;
}

function buildTitle(
  spec: ChartSpec,
  context: { isTime: boolean; isDistribution: boolean }
): string {
  const xLabel = humanizeName(spec.x);
  const yLabel = spec.y ? humanizeName(spec.y) : "Count";
  if (spec.type === "table") {
    return "Dataset Preview";
  }
  if (context.isTime) {
    const metric = spec.y ? yLabel : "Records";
    return `${metric} Over Time`;
  }
  if (context.isDistribution) {
    return `Distribution of ${xLabel}`;
  }
  if (spec.aggregation === "avg" && spec.y) {
    return `Average ${yLabel} by ${xLabel}`;
  }
  if (spec.y) {
    return `Top ${xLabel} by ${yLabel}`;
  }
  return `Top ${xLabel}`;
}

function scoreChart(chart: DashboardChart): number {
  const typeScore =
    chart.spec.type === "line"
      ? 4
      : chart.spec.type === "bar"
        ? 3
        : chart.spec.type === "pie"
          ? 2
          : 1;
  const payload = chart.payload as { data?: unknown[]; rows?: unknown[] };
  const dataCount = Array.isArray(payload.data) ? payload.data.length : Array.isArray(payload.rows) ? payload.rows.length : 0;
  return typeScore * 1000 + dataCount;
}

function pickTableColumns(profile: DatasetProfile): { primary: string; secondary?: string } {
  const candidates = profile.columns.filter(
    (column) => !column.isIdLike && !isTextLike(column)
  );
  const columns = candidates.length ? candidates : profile.columns;
  return {
    primary: columns[0]?.name ?? "column",
    secondary: columns[1]?.name,
  };
}

function buildTableChart(id: string, rows: NormalizedRow[], profile: DatasetProfile): DashboardChart {
  const { primary, secondary } = pickTableColumns(profile);
  const spec: ChartSpec = {
    id,
    type: "table",
    x: primary,
    y: secondary,
    title: "Dataset Preview",
    colorIntent: "focus",
    aggregation: "count",
  };
  return {
    id,
    spec,
    payload: buildTablePayload(rows, primary, secondary),
  };
}

function normalizeChart(
  candidate: RawChartCandidate,
  rows: NormalizedRow[],
  profile: DatasetProfile
): DashboardChart {
  const baseSpec = ensureAggregation(candidate.spec);
  const xProfile = getColumn(profile, baseSpec.x);
  const yProfile = baseSpec.y ? getColumn(profile, baseSpec.y) : undefined;
  if (!xProfile || isIdLike(xProfile) || isTextLike(xProfile)) {
    return buildTableChart(candidate.id, rows, profile);
  }
  if (baseSpec.y && (!yProfile || isIdLike(yProfile) || isTextLike(yProfile) || yProfile.role !== "numeric")) {
    return buildTableChart(candidate.id, rows, profile);
  }

  const timeLike = isTimeLike(xProfile);
  if (baseSpec.type === "line" || timeLike) {
    if (!timeLike) {
      return buildTableChart(candidate.id, rows, profile);
    }
    const spec: ChartSpec = {
      ...baseSpec,
      type: "line",
      colorIntent: "time",
    };
    const data = buildTimeSeriesData(rows, spec.x, spec.y, spec.aggregation ?? "count");
    const payload = { data, xKey: "x", yKey: "y" };
    const withTitle = { ...spec, title: buildTitle(spec, { isTime: true, isDistribution: false }) };
    return hasSignal(data) ? { id: candidate.id, spec: withTitle, payload } : buildTableChart(candidate.id, rows, profile);
  }

  if (baseSpec.type === "table") {
    const spec: ChartSpec = {
      ...baseSpec,
      type: "table",
      title: buildTitle(baseSpec, { isTime: false, isDistribution: false }),
    };
    return { id: candidate.id, spec, payload: buildTablePayload(rows, spec.x, spec.y) };
  }

  const aggregation = baseSpec.aggregation ?? "count";
  const numericValues = rows
    .map((row) => row[baseSpec.x])
    .filter((value): value is number => typeof value === "number");
  const isDistribution = aggregation === "count" && numericValues.length > 0;
  if (isDistribution) {
    const data = buildDistributionData(numericValues);
    const spec: ChartSpec = {
      ...baseSpec,
      type: "bar",
      colorIntent: "distribution",
    };
    const payload = { data, xKey: "x", yKey: "y" };
    const withTitle = { ...spec, title: buildTitle(spec, { isTime: false, isDistribution: true }) };
    return hasSignal(data) ? { id: candidate.id, spec: withTitle, payload } : buildTableChart(candidate.id, rows, profile);
  }

  if (baseSpec.type !== "bar" && baseSpec.type !== "pie") {
    return buildTableChart(candidate.id, rows, profile);
  }

  const data = buildCategoricalData(rows, baseSpec.x, baseSpec.y, aggregation);
  const spec: ChartSpec = {
    ...baseSpec,
    title: buildTitle(baseSpec, { isTime: false, isDistribution: false }),
  };
  const payload = { data, xKey: "x", yKey: "y" };
  return hasSignal(data) ? { id: candidate.id, spec, payload } : buildTableChart(candidate.id, rows, profile);
}

function ensureUniqueId(base: string, used: Set<string>): string {
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

export function applyChartQuality(
  candidates: RawChartCandidate[],
  rows: NormalizedRow[],
  profile: DatasetProfile
): DashboardChart[] {
  const normalized = candidates.map((candidate) => normalizeChart(candidate, rows, profile));
  const ranked = [...normalized].sort((a, b) => scoreChart(b) - scoreChart(a));
  const topCharts = ranked.slice(0, 4);

  const usedIds = new Set<string>(topCharts.map((chart) => chart.id));
  while (topCharts.length < 4) {
    const id = ensureUniqueId("chart_preview", usedIds);
    topCharts.push(buildTableChart(id, rows, profile));
  }

  return topCharts;
}
