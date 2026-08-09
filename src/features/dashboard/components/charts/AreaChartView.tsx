import type { ChartConfig, SerializedRow } from "@/shared/contracts";
import { buildAreaSeries } from "@/features/dashboard/client/runtime";
import { ChartEmptyState } from "./ChartEmptyState";
import { EChart } from "./EChart";
import {
  chartCurrency,
  formatAxisValue,
  formatMetric,
  metricLabel,
} from "./chart-format";
import {
  ACCENT_BRIGHT,
  COMPARISON_STROKE_COLOR,
  ECHARTS_GRID,
  ECHARTS_INK,
  ECHARTS_TEXT,
  SIGNAL,
  type ChartRenderClass,
} from "./chart-theme";

type AreaChartViewProps = {
  chart: ChartConfig;
  rows: SerializedRow[];
  size: ChartRenderClass;
  width: number;
  height: number;
  comparisonSeries?: Array<{ label: string; value: number }>;
  isInteracting?: boolean;
};

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
  if (series.length === 0) return <ChartEmptyState />;

  const currency = chartCurrency(chart);
  const compact = size === "medium";
  const labels = series.map((item) => item.label);
  const values = series.map((item) => item.value);
  const comparisons = comparisonSeries
    ? series.map(
        (point) =>
          comparisonSeries.find((item) => item.label === point.label)?.value ??
          null,
      )
    : undefined;
  const option = {
    animationDuration: 320,
    grid: {
      top: 18,
      right: compact ? 16 : 28,
      bottom: 28,
      left: compact ? 12 : 64,
      containLabel: false,
    },
    tooltip: {
      trigger: "axis",
      renderMode: "richText",
      valueFormatter: (value: number) => String(formatMetric(value, currency)),
      axisPointer: { type: "line", lineStyle: { color: ECHARTS_GRID } },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: ECHARTS_TEXT,
        fontSize: 11,
        formatter: (value: string, index: number) =>
          compact && index !== 0 && index !== labels.length - 1
            ? ""
            : formatAxisValue(value),
      },
    },
    yAxis: {
      type: "value",
      show: !compact,
      splitLine: { lineStyle: { color: ECHARTS_GRID } },
      axisLabel: {
        color: ECHARTS_TEXT,
        fontSize: 11,
        formatter: (value: number) => formatAxisValue(value, currency),
      },
    },
    series: [
      ...(comparisons
        ? [
            {
              name: "Previous period",
              type: "line",
              data: comparisons,
              smooth: 0.35,
              symbol: "none",
              lineStyle: {
                color: COMPARISON_STROKE_COLOR,
                width: 1.5,
                type: "dashed",
              },
            },
          ]
        : []),
      {
        name: metricLabel(chart),
        type: "line",
        data: values,
        smooth: 0.35,
        showSymbol: false,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { color: ACCENT_BRIGHT, width: 3, cap: "round" },
        itemStyle: { color: SIGNAL, borderColor: "#fff", borderWidth: 2 },
        endLabel: compact
          ? { show: false }
          : {
              show: true,
              color: ECHARTS_INK,
              fontSize: 11,
              fontWeight: 600,
              formatter: (params: { value: number }) =>
                String(formatMetric(params.value, currency)),
              distance: 8,
            },
      },
    ],
  };

  return (
    <EChart
      option={option}
      width={width}
      height={height}
      label={`${chart.title}. ${series.length} time points for ${metricLabel(chart)}.`}
      isInteracting={isInteracting}
    />
  );
}
