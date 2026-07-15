import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import type { ChartConfig, SerializedRow } from "@/shared/contracts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";
import { buildGroupedSeries } from "@/features/dashboard/client/runtime";
import { ChartEmptyState } from "./ChartEmptyState";
import {
  buildValueChartConfig,
  chartCurrency,
  formatAxisValue,
  makeCurrencyTooltipFormatter,
  metricLabel,
} from "./chart-format";
import {
  ACCENT,
  ACCENT_BRIGHT,
  BAR_CATEGORY_BUDGET,
  CHART_ANIMATION_DURATION,
  CHART_ANIMATION_EASING,
  CHART_AXIS_COLOR,
  CHART_GLOW_BLUR,
  CHART_GLOW_OPACITY,
  CHART_GRID_COLOR,
  CHART_LABEL_COLOR,
  LABEL_TRUNCATION,
  MAX_BAR_SIZE,
  gradientId,
  HORIZONTAL_BAR_MARGIN,
  LOW_CARDINALITY_THRESHOLD,
  VERTICAL_BAR_MARGIN,
  Y_AXIS_WIDTH,
  type ChartRenderClass,
} from "./chart-theme";

/** Direct value labels stay legible only when there aren't too many bars;
 * past this we drop the labels and keep the value axis instead. */
const DATA_LABEL_MAX_BARS = 8;

/** Headroom above/beside bars so direct labels never clip the plot edge. */
const labelDomain: [number, (max: number) => number] = [
  0,
  (max: number) => (max > 0 ? max * 1.15 : 1),
];

type BarChartViewProps = {
  chart: ChartConfig;
  rows: SerializedRow[];
  /** Render class — Small never reaches this view (headline substitution). */
  size: ChartRenderClass;
  /** Fixed plot box (grid.ts chartPlotBox) — never measured. */
  width: number;
  height: number;
  /** When true, disables Recharts animation (e.g. while dragging). */
  isInteracting?: boolean;
};

/** Bar chart (vertical or horizontal, per `chart.orientation`). Uniform brand
 * gradient bars (zero baseline), value-sorted, with direct data labels when the
 * category count is low — in which case the redundant value axis is hidden.
 * The medium view drops the value axis and gridlines entirely (degradation
 * contract, docs/WIDGET_SIZING.md §5). */
