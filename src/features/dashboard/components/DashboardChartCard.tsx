import {
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  detectCurrencySymbol,
  formatCurrency,
  looksLikeCurrencyColumn,
  ltrIsolate,
  truncateLabel,
} from "@/shared/lib/format";
import type { LayoutItem } from "@/features/dashboard/client/layout";
import { DASHBOARD_COLORS } from "@/features/dashboard/client/design";
import { updateChart } from "@/features/dashboard/client/store";
import { onChartReveal } from "@/features/dashboard/client/chart-effects";

const CHART_COLOR = DASHBOARD_COLORS.primary;
const CHART_GRID_COLOR = DASHBOARD_COLORS.chartGrid;
const CHART_AXIS_COLOR = DASHBOARD_COLORS.chartAxis;

/** Shared cartesian axis treatment so margins/width line up across charts. */
const Y_AXIS_WIDTH = 60;
const CHART_ANIMATION_DURATION = 400;
const CHART_ANIMATION_EASING = "ease-out";

/** Royal-Blue brand gradient (top brighter, bottom deeper). */
const GRADIENT_PRIMARY_STOPS: [string, string] = ["#2f6df6", "#00327d"];

/** Teal -> green "positive highlight" gradient for the standout bar / area. */
const GRADIENT_HIGHLIGHT_STOPS: [string, string] = ["#14b8a6", "#22c55e"];

/** Multi-series order for donuts and grouped bars, each rendered as a soft
 * vertical gradient (brighter top -> deeper bottom of the same hue). */
const MULTI_SERIES_STOPS: Array<[string, string]> = [
  ["#2f6df6", "#00327d"],
  ["#5eead4", "#14b8a6"],
  ["#86efac", "#22c55e"],
  ["#a5b4fc", "#6366f1"],
  ["#7dd3fc", "#38bdf8"],
];

const donutPalette = MULTI_SERIES_STOPS.map(([, base]) => base);

/** Nexus signature: the tallest/standout series gets a rich gradient + glow,
 * the rest render as light "ghost" siblings. Uses the theme-aware accent
 * tint so it stays subtle in both light and dark mode. */
const BAR_TINT_COLOR = "var(--color-accent-light)";

/** Builds a stable, chart-scoped gradient/filter id so multiple charts on
 * the same page never collide (SVG ids are global to the document). */
function gradientId(chartId: string, name: string): string {
  return `chart-${chartId}-${name}`;
}

/** Soft drop-shadow glow filter, reusable behind highlighted bars, the area
 * stroke, and scatter dots. Kept subtle so it reads on light + dark cards. */
function GlowFilter({ id, color }: { id: string; color: string }) {
  return (
    <filter id={id} x="-60%" y="-60%" width="220%" height="220%">
      <feDropShadow
        dx="0"
        dy="0"
        stdDeviation="4"
        floodColor={color}
        floodOpacity="0.45"
      />
    </filter>
  );
}

/** Vertical linear gradient, brighter stop on top. */
function VerticalGradient({
  id,
  stops,
}: {
  id: string;
  stops: [string, string];
}) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={stops[0]} />
      <stop offset="100%" stopColor={stops[1]} />
    </linearGradient>
  );
}

type DashboardChartCardProps = {
  chart: LayoutItem;
  rows: SerializedRow[];
  isEditing?: boolean;
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
  currency: string | null = null,
): string | number {
  if (typeof value === "string") {
    return value.trim() ? value : "-";
  }

  if (!Number.isFinite(value)) {
    return "-";
  }

  if (currency) {
    return formatCurrency(value, currency, Math.abs(value) >= 100_000);
  }

  return legacyFormatNumber(value) ?? value;
}

