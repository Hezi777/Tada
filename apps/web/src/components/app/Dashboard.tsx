import { memo, useMemo, type CSSProperties } from "react";
import {
  Hash,
  Sigma,
  Tag,
  CalendarRange,
  GripVertical,
  EyeOff,
  Eye,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartConfig, KPIConfig, SerializedRow } from "@tada/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  buildAreaSeries,
  buildGroupedSeries,
  buildScatterSeries,
  computeKpiValue,
  formatNumber as legacyFormatNumber,
  hasRenderableChartData,
} from "@/lib/dashboard-runtime";
import { calculateLayout, type LayoutItem } from "@/lib/chart-layout";
import { reorderCharts, updateChart, useDashboardStore } from "@/lib/dashboard-store";

const chartColors = [
  "hsl(var(--primary))",
  "hsl(205 89% 64%)",
  "hsl(224 76% 57%)",
  "hsl(262 83% 66%)",
  "hsl(335 82% 62%)",
  "hsl(36 94% 57%)",
] as const;

function formatMetric(value: string | number): string | number {
  if (typeof value === "string") {
    return value.trim() ? value : "-";
  }

  if (!Number.isFinite(value)) {
    return "-";
  }

  return legacyFormatNumber(value) ?? value;
}

function getKpiIcon(kpi: KPIConfig) {
  if (kpi.isPrimary) {
    return Sigma;
  }
  if (kpi.aggregation === "mode") {
    return Tag;
  }
  if (kpi.aggregation === "range") {
    return CalendarRange;
  }
  return Hash;
}

function DashboardTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; color?: string; payload?: { label?: string } }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0];

  return (
    <div className="glass min-w-[9rem] rounded-2xl border border-white/80 px-3 py-2 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {point.payload?.label ?? label ?? "Value"}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: point.color ?? chartColors[0] }} />
        <span className="text-sm font-semibold text-foreground">{formatMetric(point.value ?? 0)}</span>
      </div>
    </div>
  );
}

function ChartEmptyState() {
  return (
    <div className="flex h-[18rem] flex-col items-center justify-center px-6 text-center">
      <div className="eyebrow mb-3">No Data</div>
      <p className="text-sm text-muted-foreground">
        This chart does not have enough data to render for the current dataset.
      </p>
    </div>
  );
}

