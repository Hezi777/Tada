import type { ChartConfig, SerializedRow } from "@/shared/contracts";
import {
  buildAreaSeries,
  buildGroupedSeries,
  computeScatterCorrelation,
  formatNumber as legacyFormatNumber,
} from "@/features/dashboard/client/runtime";
import {
  abbreviateNumber,
  detectCurrencySymbol,
  formatCurrency,
  looksLikeCurrencyColumn,
  ltrIsolate,
  truncateLabel,
} from "@/shared/lib/format";

/** Formats a value for tooltip/legend display: currency-aware, falls back to
 * the legacy dashboard number formatter. */
export function formatMetric(
  value: string | number,
  currency: string | null = null,
): string | number {
  if (typeof value === "string") {
    return value.trim() ? value : "-";
  }

  if (!Number.isFinite(value)) {
    return "-";
  }

  if (currency) {
    return formatCurrency(value, currency, Math.abs(value) >= 100_000);
  }

  return legacyFormatNumber(value) ?? value;
}

/** Formats an axis tick: currency/number abbreviation for numbers, Israeli
 * DD/MM date conventions for ISO date/month strings. `maxChars` is the
 * size-class truncation budget for category labels (LABEL_TRUNCATION). */
export function formatAxisValue(
  value: string | number,
  currency: string | null = null,
  maxChars = 18,
): string {
  if (typeof value === "number") {
    return currency
      ? formatCurrency(value, currency, true)
      : abbreviateNumber(value);
  }

  // Israeli date convention: DD/MM, never US month-first.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [, month, day] = value.split("-");
    return ltrIsolate(`${day}/${month}`);
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-");
    return ltrIsolate(`${month}/${year.slice(2)}`);
  }

  return truncateLabel(value, maxChars);
}

/** The measure a chart aggregates, for tooltip labels. */
export function metricLabel(chart: ChartConfig): string {
  const measure =
    chart.columns.find(
      (column) => column !== chart.groupBy && column !== chart.timeColumn,
    ) ?? null;
  if (
    chart.aggregation === "count" ||
    (!measure && chart.aggregation === null)
  ) {
    return "Count";
  }
  return measure ? displayColumnLabel(measure) : "Value";
}

export function displayColumnLabel(label: string): string {
  return label
    .replace(/[_-]+/g, " ")
    .replace(/\b(ils|nis|usd|eur|gbp)\b/gi, "")
    .replace(/[₪$€£]/g, "")
    .replace(/[()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Recomputes the sentence shown above a chart from the same rows and
 * aggregation used by the visualization. Persisted/AI copy is never treated
 * as evidence, so filtering or older dashboards cannot leave a stale claim on
 * screen.
 */
export function deriveChartInsight(
  chart: ChartConfig,
  rows: SerializedRow[],
): string {
  if (chart.type === "area") {
    const series = buildAreaSeries(chart, rows);
    const first = series[0];
    const last = series.at(-1);
    if (!first || !last) return chart.insight;

    const currency = chartCurrency(chart);
    const measure = metricLabel(chart);
    const firstValue = String(formatMetric(first.value, currency));
    const lastValue = String(formatMetric(last.value, currency));
    const firstPeriod = formatAxisValue(first.label);
    const lastPeriod = formatAxisValue(last.label);
    if (first.value === 0) {
      return `${measure} moved from ${firstValue} in ${firstPeriod} to ${lastValue} in ${lastPeriod}.`;
    }
    const change = ((last.value - first.value) / Math.abs(first.value)) * 100;
    const direction = change >= 0 ? "increased" : "decreased";
    return `${measure} ${direction} ${Math.abs(change).toFixed(1)}%, from ${firstValue} in ${firstPeriod} to ${lastValue} in ${lastPeriod}.`;
  }

  if (chart.type === "bar" || chart.type === "donut") {
    const series = buildGroupedSeries(chart, rows);
    const leader = series[0];
    if (!leader) return chart.insight;

    const currency = chartCurrency(chart);
    const leaderValue = String(formatMetric(leader.value, currency));
    if (chart.type === "donut") {
      const total = series.reduce((sum, entry) => sum + entry.value, 0);
      const share = total === 0 ? 0 : (leader.value / total) * 100;
      return `${leader.label} is the largest share at ${share.toFixed(1)}% (${leaderValue}).`;
    }
    return `${leader.label} ranks first at ${leaderValue}.`;
  }

  if (chart.type === "scatter") {
    const correlation = computeScatterCorrelation(chart, rows);
    if (correlation === null) return chart.insight;
    const direction = correlation >= 0 ? "positive" : "negative";
    return `${displayColumnLabel(chart.columns[0] ?? "X")} and ${displayColumnLabel(chart.columns[1] ?? "Y")} have a ${direction} correlation (r=${correlation.toFixed(2)}).`;
  }

  return chart.insight;
}

/** The currency symbol for the chart's aggregated measure, or null when the
 * measure isn't money. Symbol comes from the column name; defaults to $. */
export function chartCurrency(chart: ChartConfig): string | null {
  const measure =
    chart.columns.find(
      (column) => column !== chart.groupBy && column !== chart.timeColumn,
    ) ?? null;
  if (!measure || chart.aggregation === "count") {
    return null;
  }
  if (!looksLikeCurrencyColumn(measure)) {
    return null;
  }
  return detectCurrencySymbol(measure) ?? "$";
}

/** Currency symbol for an axis column by name, or null when it isn't money. */
export function columnCurrency(name: string): string | null {
  if (!looksLikeCurrencyColumn(name)) {
    return null;
  }
  return detectCurrencySymbol(name) ?? "$";
}

export { truncateLabel };