function formatAxisValue(
  value: string | number,
  currency: string | null = null,
): string {
  if (typeof value === "number") {
    return currency ? formatCurrency(value, currency, true) : abbreviateNumber(value);
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

  return truncateLabel(value, 18);
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

/** The currency symbol for the chart's aggregated measure, or null when the
 * measure isn't money. Symbol comes from the column name; defaults to $. */
function chartCurrency(chart: LayoutItem): string | null {
  const measure =
    chart.columns.find(
      (column) => column !== chart.groupBy && column !== chart.timeColumn,
    ) ?? null;
  if (!measure || chart.aggregation === "count") {
    return null;
  }
  if (!looksLikeCurrencyColumn(measure)) {
    return null;
  }
  return detectCurrencySymbol(measure) ?? "$";
}

/** Currency symbol for an axis column by name, or null when it isn't money. */
function columnCurrency(name: string): string | null {
  if (!looksLikeCurrencyColumn(name)) {
    return null;
  }
  return detectCurrencySymbol(name) ?? "$";
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
function makeCurrencyTooltipFormatter(currency: string) {
  return function currencyTooltipFormatter(
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
          {formatMetric(Number(value), currency)}
        </span>
      </div>
    );
  };
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
    <div className="grid min-w-[10rem] gap-1.5 rounded-[1.25rem] border border-[var(--color-border)] bg-card/95 px-3 py-2 text-xs shadow-[0_24px_48px_-30px_rgba(0,50,125,0.3)] backdrop-blur">
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

const CHART_SIZES = ["small", "medium", "large"] as const;

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

  if (chart.type === "area") {
    const series = buildAreaSeries(chart, rows);
    if (series.length === 0) {
      return <ChartEmptyState />;
    }

    const chartConfig = buildValueChartConfig(metricLabel(chart));
    const currency = chartCurrency(chart);
    const fillGradientId = gradientId(chart.id, "area-fill");
    const strokeGradientId = gradientId(chart.id, "area-stroke");
    const glowId = gradientId(chart.id, "area-glow");

    return (
      <ChartContainer
        config={chartConfig}
        className="h-full min-h-[160px] w-full rounded-[20px] bg-card"
      >
        <AreaChart
          data={series}
          margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
        >
          <defs>
            <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={GRADIENT_HIGHLIGHT_STOPS[1]}
                stopOpacity={0.22}
              />
              <stop
                offset="100%"
                stopColor={GRADIENT_PRIMARY_STOPS[0]}
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id={strokeGradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={GRADIENT_PRIMARY_STOPS[0]} />
              <stop offset="100%" stopColor={GRADIENT_HIGHLIGHT_STOPS[1]} />
            </linearGradient>
            <GlowFilter id={glowId} color={GRADIENT_HIGHLIGHT_STOPS[1]} />
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
              formatAxisValue(value, currency)
            }
            stroke={CHART_AXIS_COLOR}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={currency ? makeCurrencyTooltipFormatter(currency) : undefined}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={`url(#${strokeGradientId})`}
            strokeWidth={3}
            filter={`url(#${glowId})`}
            fill={`url(#${fillGradientId})`}
            dot={false}
            activeDot={{
              r: 5,
              fill: GRADIENT_HIGHLIGHT_STOPS[1],
              stroke: "var(--color-surface)",
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
    const xCurrency = columnCurrency(xLabel);
    const yCurrency = columnCurrency(yLabel);
    const dotGradientId = gradientId(chart.id, "scatter-dot");
    const glowId = gradientId(chart.id, "scatter-glow");

    return (
      <ChartContainer
        config={chartConfig}
        className="h-full min-h-[160px] w-full rounded-[20px] bg-card"
      >
        <ScatterChart margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
          <defs>
            <radialGradient id={dotGradientId} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor={GRADIENT_PRIMARY_STOPS[0]} />
              <stop offset="100%" stopColor={GRADIENT_PRIMARY_STOPS[1]} />
            </radialGradient>
            <GlowFilter id={glowId} color={GRADIENT_PRIMARY_STOPS[0]} />
          </defs>
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
              formatAxisValue(value, xCurrency)
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
              formatAxisValue(value, yCurrency)
            }
            stroke={CHART_AXIS_COLOR}
          />
          <ChartTooltip
            cursor={{ stroke: "#C6D5EE", strokeDasharray: "4 8" }}
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
            stroke="var(--color-surface)"
            strokeWidth={1}
            filter={`url(#${glowId})`}
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
    const donutCurrency = chartCurrency(chart);

    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
        <ChartContainer
          config={chartConfig}
          className="min-h-[140px] w-full flex-1 rounded-[20px] bg-card"
        >
          <PieChart>
            <defs>
              {MULTI_SERIES_STOPS.map((stops, index) => (
                <VerticalGradient
                  key={`${chart.id}-donut-gradient-${index}`}
                  id={gradientId(chart.id, `donut-${index}`)}
                  stops={stops}
                />
              ))}
            </defs>
            {/* Faint full "track" ring behind the segments, so the donut
                always reads as a complete circle (Panze-style). */}
            <Pie
              data={[{ value: 1 }]}
              dataKey="value"
              nameKey="label"
              cornerRadius={6}
              innerRadius="58%"
              outerRadius="85%"
              startAngle={90}
              endAngle={450}
              isAnimationActive={false}
              legendType="none"
              tooltipType="none"
            >
              <Cell
                fill="var(--color-surface-muted)"
                stroke="none"
                className="pointer-events-none"
              />
            </Pie>
            <Pie
              data={series}
              dataKey="value"
              nameKey="label"
              paddingAngle={3}
              cornerRadius={6}
              innerRadius="58%"
              outerRadius="85%"
              activeIndex={activeSlice}
              onMouseEnter={(_: unknown, index: number) =>
                setActiveSlice(index)
              }
              onMouseLeave={() => setActiveSlice(undefined)}
              activeShape={(props: { outerRadius?: number | string }) => (
                <Sector
                  {...props}
                  outerRadius={Number(props.outerRadius) + 4}
                />
              )}
              isAnimationActive
              animationDuration={CHART_ANIMATION_DURATION}
              animationEasing={CHART_ANIMATION_EASING}
            >
              {series.map((_entry, index) => (
                <Cell
                  key={`${chart.id}-slice-${index}`}
                  fill={`url(#${gradientId(chart.id, `donut-${index % MULTI_SERIES_STOPS.length}`)})`}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                />
              ))}
              <Label
                position="center"
                content={() => {
                  const totalText = formatAxisValue(total, donutCurrency);
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
                        className="display-number fill-[var(--color-text-primary)]"
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
          </PieChart>
        </ChartContainer>
        <div className="flex flex-wrap justify-center gap-2">
          {series.map((entry, index) => (
            <div
              key={`${chart.id}-legend-${entry.label}`}
              className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px]"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: `linear-gradient(180deg, ${
                    MULTI_SERIES_STOPS[index % MULTI_SERIES_STOPS.length][0]
                  }, ${
                    MULTI_SERIES_STOPS[index % MULTI_SERIES_STOPS.length][1]
                  })`,
                }}
              />
              <span className="text-[var(--color-text-secondary)]">
                {truncateLabel(entry.label, 22)}
              </span>
              <span className="font-medium tabular-nums text-[var(--color-text-primary)]">
                {formatMetric(entry.value, donutCurrency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const chartConfig = buildValueChartConfig(metricLabel(chart));
  const isHorizontal = chart.orientation === "horizontal";
  const currency = chartCurrency(chart);
  const barActiveFill = DASHBOARD_COLORS.secondary;
  const maxValue = Math.max(...series.map((entry) => entry.value));
  const highlightGradientId = gradientId(chart.id, "bar-highlight");
  const highlightGlowId = gradientId(chart.id, "bar-glow");

  if (isHorizontal) {
    // Long category labels read better on horizontal bars (BI rule
    // long_labels_use_horizontal_bar).
    return (
      <ChartContainer
        config={chartConfig}
        className="h-full min-h-[160px] w-full rounded-[20px] bg-card"
      >
        <BarChart
          data={series}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        >
          <defs>
            <linearGradient
              id={highlightGradientId}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor={GRADIENT_HIGHLIGHT_STOPS[1]} />
              <stop offset="100%" stopColor={GRADIENT_HIGHLIGHT_STOPS[0]} />
            </linearGradient>
            <GlowFilter
              id={highlightGlowId}
              color={GRADIENT_HIGHLIGHT_STOPS[0]}
            />
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
              formatAxisValue(value, currency)
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
            width={128}
            tickFormatter={(value: string) => truncateLabel(value, 22)}
            stroke={CHART_AXIS_COLOR}
          />
          <ChartTooltip
            cursor={{ fill: "var(--color-accent-light)" }}
            content={
              <ChartTooltipContent
                formatter={currency ? makeCurrencyTooltipFormatter(currency) : undefined}
              />
            }
          />
          <Bar
            dataKey="value"
            radius={[0, 10, 10, 0]}
            activeBar={{ fill: barActiveFill }}
            isAnimationActive
            animationDuration={CHART_ANIMATION_DURATION}
            animationEasing={CHART_ANIMATION_EASING}
          >
            {series.map((entry, index) => {
              const isMax = entry.value === maxValue;
              return (
                <Cell
                  key={`${chart.id}-bar-${index}`}
                  fill={isMax ? `url(#${highlightGradientId})` : BAR_TINT_COLOR}
                  filter={isMax ? `url(#${highlightGlowId})` : undefined}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="h-full min-h-[160px] w-full rounded-[20px] bg-card"
    >
      <BarChart
        data={series}
        margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
      >
        <defs>
          <linearGradient id={highlightGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GRADIENT_HIGHLIGHT_STOPS[0]} />
            <stop offset="100%" stopColor={GRADIENT_HIGHLIGHT_STOPS[1]} />
          </linearGradient>
          <GlowFilter
            id={highlightGlowId}
            color={GRADIENT_HIGHLIGHT_STOPS[0]}
          />
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
          tickFormatter={(value: number) => formatAxisValue(value, currency)}
          stroke={CHART_AXIS_COLOR}
        />
        <ChartTooltip
          cursor={{ fill: "var(--color-accent-light)" }}
          content={
            <ChartTooltipContent
              formatter={currency ? makeCurrencyTooltipFormatter(currency) : undefined}
            />
          }
        />
        <Bar
          dataKey="value"
          radius={[10, 10, 0, 0]}
          activeBar={{ fill: barActiveFill }}
          isAnimationActive
          animationDuration={CHART_ANIMATION_DURATION}
          animationEasing={CHART_ANIMATION_EASING}
        >
          {series.map((entry, index) => {
            const isMax = entry.value === maxValue;
            return (
              <Cell
                key={`${chart.id}-bar-${index}`}
                fill={isMax ? `url(#${highlightGradientId})` : BAR_TINT_COLOR}
                filter={isMax ? `url(#${highlightGlowId})` : undefined}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
});

const DashboardChartCard = memo(function DashboardChartCard({
  chart,
  rows,
  isEditing = false,
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

  // Drag an edge handle to resize (Apple-widget style): the right edge changes
  // width, the bottom edge changes height. ~90px of travel = one size step,
  // and the grid re-packs around the new size.
  const resizeStartRef = useRef<{
    pos: number;
    index: number;
    axis: "x" | "y";
  } | null>(null);

  const beginResize =
    (axis: "x" | "y") => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      resizeStartRef.current = {
        pos: axis === "x" ? event.clientX : event.clientY,
        index: CHART_SIZES.indexOf(chart.size),
        axis,
      };
    };

  const handleResizeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = resizeStartRef.current;
    if (!start) {
      return;
    }
    const delta =
      (start.axis === "x" ? event.clientX : event.clientY) - start.pos;
    const steps = Math.round(delta / 90);
    const nextIndex = Math.min(
      CHART_SIZES.length - 1,
      Math.max(0, start.index + steps),
    );
    const nextSize = CHART_SIZES[nextIndex];
    if (nextSize !== chart.size) {
      updateChart(chart.id, { size: nextSize });
    }
  };

  const handleResizeUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    resizeStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const resizeKeyDown =
    (axis: "x" | "y") => (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const current = CHART_SIZES.indexOf(chart.size);
      const grow = axis === "x" ? "ArrowRight" : "ArrowDown";
      const shrink = axis === "x" ? "ArrowLeft" : "ArrowUp";
      if (event.key === grow) {
        event.preventDefault();
        const next = CHART_SIZES[Math.min(CHART_SIZES.length - 1, current + 1)];
        if (next !== chart.size) updateChart(chart.id, { size: next });
      } else if (event.key === shrink) {
        event.preventDefault();
        const next = CHART_SIZES[Math.max(0, current - 1)];
        if (next !== chart.size) updateChart(chart.id, { size: next });
      }
    };

  // One-time "magic" reveal glow when this chart is freshly created by the AI.
  const [isRevealing, setIsRevealing] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const unsubscribe = onChartReveal((id) => {
      if (id !== chart.id) {
        return;
      }
      setIsRevealing(true);
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
      }
      revealTimerRef.current = setTimeout(() => setIsRevealing(false), 2200);
    });
    return () => {
      unsubscribe();
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
      }
    };
  }, [chart.id]);

  return (
    <TooltipProvider delayDuration={150}>
      <Card
        ref={setNodeRef}
        style={style}
        className={`relative flex h-full flex-col overflow-hidden rounded-[20px] border bg-card p-0 shadow-premium ${getCardMinHeightClass(
          chart,
        )} ${
          isEditing
            ? "border-dashed border-[var(--color-accent)]/40"
            : "border-[var(--color-border)]"
        } ${isDragging ? "opacity-75" : ""}`}
        data-chart-card={chart.id}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 px-6 pb-0 pt-6">
          <div className="min-w-0">
            <h3 className="line-clamp-2 font-display text-[17px] font-extrabold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)]">
              {chart.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[var(--color-text-secondary)]">
              {chart.insight}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {chart.pinned ? (
              <Badge className="rounded-full border-0 bg-[var(--color-surface-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]">
                pinned
              </Badge>
            ) : null}
            <Badge className="rounded-full border border-[var(--color-border)] bg-transparent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)] hover:bg-transparent">
              {chart.type}
            </Badge>
            {isEditing ? (
              <>
                <ShadTooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      aria-label={`Resize ${chart.title} (currently ${chart.size})`}
                      className="h-7 w-7 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
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
                      className="h-7 w-7 cursor-grab rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] active:cursor-grabbing"
                      {...attributes}
                      {...listeners}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Drag to reorder</TooltipContent>
                </ShadTooltip>
              </>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-4">
          <DashboardChartContent chart={chart} rows={rows} />
        </CardContent>
        {isRevealing ? (
          <div
            aria-hidden="true"
            className="ai-glow-ring ai-glow-ring-mask pointer-events-none absolute inset-0 z-20 rounded-[20px]"
            style={{
              animation:
                "tada-glow-spin 4s linear infinite, tada-reveal-fade 2.2s ease-out forwards",
            }}
          />
        ) : null}
        {isEditing ? (
          <>
            {/* Right edge — drag to change width */}
            <div
              role="slider"
              tabIndex={0}
              aria-label={`Resize ${chart.title} width`}
              aria-valuetext={chart.size}
              aria-valuemin={0}
              aria-valuemax={CHART_SIZES.length - 1}
              aria-valuenow={CHART_SIZES.indexOf(chart.size)}
              onPointerDown={beginResize("x")}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeUp}
              onKeyDown={resizeKeyDown("x")}
              className="group absolute right-0 top-1/2 z-10 flex h-16 w-3 -translate-y-1/2 touch-none items-center justify-center focus-visible:outline-none"
              style={{ cursor: "ew-resize" }}
            >
              <span className="h-12 w-1.5 rounded-full bg-[var(--color-border)] transition group-hover:h-14 group-hover:bg-[var(--color-accent)] group-focus-visible:bg-[var(--color-accent)]" />
            </div>
            {/* Bottom edge — drag to change height */}
            <div
              role="slider"
              tabIndex={0}
              aria-label={`Resize ${chart.title} height`}
              aria-valuetext={chart.size}
              aria-valuemin={0}
              aria-valuemax={CHART_SIZES.length - 1}
              aria-valuenow={CHART_SIZES.indexOf(chart.size)}
              onPointerDown={beginResize("y")}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeUp}
              onKeyDown={resizeKeyDown("y")}
              className="group absolute bottom-0 left-1/2 z-10 flex h-3 w-16 -translate-x-1/2 touch-none items-center justify-center focus-visible:outline-none"
              style={{ cursor: "ns-resize" }}
            >
              <span className="h-1.5 w-12 rounded-full bg-[var(--color-border)] transition group-hover:w-14 group-hover:bg-[var(--color-accent)] group-focus-visible:bg-[var(--color-accent)]" />
            </div>
          </>
        ) : null}
      </Card>
    </TooltipProvider>
  );
});

export { DashboardChartCard };
export type { DashboardChartCardProps };
