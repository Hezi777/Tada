import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { ChartConfig, SerializedRow } from "@/shared/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart";
import { buildAreaSeries } from "@/features/dashboard/client/runtime";
import { ChartEmptyState } from "./ChartEmptyState";
import {
  buildValueChartConfig,
  chartCurrency,
  formatAxisValue,
  makeCurrencyTooltipFormatter,
  metricLabel,
} from "./chart-format";
import {
  CARTESIAN_MARGIN,
  CHART_ANIMATION_DURATION,
  CHART_ANIMATION_EASING,
  CHART_AXIS_COLOR,
  CHART_GLOW_BLUR,
  CHART_GLOW_OPACITY,
  CHART_GRID_COLOR,
  COMPARISON_STROKE_COLOR,
  GRADIENT_PRIMARY_STOPS,
  Y_AXIS_WIDTH,
  gradientId,
  type ChartRenderClass,
} from "./chart-theme";

type AreaChartViewProps = {
  chart: ChartConfig;
  rows: SerializedRow[];
  /** Render class — Small never reaches this view (headline substitution).
   * Medium renders the axis-free sparkline view with first/last x labels. */
  size: ChartRenderClass;
  /** Fixed plot box (grid.ts chartPlotBox) — never measured. */
  width: number;
  height: number;
  /** Optional muted dashed "previous period" series, keyed by the same
   * `label` as the primary series. Off by default. */
  comparisonSeries?: Array<{ label: string; value: number }>;
  /** When true, disables Recharts animation (e.g. while dragging). */
  isInteracting?: boolean;
};

/** Area chart with a soft gradient fill under a single accent stroke, plus
 * an optional muted dashed comparison line. The medium view is a sparkline:
 * no y-axis, no gridlines, x labels at the first and last points only
 * (degradation contract, docs/WIDGET_SIZING.md §5). */
export function AreaChartView({
  chart,
  rows,
  size,
  width,
  height,
  comparisonSeries,
  isInteracting = false,
}: AreaChartViewProps) {
  const series = buildAreaSeries(chart, rows);
  if (series.length === 0) {
    return <ChartEmptyState />;
  }

  const chartConfig = buildValueChartConfig(metricLabel(chart));
  const currency = chartCurrency(chart);
  const isSparkline = size === "medium";
  const fillGradientId = gradientId(chart.id, "area-fill");
  const glowFilterId = gradientId(chart.id, "area-glow");
  const endpointTicks = [series[0].label, series[series.length - 1].label];

  const data = comparisonSeries
    ? series.map((entry) => {
        const comparison = comparisonSeries.find(
          (item) => item.label === entry.label,
        );
        return { ...entry, comparison: comparison?.value };
      })
    : series;

  return (
    <ChartContainer
      config={chartConfig}
      width={width}
      height={height}
      className="rounded-[20px] bg-card"
    >
      <AreaChart data={data} margin={CARTESIAN_MARGIN}>
        <defs>
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={GRADIENT_PRIMARY_STOPS[0]}
              stopOpacity={0.28}
            />
            <stop
              offset="55%"
              stopColor={GRADIENT_PRIMARY_STOPS[0]}
              stopOpacity={0.08}
            />
            <stop
              offset="100%"
              stopColor={GRADIENT_PRIMARY_STOPS[0]}
              stopOpacity={0}
            />
          </linearGradient>
          <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation={CHART_GLOW_BLUR}
              floodColor={GRADIENT_PRIMARY_STOPS[0]}
              floodOpacity={CHART_GLOW_OPACITY}
            />
          </filter>
        </defs>
        {isSparkline ? null : (
          <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
        )}
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          fontSize={11}
          tickMargin={isSparkline ? 4 : 10}
          minTickGap={20}
          ticks={isSparkline ? endpointTicks : undefined}
          interval={isSparkline ? 0 : undefined}
          tickFormatter={formatAxisValue}
          stroke={CHART_AXIS_COLOR}
        />
        {isSparkline ? null : (
          <YAxis
            axisLine={false}
            tickLine={false}
            fontSize={11}
            tickMargin={10}
            width={Y_AXIS_WIDTH}
            tickFormatter={(value: number) => formatAxisValue(value, currency)}
            stroke={CHART_AXIS_COLOR}
          />
        )}
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={currency ? makeCurrencyTooltipFormatter(currency) : undefined}
            />
          }
        />
        {comparisonSeries ? (
          <Area
            type="monotone"
            dataKey="comparison"
            stroke={COMPARISON_STROKE_COLOR}
            strokeWidth={1.5}
            strokeDasharray="5 5"
            fill="none"
            dot={false}
            isAnimationActive={!isInteracting}
            animationDuration={CHART_ANIMATION_DURATION}
            animationEasing={CHART_ANIMATION_EASING}
          />
        ) : null}
        <Area
          type="monotone"
          dataKey="value"
          stroke={GRADIENT_PRIMARY_STOPS[0]}
          strokeWidth={2}
          fill={`url(#${fillGradientId})`}
          filter={`url(#${glowFilterId})`}
          dot={false}
          activeDot={{
            r: 4.5,
            fill: GRADIENT_PRIMARY_STOPS[0],
            stroke: "var(--color-surface)",
            strokeWidth: 2.5,
          }}
          isAnimationActive={!isInteracting}
          animationDuration={CHART_ANIMATION_DURATION}
          animationEasing={CHART_ANIMATION_EASING}
        />
      </AreaChart>
    </ChartContainer>
  );
}
