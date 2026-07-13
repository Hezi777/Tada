import { useState } from "react";
import { Cell, Label, Pie, PieChart, Sector } from "recharts";
import type { SerializedRow } from "@/shared/contracts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";
import { buildGroupedSeries } from "@/features/dashboard/client/runtime";
import type { LayoutItem } from "@/features/dashboard/client/layout";
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
  DONUT_INNER_RADIUS,
  DONUT_OUTER_RADIUS,
  gradientId,
} from "./chart-theme";

type DonutChartViewProps = {
  chart: LayoutItem;
  rows: SerializedRow[];
  /** When true, disables Recharts animation (e.g. while dragging/resizing). */
  isInteracting?: boolean;
};

/** Slim donut ring with a faint full-circle track, blue-ramp slices, a
 * center total label, and a chip legend below. */
export function DonutChartView({ chart, rows, isInteracting = false }: DonutChartViewProps) {
  const [activeSlice, setActiveSlice] = useState<number | undefined>(undefined);

  const series = buildGroupedSeries(chart, rows);
  if (series.length === 0) {
    return <ChartEmptyState />;
  }

  const total = series.reduce((sum, entry) => sum + entry.value, 0);
  const chartConfig = buildDonutChartConfig(series);
  const totalLabel =
    chart.aggregation === "count" || chart.aggregation === null
      ? "Total Count"
      : `Total ${metricLabel(chart)}`;
  const donutCurrency = chartCurrency(chart);
  const glowFilterId = gradientId(chart.id, "donut-glow");

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <ChartContainer
        config={chartConfig}
        className="min-h-[180px] w-full flex-1 rounded-[20px] bg-card"
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
            innerRadius={DONUT_INNER_RADIUS}
            outerRadius={DONUT_OUTER_RADIUS}
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
            <Label
              position="center"
              content={() => {
                const totalText = formatAxisValue(total, donutCurrency);
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
          </Pie>
          <ChartTooltip offset={20} content={<ChartTooltipContent labelKey="label" />} />
        </PieChart>
      </ChartContainer>
      <div className="flex flex-wrap justify-center gap-2">
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
                {truncateLabel(entry.label, 22)}
              </span>
              <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                {pct}%
              </span>
              <span className="tabular-nums text-[var(--color-text-muted)]">
                {formatMetric(entry.value, donutCurrency)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
