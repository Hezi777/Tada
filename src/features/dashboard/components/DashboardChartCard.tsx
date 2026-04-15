import { memo, useState, type CSSProperties } from "react";
import { MoreHorizontal } from "lucide-react";
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
import type { LayoutItem } from "@/features/dashboard/client/layout";
import { DASHBOARD_COLORS } from "@/features/dashboard/client/design";

const CHART_COLOR = DASHBOARD_COLORS.primary;
const CHART_GRID_COLOR = DASHBOARD_COLORS.chartGrid;
const CHART_AXIS_COLOR = DASHBOARD_COLORS.chartAxis;

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

function formatMetric(value: string | number): string | number {
  if (typeof value === "string") {
    return value.trim() ? value : "-";
  }

  if (!Number.isFinite(value)) {
    return "-";
  }

  return legacyFormatNumber(value) ?? value;
}

function formatAxisValue(value: string | number): string {
  if (typeof value === "number") {
    return legacyFormatNumber(value) ?? String(value);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00Z`);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    const date = new Date(`${value}-01T00:00:00Z`);
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }

  return value.length > 12 ? `${value.slice(0, 10)}…` : value;
}

function buildValueChartConfig(): ChartPrimitiveConfig {
  return {
    value: {
      label: "Value",
      color: CHART_COLOR,
    },
  };
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

function buildDonutChartConfig(series: Array<{ label: string; value: number }>): ChartPrimitiveConfig {
  const config: ChartPrimitiveConfig = {};

  series.forEach((entry, index) => {
    config[entry.label] = {
      label: entry.label,
      color: donutPalette[index % donutPalette.length],
    };
  });

  return config;
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
}: {
  active?: boolean;
  payload?: ChartTooltipPoint[];
  xLabel: string;
  yLabel: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0];
  const xValue = point.payload?.x;
  const yValue = point.payload?.y;

  return (
    <div className="grid min-w-[10rem] gap-1.5 rounded-[16px] bg-white px-3 py-2 text-xs shadow-[0_18px_40px_-28px_rgba(25,28,30,0.25)]">
      <div className="font-medium text-[var(--color-text-primary)]">Scatter point</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[var(--color-text-secondary)]">{xLabel}</span>
        <span className="font-display font-semibold tabular-nums text-[var(--color-text-primary)]">
          {formatMetric(xValue ?? 0)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[var(--color-text-secondary)]">{yLabel}</span>
        <span className="font-display font-semibold tabular-nums text-[var(--color-text-primary)]">
          {formatMetric(yValue ?? 0)}
        </span>
      </div>
    </div>
  );
}

const DashboardChartContent = memo(function DashboardChartContent({
  chart,
  rows,
}: {
  chart: LayoutItem;
  rows: SerializedRow[];
}) {
  const [activeSlice, setActiveSlice] = useState<number | undefined>(undefined);
  const chartHeightClass =
    chart.colSpan >= 8 ? "h-[300px]" : chart.type === "donut" ? "h-[210px]" : "h-[190px]";

  if (chart.type === "area") {
    const series = buildAreaSeries(chart, rows);
    if (series.length === 0) {
      return <ChartEmptyState />;
    }

    const chartConfig = buildValueChartConfig();

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
            <linearGradient
              id={`area-${chart.id}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
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
            width={44}
            tickFormatter={(value: number) => formatAxisValue(value)}
            stroke={CHART_AXIS_COLOR}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
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
            width={44}
            tickFormatter={(value: number) => formatAxisValue(value)}
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
            width={44}
            tickFormatter={(value: number) => formatAxisValue(value)}
            stroke={CHART_AXIS_COLOR}
          />
          <ChartTooltip
            cursor={{ stroke: "#C6D5EE", strokeDasharray: "4 8" }}
            content={<ScatterTooltip xLabel={xLabel} yLabel={yLabel} />}
          />
          <Scatter data={series} fill={CHART_COLOR} fillOpacity={0.84} />
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
            onMouseEnter={(_, index) => setActiveSlice(index)}
            onMouseLeave={() => setActiveSlice(undefined)}
            activeShape={(props) => (
              <Sector
                {...props}
                outerRadius={Number(props.outerRadius) + 4}
              />
            )}
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
              content={() => (
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  <tspan
                    x="50%"
                    className="fill-[var(--color-text-primary)] text-[20px] font-bold"
                  >
                    {formatMetric(total)}
                  </tspan>
                </text>
              )}
            />
          </Pie>
          <ChartTooltip
            content={<ChartTooltipContent labelKey="label" />}
          />
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

  const chartConfig = buildValueChartConfig();
  const maxValue = Math.max(...series.map((entry) => entry.value));

  return (
      <ChartContainer
      config={chartConfig}
      className={`${chartHeightClass} w-full aspect-auto rounded-[20px] bg-white`}
    >
      <BarChart
        data={series}
        margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
      >
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
          width={44}
          tickFormatter={(value: number) => formatAxisValue(value)}
          stroke={CHART_AXIS_COLOR}
        />
        <ChartTooltip
          cursor={{ fill: "#E6E8EA" }}
          content={<ChartTooltipContent />}
        />
        <Bar dataKey="value" radius={[10, 10, 0, 0]}>
          {series.map((entry, index) => (
            <Cell
              key={`${chart.id}-bar-${entry.label}`}
              fill={CHART_COLOR}
              fillOpacity={entry.value === maxValue ? 1 : 0.28}
            />
          ))}
        </Bar>
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
        className={`overflow-hidden rounded-[24px] border-0 bg-white p-0 shadow-[0_22px_52px_-38px_rgba(25,28,30,0.14)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-34px_rgba(25,28,30,0.2)] ${
          chart.colSpan >= 8 ? "min-h-[390px]" : "min-h-[300px]"
        } ${isDragging ? "opacity-75" : ""}`}
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
                  ref={setActivatorNodeRef}
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label={`Reorder ${chart.title}`}
                  className="h-8 w-8 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                  {...attributes}
                  {...listeners}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reorder chart</TooltipContent>
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
