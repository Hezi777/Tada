import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import type { ChartConfig, SerializedRow } from "@/shared/contracts";
import { ChartContainer, ChartTooltip } from "@/shared/ui/chart";
import { buildScatterSeries } from "@/features/dashboard/client/runtime";
import { ChartEmptyState } from "./ChartEmptyState";
import {
  buildScatterChartConfig,
  columnCurrency,
  formatAxisValue,
  formatMetric,
} from "./chart-format";
import {
  CARTESIAN_MARGIN,
  CHART_ANIMATION_DURATION,
  CHART_ANIMATION_EASING,
  CHART_AXIS_COLOR,
  CHART_GLOW_BLUR,
  CHART_GLOW_OPACITY,
  CHART_GRID_COLOR,
  GRADIENT_PRIMARY_STOPS,
  Y_AXIS_WIDTH,
  gradientId,
} from "./chart-theme";

type ChartTooltipPoint = {
  value?: number;
  color?: string;
  payload?: {
    x?: number;
    y?: number;
  };
};

function ScatterTooltip({
  active,
  payload,
  xLabel,
  yLabel,
  xCurrency,
  yCurrency,
}: {
  active?: boolean;
  payload?: ChartTooltipPoint[];
  xLabel: string;
  yLabel: string;
  xCurrency: string | null;
  yCurrency: string | null;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0];
  const xValue = point.payload?.x;
  const yValue = point.payload?.y;

  return (
    <div className="grid min-w-[10rem] gap-2 rounded-[1.25rem] border border-[var(--color-border)] bg-card/90 px-3.5 py-2.5 text-xs shadow-premium backdrop-blur-md">
      <div className="font-medium text-[var(--color-text-primary)]">
        Scatter point
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[var(--color-text-secondary)]">{xLabel}</span>
        <span className="font-display font-semibold tabular-nums text-[var(--color-text-primary)]">
          {formatMetric(xValue ?? 0, xCurrency)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[var(--color-text-secondary)]">{yLabel}</span>
        <span className="font-display font-semibold tabular-nums text-[var(--color-text-primary)]">
          {formatMetric(yValue ?? 0, yCurrency)}
        </span>
      </div>
    </div>
  );
}

type ScatterChartViewProps = {
  chart: ChartConfig;
  rows: SerializedRow[];
  /** Fixed plot box (grid.ts chartPlotBox) — never measured. Scatter
   * supports large/xlarge only (docs/WIDGET_SIZING.md §2), and the two
   * classes share this one view; only the plot box differs. */
  width: number;
  height: number;
  /** When true, disables Recharts animation (e.g. while dragging). */
  isInteracting?: boolean;
};

/** Scatter plot with clean accent-filled dots (subtle radial gradient), no
 * glow. */
export function ScatterChartView({
  chart,
  rows,
  width,
  height,
  isInteracting = false,
}: ScatterChartViewProps) {
  const series = buildScatterSeries(chart, rows);
  if (series.length === 0) {
    return <ChartEmptyState />;
  }

  const chartConfig = buildScatterChartConfig(chart);
  const xLabel = chart.columns[0] ?? "X";
  const yLabel = chart.columns[1] ?? "Y";
  const xCurrency = columnCurrency(xLabel);
  const yCurrency = columnCurrency(yLabel);
  const dotGradientId = gradientId(chart.id, "scatter-dot");
  const glowFilterId = gradientId(chart.id, "scatter-glow");

  return (
    <ChartContainer
      config={chartConfig}
      width={width}
      height={height}
      className="rounded-[20px] bg-card"
    >
      <ScatterChart margin={CARTESIAN_MARGIN}>
        <defs>
          <radialGradient id={dotGradientId} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={GRADIENT_PRIMARY_STOPS[0]} />
            <stop offset="100%" stopColor={GRADIENT_PRIMARY_STOPS[1]} />
          </radialGradient>
          <filter id={glowFilterId} x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation={CHART_GLOW_BLUR}
              floodColor={GRADIENT_PRIMARY_STOPS[0]}
              floodOpacity={CHART_GLOW_OPACITY}
            />
          </filter>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          axisLine={false}
          tickLine={false}
          fontSize={11}
          tickMargin={10}
          width={Y_AXIS_WIDTH}
          tickFormatter={(value: number) => formatAxisValue(value, xCurrency)}
          stroke={CHART_AXIS_COLOR}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          axisLine={false}
          tickLine={false}
          fontSize={11}
          tickMargin={10}
          width={Y_AXIS_WIDTH}
          tickFormatter={(value: number) => formatAxisValue(value, yCurrency)}
          stroke={CHART_AXIS_COLOR}
        />
        <ChartTooltip
          cursor={{
            stroke: "var(--color-chart-cursor-line)",
            strokeDasharray: "4 8",
          }}
          content={
            <ScatterTooltip
              xLabel={xLabel}
              yLabel={yLabel}
              xCurrency={xCurrency}
              yCurrency={yCurrency}
            />
          }
        />
        <Scatter
          data={series}
          fill={`url(#${dotGradientId})`}
          fillOpacity={0.7}
          stroke="var(--color-surface)"
          strokeWidth={1}
          filter={`url(#${glowFilterId})`}
          isAnimationActive={!isInteracting}
          animationDuration={CHART_ANIMATION_DURATION}
          animationEasing={CHART_ANIMATION_EASING}
        />
      </ScatterChart>
    </ChartContainer>
  );
}
