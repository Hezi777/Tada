import { useState } from "react";
import { Cell, Label, Pie, PieChart, Sector } from "recharts";
import type { ChartConfig, SerializedRow } from "@/shared/contracts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";
import { buildGroupedSeries } from "@/features/dashboard/client/runtime";
import { truncateLabel } from "@/shared/lib/format";
import { ChartEmptyState } from "./ChartEmptyState";
import {
  buildDonutChartConfig,
  chartCurrency,
  formatAxisValue,
  formatMetric,
  metricLabel,
} from "./chart-format";
import {
  CATEGORICAL_PALETTE,
  CHART_ANIMATION_DURATION,
  CHART_ANIMATION_EASING,
  CHART_GLOW_BLUR,
  CHART_GLOW_OPACITY,
  DONUT_RADII,
  DONUT_SLICE_BUDGET,
  gradientId,
} from "./chart-theme";

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
  const [activeSlice, setActiveSlice] = useState<number | undefined>(undefined);

  const series = buildGroupedSeries(chart, rows, {
    categoryLimit: DONUT_SLICE_BUDGET[size],
  });
  if (series.length === 0) {
    return <ChartEmptyState />;
  }

  const total = series.reduce((sum, entry) => sum + entry.value, 0);
  const chartConfig = buildDonutChartConfig(series);
  const donutCurrency = chartCurrency(chart);
  const glowFilterId = gradientId(chart.id, "donut-glow");
  const radii = DONUT_RADII[size];
  const ringSize = radii.outer * 2;

  const ring = (
    <ChartContainer
      config={chartConfig}
      width={ringSize}
      height={ringSize}
      className="shrink-0"
    >
      <PieChart>
        <defs>
          <filter id={glowFilterId} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation={CHART_GLOW_BLUR}
              floodColor={CATEGORICAL_PALETTE[1]}
              floodOpacity={CHART_GLOW_OPACITY}
            />
          </filter>
        </defs>
        <Pie
          data={series}
          dataKey="value"
          nameKey="label"
          paddingAngle={1.5}
          cornerRadius={3}
          innerRadius={radii.inner}
          outerRadius={radii.outer}
          activeIndex={activeSlice}
          onMouseEnter={(_: unknown, index: number) => setActiveSlice(index)}
          onMouseLeave={() => setActiveSlice(undefined)}
          activeShape={(props: { outerRadius?: number | string }) => (
            <Sector
              {...props}
              outerRadius={Number(props.outerRadius) + 2}
              filter={`url(#${glowFilterId})`}
            />
          )}
          isAnimationActive={!isInteracting}
          animationDuration={CHART_ANIMATION_DURATION}
          animationEasing={CHART_ANIMATION_EASING}
        >
          {series.map((_entry, index) => (
            <Cell
              key={`${chart.id}-slice-${index}`}
              fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]}
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          ))}
          {size === "large" ? (
            <Label
              position="center"
              content={() => {
                const totalText = formatAxisValue(total, donutCurrency);
                const totalLabel =
                  chart.aggregation === "count" || chart.aggregation === null
                    ? "Total Count"
                    : `Total ${truncateLabel(metricLabel(chart), 12)}`;
                // Long abbreviated totals (e.g. "₪1.2M") need a smaller
                // font so they stay inside the donut's inner radius.
                const valueFontSize = totalText.length > 7 ? "16px" : "20px";

                return (
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                    <tspan
                      x="50%"
                      dy="-0.3em"
                      className="display-number fill-[var(--color-text-primary)]"
                      style={{ fontSize: valueFontSize }}
                    >
                      {totalText}
                    </tspan>
                    <tspan
                      x="50%"
                      dy="1.5em"
                      className="fill-[var(--color-text-muted)] text-[10px] font-semibold uppercase tracking-[0.14em]"
                    >
                      {totalLabel}
                    </tspan>
                  </text>
                );
              }}
            />
          ) : null}
        </Pie>
        <ChartTooltip offset={20} content={<ChartTooltipContent labelKey="label" />} />
      </PieChart>
    </ChartContainer>
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
                      CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length],
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
                  background: CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length],
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