export function BarChartView({
  chart,
  rows,
  size,
  width,
  height,
  isInteracting = false,
}: BarChartViewProps) {
  const isHorizontal = chart.orientation === "horizontal";
  const budget =
    BAR_CATEGORY_BUDGET[size][isHorizontal ? "horizontal" : "vertical"];
  const series = buildGroupedSeries(chart, rows, { categoryLimit: budget });
  if (series.length === 0) {
    return <ChartEmptyState />;
  }

  const chartConfig = buildValueChartConfig(metricLabel(chart));
  const currency = chartCurrency(chart);
  const isCompact = size === "medium";
  const maxBarSize = MAX_BAR_SIZE[size];
  const labelChars = LABEL_TRUNCATION[size];
  const showLabels = isCompact || series.length <= DATA_LABEL_MAX_BARS;
  const fillId = gradientId(chart.id, "bar-fill");
  const glowFilterId = gradientId(chart.id, "bar-glow");
  const labelFormatter = (value: number) => formatAxisValue(value, currency);

  if (isHorizontal) {
    // Long category labels read better on horizontal bars (BI rule
    // long_labels_use_horizontal_bar).
    return (
      <ChartContainer
        config={chartConfig}
        width={width}
        height={height}
        className="rounded-[20px] bg-card"
      >
        <BarChart data={series} layout="vertical" margin={HORIZONTAL_BAR_MARGIN}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={ACCENT} />
              <stop offset="100%" stopColor={ACCENT_BRIGHT} />
            </linearGradient>
            <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation={CHART_GLOW_BLUR}
                floodColor={ACCENT_BRIGHT}
                floodOpacity={CHART_GLOW_OPACITY}
              />
            </filter>
          </defs>
          {isCompact ? null : (
            <CartesianGrid horizontal={false} stroke={CHART_GRID_COLOR} />
          )}
          <XAxis
            type="number"
            hide={showLabels}
            domain={showLabels ? labelDomain : undefined}
            axisLine={false}
            tickLine={false}
            fontSize={11}
            tickMargin={8}
            tickFormatter={(value: number) => formatAxisValue(value, currency)}
            stroke={CHART_AXIS_COLOR}
          />
          <YAxis
            type="category"
            dataKey="label"
            axisLine={false}
            tickLine={false}
            fontSize={11}
            tickMargin={8}
            width={isCompact ? 88 : 128}
            interval={series.length <= LOW_CARDINALITY_THRESHOLD ? 0 : undefined}
            tickFormatter={(value: string) =>
              formatAxisValue(value, null, labelChars)
            }
            stroke={CHART_AXIS_COLOR}
          />
          <ChartTooltip
            cursor={{ fill: "var(--color-chart-hover)" }}
            content={
              <ChartTooltipContent
                formatter={currency ? makeCurrencyTooltipFormatter(currency) : undefined}
              />
            }
          />
          <Bar
            dataKey="value"
            fill={`url(#${fillId})`}
            filter={`url(#${glowFilterId})`}
            radius={[0, 8, 8, 0]}
            maxBarSize={maxBarSize}
            isAnimationActive={!isInteracting}
            animationDuration={CHART_ANIMATION_DURATION}
            animationEasing={CHART_ANIMATION_EASING}
          >
            {showLabels ? (
              <LabelList
                dataKey="value"
                position="right"
                offset={8}
                fill={CHART_LABEL_COLOR}
                fontSize={11}
                fontWeight={600}
                formatter={labelFormatter}
              />
            ) : null}
          </Bar>
        </BarChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      width={width}
      height={height}
      className="rounded-[20px] bg-card"
    >
      <BarChart data={series} margin={VERTICAL_BAR_MARGIN}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT_BRIGHT} />
            <stop offset="100%" stopColor={ACCENT} />
          </linearGradient>
          <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation={CHART_GLOW_BLUR}
              floodColor={ACCENT_BRIGHT}
              floodOpacity={CHART_GLOW_OPACITY}
            />
          </filter>
        </defs>
        {isCompact ? null : (
          <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
        )}
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          fontSize={11}
          tickMargin={isCompact ? 6 : 10}
          minTickGap={18}
          interval={series.length <= LOW_CARDINALITY_THRESHOLD ? 0 : undefined}
          tickFormatter={(value: string | number) =>
            formatAxisValue(value, null, labelChars)
          }
          stroke={CHART_AXIS_COLOR}
        />
        <YAxis
          hide={showLabels}
          domain={showLabels ? labelDomain : undefined}
          axisLine={false}
          tickLine={false}
          fontSize={11}
          tickMargin={10}
          width={Y_AXIS_WIDTH}
          tickFormatter={(value: number) => formatAxisValue(value, currency)}
          stroke={CHART_AXIS_COLOR}
        />
        <ChartTooltip
          cursor={{ fill: "var(--color-chart-hover)" }}
          content={
            <ChartTooltipContent
              formatter={currency ? makeCurrencyTooltipFormatter(currency) : undefined}
            />
          }
        />
        <Bar
          dataKey="value"
          fill={`url(#${fillId})`}
          filter={`url(#${glowFilterId})`}
          radius={[8, 8, 0, 0]}
          maxBarSize={maxBarSize}
          isAnimationActive={!isInteracting}
          animationDuration={CHART_ANIMATION_DURATION}
          animationEasing={CHART_ANIMATION_EASING}
        >
          {showLabels ? (
            <LabelList
              dataKey="value"
              position="top"
              offset={8}
              fill={CHART_LABEL_COLOR}
              fontSize={11}
              fontWeight={600}
              formatter={labelFormatter}
            />
          ) : null}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
