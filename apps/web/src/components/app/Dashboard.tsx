import { memo, useEffect, useMemo, useState } from "react";
import { Hash, Sigma, Tag, CalendarRange, GripVertical, EyeOff, Eye } from "lucide-react";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  formatDateRange,
  formatNumber,
  getPrimaryMetricLabel,
  type DatasetState,
} from "@/lib/dataset";
import type { DashboardState, DashboardChart } from "@/lib/api";

interface DashboardProps {
  dataset: DatasetState | null;
  dashboardState: DashboardState | null;
}

const chartTooltipStyle = {
  backgroundColor: "hsla(0, 0%, 100%, 0.96)",
  border: "1px solid hsl(213, 45%, 88%)",
  borderRadius: "18px",
  fontSize: "12px",
  boxShadow: "0 24px 60px -34px rgba(24, 72, 138, 0.28)",
};

const primaryColor = "hsl(211, 90%, 54%)";
const accentColor = "hsl(200, 87%, 62%)";
const secondaryColor = "hsl(223, 71%, 63%)";
const tertiaryColor = "hsl(193, 76%, 48%)";
const chartColors = [primaryColor, accentColor, secondaryColor, tertiaryColor];

function hasChartData(chart: DashboardChart): boolean {
  if (chart.type === "table") {
    const rows = (chart.payload as { rows?: unknown[] }).rows ?? [];
    return rows.length > 0;
  }
  const values = (chart.payload as { values?: unknown[] }).values ?? [];
  return Array.isArray(values) && values.length > 0;
}

function buildChartSeries(chart: DashboardChart): {
  data: Array<{ label: string; value: number }>;
  xKey: "label";
  yKey: "value";
} | null {
  if (chart.type === "table") {
    return null;
  }
  const payload = chart.payload as { labels?: unknown[]; values?: unknown[] };
  if (!Array.isArray(payload.labels) || !Array.isArray(payload.values)) {
    return null;
  }
  const size = Math.min(payload.labels.length, payload.values.length);
  const data = Array.from({ length: size }, (_value, index) => {
    const rawValue = payload.values[index];
    const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue);
    return {
      label: String(payload.labels[index]),
      value: Number.isFinite(numericValue) ? numericValue : 0,
    };
  });
  return { data, xKey: "label", yKey: "value" };
}

function formatKpiValue(value: string | number): string | number {
  if (typeof value === "number") {
    return formatNumber(value) ?? value;
  }
  return value;
}

type ChartCardProps = {
  chart: DashboardChart;
  isHighlighted: boolean;
};

