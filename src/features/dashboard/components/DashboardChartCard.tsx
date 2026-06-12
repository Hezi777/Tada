import { memo, useState, type CSSProperties } from "react";
import { GripVertical, Scaling } from "lucide-react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  Sector,
  XAxis,
  YAxis,
} from "recharts";
import type { SerializedRow } from "@/shared/contracts";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig as ChartPrimitiveConfig,
} from "@/shared/ui/chart";
import {
  Tooltip as ShadTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import {
  buildAreaSeries,
  buildGroupedSeries,
  buildScatterSeries,
  formatNumber as legacyFormatNumber,
} from "@/features/dashboard/client/runtime";
import {
  abbreviateNumber,
  formatILS,
  looksLikeCurrencyColumn,
  ltrIsolate,
  truncateLabel,
} from "@/shared/lib/format";
import type { LayoutItem } from "@/features/dashboard/client/layout";
import { DASHBOARD_COLORS } from "@/features/dashboard/client/design";
import { updateChart } from "@/features/dashboard/client/store";

const CHART_COLOR = DASHBOARD_COLORS.primary;
const CHART_GRID_COLOR = DASHBOARD_COLORS.chartGrid;
const CHART_AXIS_COLOR = DASHBOARD_COLORS.chartAxis;

/** Shared cartesian axis treatment so margins/width line up across charts. */
const Y_AXIS_WIDTH = 60;
const CHART_ANIMATION_DURATION = 400;
const CHART_ANIMATION_EASING = "ease-out";

const donutPalette = [
  "#00327D",
  "#1C4D9E",
  "#2F65B5",
  "#4A7ACC",
  "#7395D9",
  "#9FB4E3",
];

type DashboardChartCardProps = {
  chart: LayoutItem;
  rows: SerializedRow[];
};

type ChartTooltipPoint = {
  value?: number;
  color?: string;
  payload?: {
    x?: number;
    y?: number;
  };
};

function formatMetric(
  value: string | number,
  isCurrency = false,
): string | number {
  if (typeof value === "string") {
    return value.trim() ? value : "-";
  }

  if (!Number.isFinite(value)) {
    return "-";
  }

  if (isCurrency) {
    return formatILS(value, Math.abs(value) >= 100_000);
  }

  return legacyFormatNumber(value) ?? value;
}

function formatAxisValue(value: string | number, isCurrency = false): string {
  if (typeof value === "number") {
    return isCurrency ? formatILS(value, true) : abbreviateNumber(value);
  }

  // Israeli date convention: DD/MM, never US month-first.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [, month, day] = value.split("-");
    return ltrIsolate(`${day}/${month}`);
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-");
    return ltrIsolate(`${month}/${year.slice(2)}`);
  }

  return truncateLabel(value, 13);
}

function buildValueChartConfig(label: string): ChartPrimitiveConfig {
  return {
    value: {
      label,
      color: CHART_COLOR,
    },
  };
}

/** The measure a chart aggregates, for tooltip labels. */
function metricLabel(chart: LayoutItem): string {
  const measure =
    chart.columns.find(
      (column) => column !== chart.groupBy && column !== chart.timeColumn,
    ) ?? null;
  if (
    chart.aggregation === "count" ||
    (!measure && chart.aggregation === null)
  ) {
    return "Count";
  }
  return measure ?? "Value";
}

/** Whether the chart's aggregated measure column looks like currency. */
function isCurrencyMetric(chart: LayoutItem): boolean {
  const measure =
    chart.columns.find(
      (column) => column !== chart.groupBy && column !== chart.timeColumn,
    ) ?? null;
  if (!measure || chart.aggregation === "count") {
    return false;
  }
  return looksLikeCurrencyColumn(measure);
}

function buildScatterChartConfig(chart: LayoutItem): ChartPrimitiveConfig {
  return {
    x: {
      label: chart.columns[0] ?? "X",
      color: CHART_COLOR,
    },
    y: {
      label: chart.columns[1] ?? "Y",
      color: CHART_COLOR,
    },
  };
}

function buildDonutChartConfig(
  series: Array<{ label: string; value: number }>,
): ChartPrimitiveConfig {
  const config: ChartPrimitiveConfig = {};

  series.forEach((entry, index) => {
    config[entry.label] = {
      label: entry.label,
      color: donutPalette[index % donutPalette.length],
    };
  });

  return config;
}

/** Mirrors ChartTooltipContent's default row layout, but formats the value
 * as currency when the underlying column looks like money. */
