import type { ChartConfig, SerializedRow } from "@/shared/contracts";
import { buildGroupedSeries } from "@/features/dashboard/client/runtime";
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
  BAR_CATEGORY_BUDGET,
  ECHARTS_GRID,
  ECHARTS_INK,
  ECHARTS_TEXT,
  LABEL_TRUNCATION,
  MAX_BAR_SIZE,
  SIGNAL,
  type ChartRenderClass,
} from "./chart-theme";

type BarChartViewProps = {
  chart: ChartConfig;
  rows: SerializedRow[];
  size: ChartRenderClass;
  width: number;
  height: number;
  isInteracting?: boolean;
};

export function BarChartView({
  chart,
  rows,
  size,
  width,
  height,
  isInteracting = false,
}: BarChartViewProps) {
  const horizontal = chart.orientation === "horizontal";
  const budget =
    BAR_CATEGORY_BUDGET[size][horizontal ? "horizontal" : "vertical"];
  const series = buildGroupedSeries(chart, rows, { categoryLimit: budget });
  if (series.length === 0) return <ChartEmptyState />;

  const currency = chartCurrency(chart);
  const compact = size === "medium";
  const showLabels = series.length <= 8;
  const categoryAxis = {
    type: "category",
    data: series.map((item) => item.label),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: ECHARTS_TEXT,
      fontSize: 11,
      formatter: (value: string) =>
        formatAxisValue(value, null, LABEL_TRUNCATION[size]),
    },
  };
  const valueAxis = {
    type: "value",
    show: !compact && !showLabels,
    splitLine: { lineStyle: { color: ECHARTS_GRID } },
    axisLabel: {
      color: ECHARTS_TEXT,
      fontSize: 11,
      formatter: (value: number) => formatAxisValue(value, currency),
    },
  };
  const option = {
    animationDuration: 300,
    grid: horizontal
      ? {
          top: 8,
          right: showLabels ? 72 : 18,
          bottom: 20,
          left: compact ? 92 : 132,
        }
      : {
          top: showLabels ? 32 : 12,
          right: 16,
          bottom: 38,
          left: compact ? 12 : 58,
        },
    tooltip: {
      trigger: "axis",
      renderMode: "richText",
      axisPointer: {
        type: "shadow",
        shadowStyle: { color: "rgba(47,109,246,.06)" },
      },
      valueFormatter: (value: number) => String(formatMetric(value, currency)),
    },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    series: [
      {
        name: metricLabel(chart),
        type: "bar",
        data: series.map((item, index) => ({
          value: item.value,
          itemStyle: {
            color: index === 0 ? SIGNAL : ACCENT_BRIGHT,
            borderRadius: horizontal ? [0, 7, 7, 0] : [7, 7, 0, 0],
          },
        })),
        barMaxWidth: MAX_BAR_SIZE[size],
        label: {
          show: showLabels,
          position: horizontal ? "right" : "top",
          distance: 7,
          color: ECHARTS_INK,
          fontSize: 11,
          fontWeight: 600,
          formatter: (params: { value: number }) =>
            String(formatMetric(params.value, currency)),
        },
      },
    ],
  };

  return (
    <EChart
      option={option}
      width={width}
      height={height}
      label={`${chart.title}. ${series.length} categories ranked by ${metricLabel(chart)}.`}
      isInteracting={isInteracting}
    />
  );
}