const ChartContent = memo(function ChartContent({ chart }: { chart: DashboardChart }) {
  return (
    <>
      {chart.type === "table" ? (
        <div className="h-64 overflow-auto rounded-[1.2rem] border border-white/80 bg-white/80">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-secondary/75 backdrop-blur-xl">
              <tr>
                {(chart.payload as { columns: string[] }).columns.map((column) => (
                  <th key={column} className="px-3 py-2 text-left font-medium text-foreground">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(chart.payload as { rows: Array<Record<string, unknown>> }).rows.map((row, index) => (
                <tr key={`${chart.id}-${index}`} className="border-t border-border/70">
                  {(chart.payload as { columns: string[] }).columns.map((column) => (
                    <td key={column} className="px-3 py-2 text-muted-foreground">
                      {row[column] === null || row[column] === undefined ? "-" : String(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-64">
          {(() => {
            const series = buildChartSeries(chart);
            if (!series) {
              return (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Not enough data to visualize.
                </div>
              );
            }
            return (
              <ResponsiveContainer width="100%" height="100%">
                {chart.type === "line" ? (
                  <LineChart data={series.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(213, 45%, 88%)" />
                    <XAxis dataKey={series.xKey} stroke="hsl(216, 15%, 46%)" fontSize={12} />
                    <YAxis stroke="hsl(216, 15%, 46%)" fontSize={12} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey={series.yKey}
                      stroke={primaryColor}
                      strokeWidth={2}
                      dot={{ fill: primaryColor, strokeWidth: 2 }}
                    />
                  </LineChart>
                ) : chart.type === "bar" ? (
                  <BarChart data={series.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(213, 45%, 88%)" />
                    <XAxis dataKey={series.xKey} stroke="hsl(216, 15%, 46%)" fontSize={12} />
                    <YAxis stroke="hsl(216, 15%, 46%)" fontSize={12} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey={series.yKey} fill={primaryColor} radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie data={series.data} dataKey={series.yKey} nameKey={series.xKey} outerRadius={90}>
                      {series.data.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            );
          })()}
        </div>
      )}
    </>
  );
});

function ChartCard({ chart, isHighlighted }: ChartCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chart.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`surface-panel rounded-[1.75rem] border border-white/80 p-5 shadow-card transition-all ${
        isHighlighted ? "ring-2 ring-primary/20 shadow-soft" : ""
      } ${isDragging ? "opacity-80" : ""}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Drag ${chart.title}`}
            title="Drag to reorder"
            className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-secondary/80 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div>
            <h3 className="font-display text-2xl font-semibold text-foreground">{chart.title}</h3>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {chart.type.toUpperCase()} chart
            </p>
          </div>
        </div>
      </div>
      <ChartContent chart={chart} />
    </div>
  );
}

type KpiCard = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof Hash;
};

type SidebarChartItemProps = {
  chart: DashboardChart;
  isHidden: boolean;
  onToggleHidden: (chartId: string) => void;
  onHover: (chartId: string | null) => void;
};

function SidebarChartItem({ chart, isHidden, onToggleHidden, onHover }: SidebarChartItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chart.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-[1.1rem] border border-white/80 px-3 py-3 text-left text-sm shadow-card ${
        isHidden ? "bg-secondary/40 text-muted-foreground" : "bg-white/80 text-foreground hover:bg-secondary/75"
      } ${isDragging ? "bg-secondary/60 ring-2 ring-primary/20 opacity-70" : ""}`}
      onMouseEnter={() => onHover(chart.id)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Drag ${chart.title}`}
        title="Drag to reorder"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/60 hover:bg-secondary/60 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onToggleHidden(chart.id)}
        title={isHidden ? "Show chart" : "Hide chart"}
        className="flex flex-1 items-center gap-2 text-left"
        aria-pressed={!isHidden}
      >
        {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        <span className="truncate" title={chart.title}>{chart.title}</span>
      </button>
    </div>
  );
}

export function Dashboard({ dataset, dashboardState }: DashboardProps) {
  const [chartOrder, setChartOrder] = useState<string[]>([]);
  const [hiddenChartIds, setHiddenChartIds] = useState<string[]>([]);
  const [hoveredChartId, setHoveredChartId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const numericColumn = dataset?.profile.columns.find((column) => column.role === "numeric");
  const categoricalColumn = dataset?.profile.columns.find(
    (column) =>
      column.role === "categorical" &&
      !column.isIdLike &&
      !column.isTextLong &&
      column.cardinality <= 30
  );
  const dateColumn = dataset?.profile.columns.find((column) => column.role === "datetime");

  const primaryMetricLabel = numericColumn ? getPrimaryMetricLabel(numericColumn.name) : null;
  const numericStats = numericColumn ? dataset.stats.numeric[numericColumn.name] : null;
  const primaryMetricValue =
    numericColumn && numericStats
      ? primaryMetricLabel === "sum"
        ? formatNumber(numericStats.sum)
        : formatNumber(numericStats.mean)
      : null;

  const topCategory =
    categoricalColumn && dataset.stats.categorical[categoricalColumn.name]
      ? dataset.stats.categorical[categoricalColumn.name].topValue
      : null;

  const dateRange =
    dateColumn && dataset.stats.dateRanges[dateColumn.name]
      ? formatDateRange(dataset.stats.dateRanges[dateColumn.name])
      : null;

  useEffect(() => {
    if (!dashboardState) {
      setChartOrder([]);
      setHiddenChartIds([]);
      return;
    }
    setChartOrder(dashboardState.charts.map((chart) => chart.id));
    setHiddenChartIds(dashboardState.hiddenChartIds ?? []);
  }, [dashboardState]);

  useEffect(() => {
    if (!dashboardState) {
      return;
    }
    const nextIds = dashboardState.charts.map((chart) => chart.id);
    setChartOrder((prev) => {
      if (prev.length === 0) {
        return nextIds;
      }
      const kept = prev.filter((id) => nextIds.includes(id));
      const additions = nextIds.filter((id) => !kept.includes(id));
      return [...kept, ...additions];
    });
    setHiddenChartIds((prev) => prev.filter((id) => nextIds.includes(id)));
  }, [dashboardState]);

  const chartMap = useMemo(() => {
    return new Map((dashboardState?.charts ?? []).map((chart) => [chart.id, chart]));
  }, [dashboardState?.charts]);

  const orderedCharts = chartOrder.length
    ? (chartOrder.map((id) => chartMap.get(id)).filter(Boolean) as DashboardChart[])
    : dashboardState?.charts ?? [];

  const visibleCharts = (orderedCharts as DashboardChart[]).filter(
    (chart) => !hiddenChartIds.includes(chart.id)
  );
  const chartsWithData = visibleCharts.filter((chart) => hasChartData(chart));
  const chartIdsWithData = new Set(chartsWithData.map((chart) => chart.id));
  const visibleChartsInOrder = orderedCharts.filter(
    (chart) => chartIdsWithData.has(chart.id) && !hiddenChartIds.includes(chart.id)
  );

  const kpisById = new Map((dashboardState?.kpis ?? []).map((kpi) => [kpi.id, kpi.value]));
  const totalRowsValue = kpisById.get("total_rows") ?? dataset?.rows.length ?? 0;
  const primaryMetricKpi = kpisById.get("primary_metric") ?? primaryMetricValue ?? "-";
  const topCategoryKpi = kpisById.get("top_category") ?? topCategory ?? "-";
  const timeSpanKpi = kpisById.get("time_span") ?? dateRange ?? "-";

  const kpis = [
    {
      title: "Total Rows",
      value: formatKpiValue(totalRowsValue),
      subtitle: "Count of records",
      icon: Hash,
    },
    {
      title: "Primary Metric",
      value: formatKpiValue(primaryMetricKpi),
      subtitle: numericColumn
        ? `${primaryMetricLabel === "sum" ? "Sum" : "Average"} of ${numericColumn.name}`
        : "No numeric column",
      icon: Sigma,
    },
    {
      title: "Top Category",
      value: formatKpiValue(topCategoryKpi),
      subtitle: categoricalColumn ? categoricalColumn.name : "No categorical column",
      icon: Tag,
    },
    {
      title: "Time Span",
      value: formatKpiValue(timeSpanKpi),
      subtitle: dateRange ? dateColumn?.name ?? "" : "No datetime column",
      icon: CalendarRange,
    },
  ];

  const handleToggleHidden = (chartId: string) => {
    setHiddenChartIds((prev) =>
      prev.includes(chartId) ? prev.filter((id) => id !== chartId) : [...prev, chartId]
    );
  };

  if (!dataset) {
    return (
      <div className="h-full overflow-y-auto rounded-[2rem] gradient-subtle p-6">
        <div className="mx-auto max-w-5xl">
          <div className="section-shell p-10 text-center">
            <h1 className="mb-2 font-display text-4xl font-semibold text-foreground">
              Upload a file to generate insights
            </h1>
            <p className="text-muted-foreground">Charts and KPIs will appear here once a dataset is uploaded.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full max-h-[calc(100vh-5rem)] overflow-y-auto rounded-[2rem] gradient-subtle p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="section-shell px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="eyebrow mb-4">Analytics Dashboard</div>
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-4xl text-foreground">Dataset Dashboard</h1>
                <span className="rounded-full border border-white/80 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-card">
                  Dashboard v{dashboardState?.version ?? "-"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Explore generated KPIs, reorder charts, and refine the dashboard with chat prompts.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.3rem] border border-white/80 bg-white/80 px-4 py-3 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dataset rows</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{formatKpiValue(totalRowsValue)}</p>
              </div>
              <div className="rounded-[1.3rem] border border-white/80 bg-white/80 px-4 py-3 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Visible charts</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{visibleChartsInOrder.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((metric) => (
                <div key={metric.title} className="surface-panel rounded-[1.75rem] border border-white/80 p-5 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/80 bg-white shadow-card">
                      <metric.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Metric
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{metric.value}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{metric.title}</p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">{metric.subtitle}</p>
                </div>
              ))}
            </div>

            {chartsWithData.length === 0 ? (
              <div className="surface-panel rounded-[1.75rem] border border-white/80 p-8 text-center text-muted-foreground shadow-card">
                Not enough data to visualize.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={({ active, over }) => {
                  if (!over || active.id === over.id) {
                    return;
                  }
                  const visibleIds = visibleChartsInOrder.map((chart) => chart.id);
                  const activeIndex = visibleIds.indexOf(String(active.id));
                  const overIndex = visibleIds.indexOf(String(over.id));
                  if (activeIndex === -1 || overIndex === -1) {
                    return;
                  }
                  const nextVisible = arrayMove(visibleIds, activeIndex, overIndex);
                  setChartOrder((prev) => {
                    let nextIndex = 0;
                    return prev.map((id) => (visibleIds.includes(id) ? nextVisible[nextIndex++] : id));
                  });
                }}
              >
                <SortableContext
                  items={visibleChartsInOrder.map((chart) => chart.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {visibleChartsInOrder.map((chart) => (
                      <ChartCard
                        key={chart.id}
                        chart={chart}
                        isHighlighted={hoveredChartId === chart.id}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
          <aside className="w-full lg:w-72 xl:w-80 lg:shrink-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (!over || active.id === over.id) {
                  return;
                }
                setChartOrder((prev) => {
                  const activeIndex = prev.indexOf(String(active.id));
                  const overIndex = prev.indexOf(String(over.id));
                  if (activeIndex === -1 || overIndex === -1) {
                    return prev;
                  }
                  return arrayMove(prev, activeIndex, overIndex);
                });
              }}
            >
              <div className="surface-panel rounded-[1.75rem] border border-white/80 p-4 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-2xl font-semibold text-foreground">Dashboard Structure</h3>
                  <span className="rounded-full bg-secondary/80 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    {orderedCharts.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Drag to reorder charts</p>
                <SortableContext items={chartOrder} strategy={rectSortingStrategy}>
                  <div className="space-y-2">
                    {orderedCharts.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No charts yet.</div>
                    ) : (
                      orderedCharts.map((chart) => (
                        <SidebarChartItem
                          key={chart.id}
                          chart={chart}
                          isHidden={hiddenChartIds.includes(chart.id)}
                          onToggleHidden={handleToggleHidden}
                          onHover={setHoveredChartId}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </div>
            </DndContext>
          </aside>
        </div>
      </div>
    </div>
  );
}
