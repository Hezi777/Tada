import type { ChartConfig, SerializedRow } from "@/shared/contracts";
import { buildScatterSeries } from "@/features/dashboard/client/runtime";
import { ChartEmptyState } from "./ChartEmptyState";
import { EChart } from "./EChart";
import {
  columnCurrency,
  displayColumnLabel,
  formatAxisValue,
  formatMetric,
} from "./chart-format";
import { tooltipStyle, useChartColors } from "./chart-theme";

type ScatterChartViewProps = {
  chart: ChartConfig;
  rows: SerializedRow[];
  width: number;
  height: number;
  isInteracting?: boolean;
};

export function ScatterChartView({
  chart,
  rows,
  width,
  height,
  isInteracting = false,
}: ScatterChartViewProps) {
  const colors = useChartColors();
  const series = buildScatterSeries(chart, rows);
  if (series.length === 0) return <ChartEmptyState />;

  const xColumn = chart.columns[0] ?? "X";
  const yColumn = chart.columns[1] ?? "Y";
  const xLabel = displayColumnLabel(xColumn);
  const yLabel = displayColumnLabel(yColumn);
  const xCurrency = columnCurrency(xColumn);
  const yCurrency = columnCurrency(yColumn);
  const option = {
    animationDuration: 280,
    grid: { top: 18, right: 20, bottom: 42, left: 64 },
    tooltip: {
      trigger: "item",
      renderMode: "richText",
      formatter: (params: { value: [number, number] }) =>
        `${xLabel}: ${formatMetric(params.value[0], xCurrency)}\n${yLabel}: ${formatMetric(params.value[1], yCurrency)}`,
      ...tooltipStyle(colors),
    },
    xAxis: {
      type: "value",
      name: xLabel,
      nameLocation: "middle",
      nameGap: 28,
      nameTextStyle: { color: colors.axis, fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: colors.grid } },
      axisLabel: {
        color: colors.axis,
        fontSize: 11,
        formatter: (value: number) => formatAxisValue(value, xCurrency),
      },
    },
    yAxis: {
      type: "value",
      name: yLabel,
      nameTextStyle: { color: colors.axis, fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: colors.grid } },
      axisLabel: {
        color: colors.axis,
        fontSize: 11,
        formatter: (value: number) => formatAxisValue(value, yCurrency),
      },
    },
    series: [
      {
        type: "scatter",
        // Points default to neutral grey; only the hovered point takes the
        // accent (design-system-v2 §7.1).
        data: series.map((point) => [point.x, point.y]),
        symbolSize: 11,
        itemStyle: {
          color: colors.neutral,
          opacity: 0.9,
          borderColor: colors.popover,
          borderWidth: 1.5,
        },
        emphasis: {
          scale: 1.4,
          itemStyle: { color: colors.accent, opacity: 1 },
        },
      },
    ],
  };

  return (
    <EChart
      option={option}
      width={width}
      height={height}
      label={`${chart.title}. Scatter plot of ${xLabel} against ${yLabel} with ${series.length} points.`}
      isInteracting={isInteracting}
    />
  );
}
