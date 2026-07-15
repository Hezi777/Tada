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
import type { ChartConfig as ChartPrimitiveConfig } from "@/shared/ui/chart";
import { ACCENT, CHART_PALETTE } from "./chart-theme";

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
    return currency ? formatCurrency(value, currency, true) : abbreviateNumber(value);
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

export function buildValueChartConfig(label: string): ChartPrimitiveConfig {
  return {
    value: {
      label,
      color: ACCENT,
    },
  };
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

export function buildScatterChartConfig(chart: ChartConfig): ChartPrimitiveConfig {
  return {
    x: {
      label: chart.columns[0] ?? "X",
      color: ACCENT,
    },
    y: {
      label: chart.columns[1] ?? "Y",
      color: ACCENT,
    },
  };
}

export function buildDonutChartConfig(
  series: Array<{ label: string; value: number }>,
): ChartPrimitiveConfig {
  const config: ChartPrimitiveConfig = {};

  series.forEach((entry, index) => {
    config[entry.label] = {
      label: entry.label,
      color: CHART_PALETTE[index % CHART_PALETTE.length],
    };
  });

  return config;
}

/** Mirrors ChartTooltipContent's default row layout, but formats the value
 * as currency when the underlying column looks like money. */
export function makeCurrencyTooltipFormatter(currency: string) {
  return function currencyTooltipFormatter(
    value: number | string,
    name: string,
    item: { color?: string; payload?: Record<string, unknown> },
  ) {
    const fill = item.payload?.fill;
    const indicatorColor =
      (typeof fill === "string" ? fill : undefined) || item.color;

    return (
      <div className="flex w-full flex-1 items-center justify-between gap-2 leading-none">
        <div className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: indicatorColor }}
          />
          <span className="text-muted-foreground">{name}</span>
        </div>
        <span className="font-mono font-medium tabular-nums text-foreground">
          {formatMetric(Number(value), currency)}
        </span>
      </div>
    );
  };
}

export { truncateLabel };
