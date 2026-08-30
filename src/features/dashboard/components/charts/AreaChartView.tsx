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
  tooltipStyle,
  useChartColors,
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
  const colors = useChartColors();
  const series = buildAreaSeries(chart, rows);
  if (series.length === 0) return <ChartEmptyState />;

  const currency = chartCurrency(chart);
  const compact = size === "medium";
  const labels = series.map((item) => item.label);
  const values = series.map((item) => item.value);
  const lastIndex = values.length - 1;
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
      right: compact ? 16 : 88,
      bottom: 28,
      left: compact ? 12 : 64,
      containLabel: false,
    },
    tooltip: {
      trigger: "axis",
      renderMode: "richText",
      valueFormatter: (value: number) => String(formatMetric(value, currency)),
      axisPointer: { type: "line", lineStyle: { color: colors.grid } },
      ...tooltipStyle(colors),
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: colors.axis,
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
      splitLine: { lineStyle: { color: colors.grid } },
      axisLabel: {
        color: colors.axis,
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
              smooth: false,
              showSymbol: true,
              symbol: "circle",
              symbolSize: 5,
              lineStyle: {
                color: colors.mutedForeground,
                width: 1.5,
                type: "dashed",
              },
            },
          ]
        : []),
      {
        name: metricLabel(chart),
        type: "line",
        data: values.map((value, index) => ({
          value,
          // Default mark is neutral grey; only the latest point carries the
          // accent (design-system-v2 §7.1 — quiet by default, loud once).
          itemStyle: {
            color: index === lastIndex ? colors.accent : colors.neutral,
            borderColor: colors.popover,
            borderWidth: 2,
          },
        })),
        smooth: false,
        showSymbol: true,
        symbol: "circle",
        symbolSize: compact ? 5 : 6,
        lineStyle: { color: colors.neutral, width: 3, cap: "round" },
        emphasis: {
          itemStyle: { color: colors.accent },
        },
        endLabel: compact
          ? { show: false }
          : {
              show: true,
              color: colors.foreground,
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
