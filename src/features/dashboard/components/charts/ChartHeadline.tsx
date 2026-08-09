import { ArrowDown, ArrowUp } from "lucide-react";
import type { ChartConfig, SerializedRow } from "@/shared/contracts";
import {
  buildAreaSeries,
  buildGroupedSeries,
} from "@/features/dashboard/client/runtime";
import { chartCurrency, formatAxisValue, formatMetric } from "./chart-format";

/**
 * The Small size class renders a chart's honest headline number as a KPI
 * instead of a miniature chart (docs/WIDGET_SIZING.md §4-5):
 *   bar  → top sorted category + its value ("the winner")
 *   area → latest period value + Δ% vs the previous period
 * Types without an honest single number (donut, scatter) don't support
 * Small at all, so they never reach this module.
 */

export type ChartHeadlineData = {
  value: string;
  label: string;
  context: string | null;
  deltaPct: number | null;
};

export function computeChartHeadline(
  chart: ChartConfig,
  rows: SerializedRow[],
): ChartHeadlineData | null {
  if (chart.type === "bar") {
    const series = buildGroupedSeries(chart, rows);
    if (series.length === 0) {
      return null;
    }
    const currency = chartCurrency(chart);
    const top = series[0];
    // "of {total}" only when summing is meaningful for the aggregation.
    const additive =
      chart.aggregation === "sum" ||
      chart.aggregation === "count" ||
      chart.aggregation === null;
    const total = series.reduce((sum, entry) => sum + entry.value, 0);
    return {
      value: String(formatMetric(top.value, currency)),
      label: top.label,
      context:
        additive && series.length > 1
          ? `of ${formatMetric(total, currency)}`
          : `${series.length} categories`,
      deltaPct: null,
    };
  }

  if (chart.type === "area") {
    const series = buildAreaSeries(chart, rows);
    if (series.length === 0) {
      return null;
    }
    const currency = chartCurrency(chart);
    const last = series[series.length - 1];
    const previous = series.length > 1 ? series[series.length - 2] : null;
    const deltaPct =
      previous && previous.value !== 0
        ? ((last.value - previous.value) / Math.abs(previous.value)) * 100
        : null;
    return {
      value: String(formatMetric(last.value, currency)),
      label: formatAxisValue(last.label),
      context: null,
      deltaPct,
    };
  }

  return null;
}

export function ChartHeadline({ headline }: { headline: ChartHeadlineData }) {
  const isPositive = (headline.deltaPct ?? 0) >= 0;
  const ArrowIcon = isPositive ? ArrowUp : ArrowDown;

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end">
      <div className="display-number truncate text-3xl font-black tracking-tight text-[var(--color-text-primary)]">
        {headline.value}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="truncate text-sm font-semibold leading-snug text-[var(--color-text-secondary)]">
          {headline.label}
        </span>
        {headline.deltaPct !== null ? (
          <span
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
              isPositive
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
            }`}
          >
            <ArrowIcon className="h-3 w-3" strokeWidth={2.5} />
            {Math.abs(headline.deltaPct).toFixed(1)}%
          </span>
        ) : null}
      </div>
      {headline.context ? (
        <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
          {headline.context}
        </p>
      ) : null}
    </div>
  );
}
