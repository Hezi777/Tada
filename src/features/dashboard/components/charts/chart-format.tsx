import type { ChartConfig } from "@/shared/contracts";
import { formatNumber as legacyFormatNumber } from "@/features/dashboard/client/runtime";
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
  return measure ?? "Value";
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
