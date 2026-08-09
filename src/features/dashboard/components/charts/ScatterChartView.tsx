import type { ChartConfig, SerializedRow } from "@/shared/contracts";
import { buildScatterSeries } from "@/features/dashboard/client/runtime";
import { ChartEmptyState } from "./ChartEmptyState";
import { EChart } from "./EChart";
import { columnCurrency, formatAxisValue, formatMetric } from "./chart-format";
import {
  ACCENT_BRIGHT,
  ECHARTS_GRID,
  ECHARTS_TEXT,
  SIGNAL,
} from "./chart-theme";

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
  const series = buildScatterSeries(chart, rows);
  if (series.length === 0) return <ChartEmptyState />;

  const xLabel = chart.columns[0] ?? "X";
  const yLabel = chart.columns[1] ?? "Y";
  const xCurrency = columnCurrency(xLabel);
  const yCurrency = columnCurrency(yLabel);
  const option = {
    animationDuration: 280,
    grid: { top: 18, right: 20, bottom: 42, left: 64 },
    tooltip: {
      trigger: "item",
      renderMode: "richText",
      formatter: (params: { value: [number, number] }) =>
        `${xLabel}: ${formatMetric(params.value[0], xCurrency)}\n${yLabel}: ${formatMetric(params.value[1], yCurrency)}`,
    },
    xAxis: {
      type: "value",
      name: xLabel,
      nameLocation: "middle",
      nameGap: 28,
      nameTextStyle: { color: ECHARTS_TEXT, fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: ECHARTS_GRID } },
      axisLabel: {
        color: ECHARTS_TEXT,
        fontSize: 11,
        formatter: (value: number) => formatAxisValue(value, xCurrency),
      },
    },
    yAxis: {
      type: "value",
      name: yLabel,
      nameTextStyle: { color: ECHARTS_TEXT, fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: ECHARTS_GRID } },
      axisLabel: {
        color: ECHARTS_TEXT,
        fontSize: 11,
        formatter: (value: number) => formatAxisValue(value, yCurrency),
      },
    },
    series: [
      {
        type: "scatter",
        data: series.map((point) => [point.x, point.y]),
        symbolSize: 11,
        itemStyle: {
          color: ACCENT_BRIGHT,
          opacity: 0.68,
          borderColor: "#fff",
          borderWidth: 1.5,
        },
        emphasis: {
          scale: 1.4,
          itemStyle: { color: SIGNAL, opacity: 1 },
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
