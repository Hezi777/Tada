import {
  BI_RULE_LIMITS,
  type ChartConfig,
  type DashboardColumn,
  type DatasetMeta,
  type KPIConfig,
  type SerializedRow,
  type SerializedValue,
} from "@tada/shared";

export type DashboardRuntimeContext = {
  columns: DashboardColumn[];
  rows: SerializedRow[];
};

export type CategoricalChartSeries = Array<{ label: string; value: number }>;
export type ScatterChartSeries = Array<{ x: number; y: number }>;

const CHART_LIMITS = {
  area: 100,
  bar: 12,
  donut: 8,
  scatter: 500,
} as const;

const numericFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function toNumber(value: SerializedValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toDate(value: SerializedValue): Date | null {
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

function columnExists(
  columns: DashboardColumn[],
  name: string | null | undefined,
  kind?: DashboardColumn["kind"],
): boolean {
  if (!name) {
    return false;
  }
  return columns.some(
    (column) => column.name === name && (kind ? column.kind === kind : true),
  );
}

function hasHumanTitle(title: string): boolean {
  const trimmed = title.trim();
  if (trimmed.length < 4) {
    return false;
  }
  return !/^chart(\s+\d+)?$/i.test(trimmed);
}

function chartIdentityKey(
  chart: Pick<ChartConfig, "type" | "columns">,
): string {
  return `${chart.type}:${[...chart.columns].sort().join("|")}`;
}

function normalizeChartOrders(charts: ChartConfig[]): ChartConfig[] {
  return [...charts]
    .sort((left, right) => left.order - right.order)
    .map((chart, index) => ({ ...chart, order: index }));
}

export function validateChartCollection(
  charts: ChartConfig[],
  context: DashboardRuntimeContext,
): string | null {
  if (
    charts.length < BI_RULE_LIMITS.minCharts ||
    charts.length > BI_RULE_LIMITS.maxCharts
  ) {
    return `Dashboard must contain between ${BI_RULE_LIMITS.minCharts} and ${BI_RULE_LIMITS.maxCharts} charts.`;
  }

  const seen = new Set<string>();
  const normalized = normalizeChartOrders(charts);
  if (normalized[0]?.order !== 0) {
    return "The highest-priority chart must remain at order 0.";
  }

  for (const chart of normalized) {
    if (!hasHumanTitle(chart.title)) {
      return "Chart titles must be specific and human-readable.";
    }
    if (!chart.insight.trim()) {
      return "Chart insights cannot be empty.";
    }
    for (const column of chart.columns) {
      if (!columnExists(context.columns, column)) {
        return `Unknown chart column: ${column}.`;
      }
    }
    if (chart.groupBy && !columnExists(context.columns, chart.groupBy)) {
      return `Unknown groupBy column: ${chart.groupBy}.`;
    }
    if (chart.timeColumn && !columnExists(context.columns, chart.timeColumn)) {
      return `Unknown time column: ${chart.timeColumn}.`;
    }
    if (
      chart.type === "area" &&
      !columnExists(context.columns, chart.timeColumn, "date")
    ) {
      return "Area charts require a valid date or time column.";
    }
    if (chart.type === "scatter") {
      if (chart.columns.length !== 2) {
        return "Scatter charts require exactly two numeric columns.";
      }
      const [leftColumn, rightColumn] = chart.columns;
      if (
        !columnExists(context.columns, leftColumn, "numeric") ||
        !columnExists(context.columns, rightColumn, "numeric")
      ) {
        return "Scatter charts require two numeric columns.";
      }
      const series = buildScatterSeries(chart, context.rows);
      if (
        series.length < BI_RULE_LIMITS.minScatterPoints ||
        Math.abs(computeScatterCorrelation(chart, context.rows) ?? 0) <
          BI_RULE_LIMITS.minScatterCorrelation
      ) {
        return "Scatter charts require meaningful correlation between two numeric columns.";
      }
    }
    const identityKey = chartIdentityKey(chart);
    if (seen.has(identityKey)) {
      return "Duplicate chart type and column combinations are not allowed.";
    }
    seen.add(identityKey);
  }

  return null;
}

export function validateKpiCollection(kpis: KPIConfig[]): string | null {
  if (
    kpis.length < BI_RULE_LIMITS.minKpis ||
    kpis.length > BI_RULE_LIMITS.maxKpis
  ) {
    return `Dashboard must contain between ${BI_RULE_LIMITS.minKpis} and ${BI_RULE_LIMITS.maxKpis} KPIs.`;
  }
  const primaryCount = kpis.filter((kpi) => kpi.isPrimary).length;
  if (primaryCount !== 1) {
    return "Dashboard must contain exactly one primary KPI.";
  }
  if (
    !kpis.every(
      (kpi) => kpi.label.trim() && kpi.description.trim() && kpi.column.trim(),
    )
  ) {
    return "KPI configs must include column, label, and description.";
  }
  return null;
}

function reduceAggregation(
  values: number[],
  aggregation: ChartConfig["aggregation"],
): number {
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

function detectTimeGranularity(
  rows: SerializedRow[],
  timeColumn: string,
): "day" | "month" | "year" {
  const timestamps = rows
    .map((row) => {
      const d = toDate(row[timeColumn]);
      return d ? d.getTime() : null;
    })
    .filter((t): t is number => t !== null);
  if (timestamps.length < 2) return "month";
  const spanDays =
    (Math.max(...timestamps) - Math.min(...timestamps)) / (1000 * 60 * 60 * 24);
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

export function buildAreaSeries(
  chart: ChartConfig,
  rows: SerializedRow[],
): CategoricalChartSeries {
  if (!chart.timeColumn) {
    return [];
  }
  const granularity = detectTimeGranularity(rows, chart.timeColumn);
  const valueColumn =
    chart.columns.find((column) => column !== chart.timeColumn) ?? null;
  const buckets = new Map<string, number[]>();

  for (const row of rows) {
    const dateValue = toDate(row[chart.timeColumn]);
    if (!dateValue) {
      continue;
    }
    const bucket = toBucketKey(dateValue, granularity);
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
    .slice(0, CHART_LIMITS.area)
    .map(([label, values]) => ({
      label,
      value: reduceAggregation(
        values,
        valueColumn ? chart.aggregation : "count",
      ),
    }));
}

export function buildGroupedSeries(
  chart: ChartConfig,
  rows: SerializedRow[],
): CategoricalChartSeries {
  if (chart.groupBy) {
    const valueColumn =
      chart.columns.find((column) => column !== chart.groupBy) ?? null;
    const buckets = new Map<string, number[]>();

    for (const row of rows) {
      const rawGroup = row[chart.groupBy];
      if (rawGroup === null || rawGroup === undefined || rawGroup === "") {
        continue;
      }
      const values = buckets.get(String(rawGroup)) ?? [];
      if (valueColumn) {
        const numericValue = toNumber(row[valueColumn]);
        if (numericValue !== null) {
          values.push(numericValue);
        }
      } else {
        values.push(1);
      }
      buckets.set(String(rawGroup), values);
    }

    const series = Array.from(buckets.entries())
      .map(([label, values]) => ({
        label,
        value: reduceAggregation(
          values,
          valueColumn ? chart.aggregation : "count",
        ),
      }))
      .sort((left, right) => right.value - left.value);

    if (chart.type === "donut" && series.length > CHART_LIMITS.donut) {
      const kept = series.slice(0, CHART_LIMITS.donut);
      const otherValue = series
        .slice(CHART_LIMITS.donut)
        .reduce((sum, entry) => sum + entry.value, 0);
      return otherValue > 0
        ? [...kept, { label: "Other", value: otherValue }]
        : kept;
    }

    return chart.type === "bar" ? series.slice(0, CHART_LIMITS.bar) : series;
  }

  const valueColumn = chart.columns[0] ?? null;
  if (!valueColumn) {
    return [];
  }
  const values = rows
    .map((row) => toNumber(row[valueColumn]))
    .filter((value): value is number => value !== null);
  if (values.length === 0) {
    return [];
  }
  return [
    { label: chart.title, value: reduceAggregation(values, chart.aggregation) },
  ];
}

export function buildScatterSeries(
  chart: ChartConfig,
  rows: SerializedRow[],
): ScatterChartSeries {
  const [leftColumn, rightColumn] = chart.columns;
  if (!leftColumn || !rightColumn) {
    return [];
  }
  const series = rows
    .map((row) => {
      const x = toNumber(row[leftColumn]);
      const y = toNumber(row[rightColumn]);
      return x === null || y === null ? null : { x, y };
    })
    .filter((point): point is { x: number; y: number } => Boolean(point));

  if (series.length <= CHART_LIMITS.scatter) {
    return series;
  }

  const sampled: ScatterChartSeries = [];
  const step = (series.length - 1) / (CHART_LIMITS.scatter - 1);
  for (let index = 0; index < CHART_LIMITS.scatter; index += 1) {
    sampled.push(series[Math.round(index * step)]);
  }
  return sampled;
}

export function computeScatterCorrelation(
  chart: ChartConfig,
  rows: SerializedRow[],
): number | null {
  const series = buildScatterSeries(chart, rows);
  if (series.length === 0) {
    return null;
  }
  return pearsonCorrelation(
    series.map((point) => point.x),
    series.map((point) => point.y),
  );
}

export function hasRenderableChartData(
  chart: ChartConfig,
  rows: SerializedRow[],
): boolean {
  if (chart.type === "area") {
    return buildAreaSeries(chart, rows).length > 0;
  }
  if (chart.type === "scatter") {
    return buildScatterSeries(chart, rows).length > 0;
  }
  if (chart.type === "kpi") {
    return true;
  }
  return buildGroupedSeries(chart, rows).length > 0;
}

export function computeKpiValue(
  kpi: KPIConfig,
  rows: SerializedRow[],
): string | number {
  if (kpi.aggregation === "count") {
    return rows.length;
  }

  if (kpi.aggregation === "mode") {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const value = row[kpi.column];
      if (value === null || value === undefined || value === "") {
        continue;
      }
      const key = String(value);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let best: { key: string; count: number } | null = null;
    for (const [key, count] of counts.entries()) {
      if (!best || count > best.count) {
        best = { key, count };
      }
    }
    return best?.key ?? "-";
  }

  if (kpi.aggregation === "range") {
    const dates = rows
      .map((row) => toDate(row[kpi.column]))
      .filter((value): value is Date => value !== null)
      .sort((left, right) => left.getTime() - right.getTime());
    if (dates.length === 0) {
      return "-";
    }
    const start = dates[0].toISOString().slice(0, 10);
    const end = dates[dates.length - 1].toISOString().slice(0, 10);
    return start === end ? start : `${start} -> ${end}`;
  }

  const values = rows
    .map((row) => toNumber(row[kpi.column]))
    .filter((value): value is number => value !== null);
  if (values.length === 0) {
    return "-";
  }
  return (
    Math.round(
      reduceAggregation(values, kpi.aggregation as ChartConfig["aggregation"]) *
        100,
    ) / 100
  );
}

export function formatNumber(value: number | null): string | null {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  return numericFormatter.format(value);
}

export function toStoreContext(input: {
  columns: DashboardColumn[];
  rows: SerializedRow[];
  datasetMeta?: DatasetMeta;
}): DashboardRuntimeContext {
  void input.datasetMeta;
  return {
    columns: input.columns,
    rows: input.rows,
  };
}