const ChartContent = memo(function ChartContent({
  chart,
  rows,
}: {
  chart: ChartConfig;
  rows: SerializedRow[];
}) {
  if (chart.type === "area") {
    const series = buildAreaSeries(chart, rows);
    if (series.length === 0) {
      return <ChartEmptyState />;
    }

    return (
      <div className="h-80 px-2 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.55)" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <Tooltip content={<DashboardTooltip />} cursor={false} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColors[0]}
              strokeWidth={2.5}
              fill={chartColors[0]}
              fillOpacity={0.14}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart.type === "scatter") {
    const series = buildScatterSeries(chart, rows);
    if (series.length === 0) {
      return <ChartEmptyState />;
    }

    return (
      <div className="h-80 px-2 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.55)" />
            <XAxis
              type="number"
              dataKey="x"
              name={chart.columns[0]}
              axisLine={false}
              tickLine={false}
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              type="number"
              dataKey="y"
              name={chart.columns[1]}
              axisLine={false}
              tickLine={false}
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={<DashboardTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "4 4" }} />
            <Scatter data={series} fill={chartColors[1]} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const series = buildGroupedSeries(chart, rows);
  if (series.length === 0) {
    return <ChartEmptyState />;
  }

  if (chart.type === "donut") {
    return (
      <div className="h-80 px-2 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={series} dataKey="value" nameKey="label" innerRadius={62} outerRadius={92} paddingAngle={2}>
              {series.map((_entry, index) => (
                <Cell key={`${chart.id}-slice-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip content={<DashboardTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-80 px-2 pb-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.55)" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            fontSize={12}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
          <Tooltip content={<DashboardTooltip />} cursor={{ fill: "hsl(var(--primary) / 0.05)" }} />
          <Bar dataKey="value" fill={chartColors[0]} radius={[8, 8, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

function KpiCard({ kpi, rows }: { kpi: KPIConfig; rows: SerializedRow[] }) {
  const Icon = getKpiIcon(kpi);
  const value = computeKpiValue(kpi, rows);

  return (
    <Card className={`overflow-hidden p-5 ${kpi.isPrimary ? "gradient-primary text-primary-foreground shadow-glow" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-[1rem] ${kpi.isPrimary ? "bg-white/18" : "bg-primary/[0.08] text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
        {kpi.isPrimary ? (
          <Badge variant="secondary" className="rounded-full bg-white/16 text-primary-foreground hover:bg-white/16">
            Primary KPI
          </Badge>
        ) : null}
      </div>
      <div className="mt-6">
        <div className="text-3xl font-extrabold tracking-tight [font-variant-numeric:tabular-nums]">
          {formatMetric(value)}
        </div>
        <p className={`mt-2 text-sm font-semibold ${kpi.isPrimary ? "text-primary-foreground" : "text-foreground"}`}>
          {kpi.label}
        </p>
        <p className={`mt-1 text-sm leading-6 ${kpi.isPrimary ? "text-primary-foreground/85" : "text-muted-foreground"}`}>
          {kpi.description}
        </p>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-5">
            <div className="animate-shimmer h-12 w-12 rounded-[1rem] bg-secondary" />
            <div className="mt-6 h-8 w-24 animate-shimmer rounded-lg bg-secondary" />
            <div className="mt-3 h-4 w-28 animate-shimmer rounded-lg bg-secondary" />
            <div className="mt-2 h-4 w-full animate-shimmer rounded-lg bg-secondary" />
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="p-5">
          <div className="h-5 w-28 animate-shimmer rounded-lg bg-secondary" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-14 animate-shimmer rounded-2xl bg-secondary" />
            ))}
          </div>
        </Card>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className={`p-5 ${index === 0 ? "lg:col-span-12" : "lg:col-span-6"}`}>
              <div className="h-5 w-40 animate-shimmer rounded-lg bg-secondary" />
              <div className="mt-3 h-4 w-64 animate-shimmer rounded-lg bg-secondary" />
              <div className="mt-6 h-72 animate-shimmer rounded-[1rem] bg-secondary" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

type ChartCardProps = {
  chart: LayoutItem;
  rows: SerializedRow[];
};

function ChartCard({ chart, rows }: ChartCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: chart.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    "--chart-col-span": String(chart.colSpan),
  } as CSSProperties;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`col-span-1 overflow-hidden lg:[grid-column:span_var(--chart-col-span)_/_span_var(--chart-col-span)] ${isDragging ? "opacity-80" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/80 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">{chart.title}</h3>
            <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {chart.type}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{chart.insight}</p>
        </div>
        <Button
          ref={setActivatorNodeRef}
          variant="ghost"
          size="icon"
          type="button"
          aria-label={`Drag ${chart.title}`}
          title="Drag to reorder"
          className="h-9 w-9 rounded-xl text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </div>
      <ChartContent chart={chart} rows={rows} />
    </Card>
  );
}

function ChartStructureCard({ charts }: { charts: ChartConfig[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow mb-2">Chart Structure</div>
          <h2 className="text-lg font-semibold text-foreground">Visible dashboard order</h2>
        </div>
        <Badge variant="secondary" className="rounded-full">
          {charts.filter((chart) => chart.visible).length} visible
        </Badge>
      </div>

      <div className="mt-5 space-y-3">
        {charts.map((chart, index) => (
          <div
            key={chart.id}
            className={`flex items-center justify-between gap-3 rounded-[1.2rem] border px-4 py-3 transition-colors ${
              chart.visible
                ? "border-primary/15 bg-primary/[0.05]"
                : "border-white/80 bg-white/70"
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="truncate text-sm font-semibold text-foreground">{chart.title}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {chart.type} · {chart.size}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-muted-foreground"
              onClick={() => updateChart(chart.id, { visible: !chart.visible })}
              aria-label={chart.visible ? `Hide ${chart.title}` : `Show ${chart.title}`}
              title={chart.visible ? "Hide chart" : "Show chart"}
            >
              {chart.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function Dashboard() {
  const datasetId = useDashboardStore((snapshot) => snapshot.datasetId);
  const version = useDashboardStore((snapshot) => snapshot.version);
  const rows = useDashboardStore((snapshot) => snapshot.rows);
  const charts = useDashboardStore((snapshot) => snapshot.charts);
  const kpiConfigs = useDashboardStore((snapshot) => snapshot.kpis);
  const fileName = useDashboardStore((snapshot) => snapshot.fileName);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const orderedCharts = useMemo(() => [...charts].sort((left, right) => left.order - right.order), [charts]);
  const visibleCharts = useMemo(
    () => orderedCharts.filter((chart) => chart.visible && hasRenderableChartData(chart, rows)),
    [orderedCharts, rows],
  );
  const layoutItems = useMemo(() => calculateLayout(visibleCharts), [visibleCharts]);
  const isLoading = Boolean(datasetId) && (kpiConfigs.length === 0 || charts.length === 0);

  if (!datasetId) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-12">
        <Card className="section-shell w-full px-8 py-12 text-center sm:px-12">
          <div className="eyebrow mb-5">Dashboard Ready</div>
          <h1 className="text-3xl font-semibold text-foreground">Upload a dataset to generate insights</h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-muted-foreground">
            Start with a CSV or spreadsheet. The dashboard will populate from chart config state and stay editable through chat.
          </p>
          <Button className="mt-8" onClick={() => { window.location.href = "/"; }}>
            Choose a file
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow mb-3">Analytics Workspace</div>
          <h1 className="text-3xl font-semibold text-foreground">{fileName ?? "Dataset dashboard"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Charts render directly from centralized config state and adapt to the current dashboard order.
          </p>
        </div>
        <Badge variant="outline" className="w-fit rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Dashboard v{version}
        </Badge>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {kpiConfigs.map((kpi) => (
              <KpiCard key={kpi.id} kpi={kpi} rows={rows} />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="min-w-0">
              <ChartStructureCard charts={orderedCharts} />
            </div>

            <div className="min-w-0">
              {layoutItems.length === 0 ? (
                <Card className="section-shell px-8 py-12 text-center">
                  <div className="eyebrow mb-4">No Visible Charts</div>
                  <h2 className="text-xl font-semibold text-foreground">Nothing is currently rendering</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Re-enable a hidden chart or adjust the underlying configuration.
                  </p>
                </Card>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={({ active, over }) => {
                    if (!over || active.id === over.id) {
                      return;
                    }

                    const visibleIds = layoutItems.map((chart) => chart.id);
                    const activeIndex = visibleIds.indexOf(String(active.id));
                    const overIndex = visibleIds.indexOf(String(over.id));
                    if (activeIndex === -1 || overIndex === -1) {
                      return;
                    }

                    const nextVisible = arrayMove(visibleIds, activeIndex, overIndex);
                    const nextIds = orderedCharts.map((chart) => chart.id);
                    let visibleIndex = 0;
                    const reorderedIds = nextIds.map((id) =>
                      visibleIds.includes(id) ? nextVisible[visibleIndex++] : id,
                    );
                    reorderCharts(reorderedIds);
                  }}
                >
                  <SortableContext items={layoutItems.map((chart) => chart.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                      {layoutItems.map((chart) => (
                        <ChartCard key={chart.id} chart={chart} rows={rows} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
