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
  BAR_CATEGORY_BUDGET,
  LABEL_TRUNCATION,
  MAX_BAR_SIZE,
  tooltipStyle,
  useChartColors,
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
  // Ranked categories read most clearly as horizontal bars: the visual order
  // matches the sorted data and labels do not need rotation or ellipsis.
  const colors = useChartColors();
  const horizontal = Boolean(chart.groupBy);
  const budget =
    BAR_CATEGORY_BUDGET[size][horizontal ? "horizontal" : "vertical"];
  const series = buildGroupedSeries(chart, rows, { categoryLimit: budget });
  if (series.length === 0) return <ChartEmptyState />;

  const currency = chartCurrency(chart);
  const compact = size === "medium";
  const showLabels = series.length <= 8;
  const longestCategory = Math.max(
    ...series.map((item) => item.label.length),
    0,
  );
  // 7.2px/char, not 6.4: these labels are rendered UPPERCASE (§7.4) and caps
  // are materially wider than the mixed-case average that 6.4 was fitted to.
  // Under-measuring here is what forced multi-line wrapping and let a long
  // label ("OFFICE SUPPLIES") collide with its neighbours.
  const categoryLabelWidth = Math.min(
    Math.max(88, longestCategory * 7.2),
    width * 0.38,
  );
  const categoryAxis = {
    type: "category",
    data: series.map((item) => item.label),
    inverse: horizontal,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: colors.axis,
      fontSize: 11,
      interval: 0,
      hideOverlap: false,
      width: horizontal ? categoryLabelWidth : undefined,
      // Truncate rather than break. A wrapped label needs two lines of the
      // category band's height, which a bar band does not have — the second
      // line rides over the neighbouring category.
      overflow: "truncate",
      lineHeight: 14,
      // Category axis on bar charts is UPPERCASE (design-system-v2 §7.4).
      formatter: (value: string) =>
        (horizontal
          ? value
          : formatAxisValue(value, null, LABEL_TRUNCATION[size])
        ).toUpperCase(),
    },
  };
  const valueAxis = {
    type: "value",
    show: !compact && !showLabels,
    splitLine: { lineStyle: { color: colors.grid } },
    axisLabel: {
      color: colors.axis,
      fontSize: 11,
      formatter: (value: number) => formatAxisValue(value, currency),
    },
  };
  const option = {
    animationDuration: 300,
    grid: horizontal
      ? {
          top: 8,
          // Wide enough for a fully-abbreviated currency value label
          // ("$132.5K") plus its distance offset, so it never clips against
          // the plot's right edge.
          right: showLabels ? 96 : 18,
          bottom: 20,
          left: categoryLabelWidth + 14,
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
        shadowStyle: { color: colors.accent.replace(")", " / 0.08)") },
      },
      valueFormatter: (value: number) => String(formatMetric(value, currency)),
      ...tooltipStyle(colors),
    },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    series: [
      {
        name: metricLabel(chart),
        type: "bar",
        data: series.map((item, index) => ({
          value: item.value,
          // Default fill is neutral grey; only the leading (max/latest)
          // category carries the accent — the rest stay quiet until
          // hovered (design-system-v2 §7.1).
          itemStyle: {
            color: index === 0 ? colors.accent : colors.neutral,
            borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0],
          },
        })),
        emphasis: {
          itemStyle: { color: colors.accent },
        },
        barMaxWidth: MAX_BAR_SIZE[size],
        label: {
          show: showLabels,
          position: horizontal ? "right" : "top",
          distance: 7,
          color: colors.foreground,
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