function currencyTooltipFormatter(
  value: number | string,
  name: string,
  item: { color?: string; payload?: Record<string, unknown> },
) {
  const fill = item.payload?.fill;
  const indicatorColor =
    (typeof fill === "string" ? fill : undefined) || item.color;

  return (
    <div className="flex w-full flex-1 items-center justify-between gap-2 leading-none">
      <div className="flex items-center gap-1.5">
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: indicatorColor }}
        />
        <span className="text-muted-foreground">{name}</span>
      </div>
      <span className="font-mono font-medium tabular-nums text-foreground">
        {formatMetric(Number(value), true)}
      </span>
    </div>
  );
}

function ChartEmptyState() {
  return (
    <div className="flex h-[180px] items-center justify-center rounded-[20px] bg-[var(--color-surface-muted)] px-6 text-center">
      <p className="text-sm text-[var(--color-text-secondary)]">
        This chart does not have enough data to render.
      </p>
    </div>
  );
}

function ScatterTooltip({
  active,
  payload,
  xLabel,
  yLabel,
  xIsCurrency,
  yIsCurrency,
}: {
  active?: boolean;
  payload?: ChartTooltipPoint[];
  xLabel: string;
  yLabel: string;
  xIsCurrency: boolean;
  yIsCurrency: boolean;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0];
  const xValue = point.payload?.x;
  const yValue = point.payload?.y;

  return (
    <div className="grid min-w-[10rem] gap-1.5 rounded-[16px] bg-white px-3 py-2 text-xs shadow-[0_18px_40px_-28px_rgba(25,28,30,0.25)]">
      <div className="font-medium text-[var(--color-text-primary)]">
        Scatter point
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[var(--color-text-secondary)]">{xLabel}</span>
        <span className="font-display font-semibold tabular-nums text-[var(--color-text-primary)]">
          {formatMetric(xValue ?? 0, xIsCurrency)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[var(--color-text-secondary)]">{yLabel}</span>
        <span className="font-display font-semibold tabular-nums text-[var(--color-text-primary)]">
          {formatMetric(yValue ?? 0, yIsCurrency)}
        </span>
      </div>
    </div>
  );
}

/** Chart heights scale with both the user's size choice and the donut's
 * tighter aspect ratio, so resizing visibly changes the chart. */
function getChartHeightClass(chart: LayoutItem): string {
  if (chart.type === "donut") {
    if (chart.size === "small") return "h-[220px]";
    if (chart.size === "large") return "h-[320px]";
    return "h-[260px]";
  }

  if (chart.colSpan >= 8) {
    if (chart.size === "small") return "h-[260px]";
    if (chart.size === "large") return "h-[380px]";
    return "h-[320px]";
  }

  if (chart.size === "small") return "h-[190px]";
  if (chart.size === "large") return "h-[300px]";
  return "h-[240px]";
}

/** Card min-height mirrors the chart area so larger sizes visibly grow. */
function getCardMinHeightClass(chart: LayoutItem): string {
  if (chart.colSpan >= 8) {
    if (chart.size === "small") return "min-h-[330px]";
    if (chart.size === "large") return "min-h-[450px]";
    return "min-h-[390px]";
  }

  if (chart.size === "small") return "min-h-[260px]";
  if (chart.size === "large") return "min-h-[370px]";
  return "min-h-[300px]";
}

const DashboardChartContent = memo(function DashboardChartContent({
  chart,
  rows,
}: {
  chart: LayoutItem;
  rows: SerializedRow[];
}) {
  const [activeSlice, setActiveSlice] = useState<number | undefined>(undefined);
  const chartHeightClass = getChartHeightClass(chart);

  if (chart.type === "area") {
    const series = buildAreaSeries(chart, rows);
    if (series.length === 0) {
      return <ChartEmptyState />;
    }

    const chartConfig = buildValueChartConfig(metricLabel(chart));
    const isCurrency = isCurrencyMetric(chart);

    return (
      <ChartContainer
        config={chartConfig}
        className={`${chartHeightClass} w-full aspect-auto rounded-[20px] bg-white`}
      >
        <AreaChart
          data={series}
          margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
        >
          <defs>
            <linearGradient id={`area-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.18} />
              <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke={CHART_GRID_COLOR}
            strokeDasharray="4 10"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            fontSize={11}
            tickMargin={10}
            minTickGap={20}
            tickFormatter={formatAxisValue}
            stroke={CHART_AXIS_COLOR}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            fontSize={11}
            tickMargin={10}
            width={Y_AXIS_WIDTH}
            tickFormatter={(value: number) =>
              formatAxisValue(value, isCurrency)
            }
            stroke={CHART_AXIS_COLOR}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={isCurrency ? currencyTooltipFormatter : undefined}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={CHART_COLOR}
            strokeWidth={3}
            fill={`url(#area-${chart.id})`}
            dot={false}
            activeDot={{
              r: 5,
              fill: CHART_COLOR,
              stroke: "#ffffff",
              strokeWidth: 3,
            }}
            isAnimationActive
            animationDuration={CHART_ANIMATION_DURATION}
            animationEasing={CHART_ANIMATION_EASING}
          />
        </AreaChart>
      </ChartContainer>
    );
  }

  if (chart.type === "scatter") {
    const series = buildScatterSeries(chart, rows);
    if (series.length === 0) {
      return <ChartEmptyState />;
    }

    const chartConfig = buildScatterChartConfig(chart);
    const xLabel = chart.columns[0] ?? "X";
    const yLabel = chart.columns[1] ?? "Y";
    const xIsCurrency = looksLikeCurrencyColumn(xLabel);
    const yIsCurrency = looksLikeCurrencyColumn(yLabel);

    return (
      <ChartContainer
        config={chartConfig}
        className={`${chartHeightClass} w-full aspect-auto rounded-[20px] bg-white`}
      >
        <ScatterChart margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid
            vertical={false}
            stroke={CHART_GRID_COLOR}
            strokeDasharray="4 10"
          />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            axisLine={false}
            tickLine={false}
            fontSize={11}
            tickMargin={10}
            width={Y_AXIS_WIDTH}
            tickFormatter={(value: number) =>
              formatAxisValue(value, xIsCurrency)
            }
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
            tickFormatter={(value: number) =>
              formatAxisValue(value, yIsCurrency)
            }
            stroke={CHART_AXIS_COLOR}
          />
          <ChartTooltip
            cursor={{ stroke: "#C6D5EE", strokeDasharray: "4 8" }}
            content={
              <ScatterTooltip
                xLabel={xLabel}
                yLabel={yLabel}
                xIsCurrency={xIsCurrency}
                yIsCurrency={yIsCurrency}
              />
            }
          />
          <Scatter
            data={series}
            fill={CHART_COLOR}
            fillOpacity={0.84}
            isAnimationActive
            animationDuration={CHART_ANIMATION_DURATION}
            animationEasing={CHART_ANIMATION_EASING}
          />
        </ScatterChart>
      </ChartContainer>
    );
  }

  const series = buildGroupedSeries(chart, rows);
  if (series.length === 0) {
    return <ChartEmptyState />;
  }

  if (chart.type === "donut") {
    const total = series.reduce((sum, entry) => sum + entry.value, 0);
    const chartConfig = buildDonutChartConfig(series);
    const totalLabel =
      chart.aggregation === "count" || chart.aggregation === null
        ? "Total Count"
        : `Total ${metricLabel(chart)}`;

    return (
      <ChartContainer
        config={chartConfig}
        className={`${chartHeightClass} w-full aspect-auto rounded-[20px] bg-white`}
      >
        <PieChart>
          <Pie
            data={series}
            dataKey="value"
            nameKey="label"
            paddingAngle={4}
            innerRadius="62%"
            outerRadius="82%"
            activeIndex={activeSlice}
            onMouseEnter={(_: unknown, index: number) => setActiveSlice(index)}
            onMouseLeave={() => setActiveSlice(undefined)}
            activeShape={(props: { outerRadius?: number | string }) => (
              <Sector {...props} outerRadius={Number(props.outerRadius) + 4} />
            )}
            isAnimationActive
            animationDuration={CHART_ANIMATION_DURATION}
            animationEasing={CHART_ANIMATION_EASING}
          >
            {series.map((_entry, index) => (
              <Cell
                key={`${chart.id}-slice-${index}`}
                fill={donutPalette[index % donutPalette.length]}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
            <Label
              position="center"
              content={() => {
                const totalText = formatAxisValue(
                  total,
                  isCurrencyMetric(chart),
                );
                // Long abbreviated totals (e.g. "₪1.2M") need a smaller
                // font so they stay inside the donut's inner radius.
                const valueFontSize = totalText.length > 7 ? "16px" : "20px";

                return (
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x="50%"
                      dy="-0.3em"
                      className="fill-[var(--color-text-primary)] font-bold"
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
          <ChartTooltip content={<ChartTooltipContent labelKey="label" />} />
          <ChartLegend
            content={
              <ChartLegendContent
                verticalAlign="bottom"
                nameKey="label"
                className="mt-3 flex-wrap justify-center gap-x-3 gap-y-2 text-[11px] text-[var(--color-text-muted)]"
              />
            }
          />
        </PieChart>
      </ChartContainer>
    );
  }

  const chartConfig = buildValueChartConfig(metricLabel(chart));
  const isHorizontal = chart.orientation === "horizontal";
  const isCurrency = isCurrencyMetric(chart);
  const barGradientId = `bar-gradient-${chart.id}`;
  const barFill = `url(#${barGradientId})`;
  const barActiveFill = DASHBOARD_COLORS.secondary;

  if (isHorizontal) {
    // Long category labels read better on horizontal bars (BI rule
    // long_labels_use_horizontal_bar).
    return (
      <ChartContainer
        config={chartConfig}
        className={`${chartHeightClass} w-full aspect-auto rounded-[20px] bg-white`}
      >
        <BarChart
          data={series}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        >
          <defs>
            <linearGradient id={barGradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.75} />
              <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid
            horizontal={false}
            stroke={CHART_GRID_COLOR}
            strokeDasharray="4 10"
          />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            fontSize={11}
            tickMargin={8}
            tickFormatter={(value: number) =>
              formatAxisValue(value, isCurrency)
            }
            stroke={CHART_AXIS_COLOR}
          />
          <YAxis
            type="category"
            dataKey="label"
            axisLine={false}
            tickLine={false}
            fontSize={11}
            tickMargin={8}
            width={104}
            tickFormatter={(value: string) => truncateLabel(value, 16)}
            stroke={CHART_AXIS_COLOR}
          />
          <ChartTooltip
            cursor={{ fill: "#E6E8EA" }}
            content={
              <ChartTooltipContent
                formatter={isCurrency ? currencyTooltipFormatter : undefined}
              />
            }
          />
          <Bar
            dataKey="value"
            fill={barFill}
            radius={[0, 10, 10, 0]}
            activeBar={{ fill: barActiveFill }}
            isAnimationActive
            animationDuration={CHART_ANIMATION_DURATION}
            animationEasing={CHART_ANIMATION_EASING}
          />
        </BarChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className={`${chartHeightClass} w-full aspect-auto rounded-[20px] bg-white`}
    >
      <BarChart
        data={series}
        margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
      >
        <defs>
          <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={1} />
            <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0.75} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke={CHART_GRID_COLOR}
          strokeDasharray="4 10"
        />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          fontSize={11}
          tickMargin={10}
          minTickGap={18}
          tickFormatter={formatAxisValue}
          stroke={CHART_AXIS_COLOR}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          fontSize={11}
          tickMargin={10}
          width={Y_AXIS_WIDTH}
          tickFormatter={(value: number) => formatAxisValue(value, isCurrency)}
          stroke={CHART_AXIS_COLOR}
        />
        <ChartTooltip
          cursor={{ fill: "#E6E8EA" }}
          content={
            <ChartTooltipContent
              formatter={isCurrency ? currencyTooltipFormatter : undefined}
            />
          }
        />
        <Bar
          dataKey="value"
          fill={barFill}
          radius={[10, 10, 0, 0]}
          activeBar={{ fill: barActiveFill }}
          isAnimationActive
          animationDuration={CHART_ANIMATION_DURATION}
          animationEasing={CHART_ANIMATION_EASING}
        />
      </BarChart>
    </ChartContainer>
  );
});

const DashboardChartCard = memo(function DashboardChartCard({
  chart,
  rows,
}: DashboardChartCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: chart.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as CSSProperties;

  return (
    <TooltipProvider delayDuration={150}>
      <Card
        ref={setNodeRef}
        style={style}
        className={`overflow-hidden rounded-[24px] border-0 bg-white p-0 shadow-[0_22px_52px_-38px_rgba(25,28,30,0.14)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-34px_rgba(25,28,30,0.2)] ${getCardMinHeightClass(
          chart,
        )} ${isDragging ? "opacity-75" : ""}`}
        data-chart-card={chart.id}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 px-8 pb-0 pt-8">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[18px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
              {chart.title}
            </h3>
            <p className="mt-1 line-clamp-1 text-[12px] text-[var(--color-text-secondary)]">
              {chart.insight}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {chart.pinned ? (
              <Badge className="rounded-full border-0 bg-[var(--color-surface-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]">
                pinned
              </Badge>
            ) : null}
            <Badge className="rounded-full border-0 bg-[#e6e8ea] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)] hover:bg-[#e6e8ea]">
              {chart.type}
            </Badge>
            <ShadTooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label={`Resize ${chart.title} (currently ${chart.size})`}
                  className="h-8 w-8 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                  onClick={() => {
                    const nextSize =
                      chart.size === "small"
                        ? "medium"
                        : chart.size === "medium"
                          ? "large"
                          : "small";
                    updateChart(chart.id, { size: nextSize });
                  }}
                >
                  <Scaling className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Resize chart ({chart.size})</TooltipContent>
            </ShadTooltip>
            <ShadTooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={setActivatorNodeRef}
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label={`Drag to reorder ${chart.title}`}
                  className="h-8 w-8 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                  {...attributes}
                  {...listeners}
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Drag to reorder</TooltipContent>
            </ShadTooltip>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8 pt-4">
          <DashboardChartContent chart={chart} rows={rows} />
        </CardContent>
      </Card>
    </TooltipProvider>
  );
});

export { DashboardChartCard };
export type { DashboardChartCardProps };
