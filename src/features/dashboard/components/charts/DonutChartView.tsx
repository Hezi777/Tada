import type { ChartConfig, SerializedRow } from "@/shared/contracts";
import { buildGroupedSeries } from "@/features/dashboard/client/runtime";
import { truncateLabel } from "@/shared/lib/format";
import { ChartEmptyState } from "./ChartEmptyState";
import {
  chartCurrency,
  formatAxisValue,
  formatMetric,
  metricLabel,
} from "./chart-format";
import { EChart } from "./EChart";
import { DONUT_RADII, DONUT_SLICE_BUDGET, useChartColors } from "./chart-theme";

type DonutSize = "medium" | "large";

type DonutChartViewProps = {
  chart: ChartConfig;
  rows: SerializedRow[];
  /** Donut supports medium and large only (docs/WIDGET_SIZING.md §2). */
  size: DonutSize;
  /** Fixed plot box (grid.ts chartPlotBox) — never measured. */
  width: number;
  height: number;
  /** When true, disables Recharts animation (e.g. while dragging). */
  isInteracting?: boolean;
};

/** Slim donut ring with fixed px radii per size class (never derived from
 * the container — the old %-radii vs. variable-height legend interplay was
 * the hidden-midway bug this replaces).
 *   medium: ring beside its top-3 label rows, no center label, no chips
 *   large:  ring with center total + chip legend in a fixed-height row */
export function DonutChartView({
  chart,
  rows,
  size,
  width,
  height,
  isInteracting = false,
}: DonutChartViewProps) {
  const colors = useChartColors();
  const series = buildGroupedSeries(chart, rows, {
    categoryLimit: DONUT_SLICE_BUDGET[size],
  });
  if (series.length === 0) {
    return <ChartEmptyState />;
  }

  const total = series.reduce((sum, entry) => sum + entry.value, 0);
  const donutCurrency = chartCurrency(chart);
  const radii = DONUT_RADII[size];
  const ringSize = radii.outer * 2;

  const ring = (
    <EChart
      width={ringSize}
      height={ringSize}
      label={`${chart.title}. ${series.length} segments totaling ${formatAxisValue(total, donutCurrency)}.`}
      isInteracting={isInteracting}
      option={{
        color: colors.categorical,
        animationDuration: 300,
        tooltip: {
          trigger: "item",
          renderMode: "richText",
          valueFormatter: (value: number) =>
            String(formatMetric(value, donutCurrency)),
        },
        graphic:
          size === "large"
            ? [
                {
                  type: "text",
                  left: "center",
                  top: "39%",
                  style: {
                    text: formatAxisValue(total, donutCurrency),
                    fill: colors.foreground,
                    fontSize: 18,
                    fontWeight: 600,
                    textAlign: "center",
                  },
                },
                {
                  type: "text",
                  left: "center",
                  top: "55%",
                  style: {
                    text:
                      chart.aggregation === "count" ||
                      chart.aggregation === null
                        ? "TOTAL COUNT"
                        // No "TOTAL" prefix: the figure directly above is
                        // plainly the total, and the extra six characters
                        // pushed the string wider than the inner radius, so
                        // the ring clipped both ends of it.
                        : truncateLabel(metricLabel(chart), 12).toUpperCase(),
                    fill: colors.mutedForeground,
                    fontSize: 9,
                    fontWeight: 600,
                    textAlign: "center",
                  },
                },
              ]
            : undefined,
        series: [
          {
            type: "pie",
            radius: [radii.inner, radii.outer],
            center: ["50%", "50%"],
            silent: false,
            padAngle: 2,
            label: { show: false },
            itemStyle: {
              borderColor: colors.popover,
              borderWidth: 2,
              borderRadius: 4,
            },
            emphasis: { scale: true, scaleSize: 3 },
            data: series.map((entry) => ({
              name: entry.label,
              value: entry.value,
            })),
          },
        ],
      }}
    />
  );

  if (size === "medium") {
    // Landscape split: ring at the reading-start side, top-3 rows beside it.
    const topRows = series.slice(0, 3);
    return (
      <div
        className="flex items-center gap-5 overflow-hidden"
        style={{ width, height }}
      >
        {ring}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          {topRows.map((entry, index) => {
            const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
            return (
              <div
                key={`${chart.id}-row-${entry.label}`}
                className="flex items-center gap-2 text-[12px]"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background:
                      colors.categorical[index % colors.categorical.length],
                  }}
                />
                <span className="min-w-0 flex-1 truncate text-[var(--color-text-secondary)]">
                  {truncateLabel(entry.label, 12)}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Large: ring + fixed-height chip legend. Both heights are constants, so
  // the legend can never squeeze the ring.
  const legendHeight = height - ringSize - 12;
  const compactChips = width < 500;
  return (
    <div className="flex flex-col overflow-hidden" style={{ width, height }}>
      <div className="flex justify-center">{ring}</div>
      <div
        className="mt-3 flex flex-wrap content-start justify-center gap-2 overflow-hidden"
        style={{ height: legendHeight }}
      >
        {series.map((entry, index) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div
              key={`${chart.id}-legend-${entry.label}`}
              className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] transition-colors duration-200 hover:border-[var(--color-accent)]/30"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background:
                    colors.categorical[index % colors.categorical.length],
                }}
              />
              <span className="text-[var(--color-text-secondary)]">
                {truncateLabel(entry.label, compactChips ? 12 : 22)}
              </span>
              <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                {pct}%
              </span>
              {compactChips ? null : (
                <span className="tabular-nums text-[var(--color-text-muted)]">
                  {formatMetric(entry.value, donutCurrency)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
