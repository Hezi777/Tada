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
  backgroundColor: "hsl(0, 0%, 100%)",
  border: "1px solid hsl(210, 25%, 91%)",
  borderRadius: "8px",
  fontSize: "12px",
};

const primaryColor = "hsl(199, 89%, 48%)";
const accentColor = "hsl(187, 75%, 55%)";
const secondaryColor = "hsl(173, 80%, 40%)";
const tertiaryColor = "hsl(210, 60%, 50%)";
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
        <div className="h-64 overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-secondary/60">
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
                <tr key={`${chart.id}-${index}`} className="border-t border-border">
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
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 25%, 91%)" />
                    <XAxis dataKey={series.xKey} stroke="hsl(215, 16%, 47%)" fontSize={12} />
                    <YAxis stroke="hsl(215, 16%, 47%)" fontSize={12} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 25%, 91%)" />
                    <XAxis dataKey={series.xKey} stroke="hsl(215, 16%, 47%)" fontSize={12} />
                    <YAxis stroke="hsl(215, 16%, 47%)" fontSize={12} />
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
      className={`bg-card rounded-xl p-5 border border-border shadow-[0_1px_3px_hsl(var(--foreground)/0.04),_0_4px_12px_hsl(var(--foreground)/0.04)] transition-shadow ${
        isHighlighted ? "ring-2 ring-primary/30" : ""
      } ${isDragging ? "opacity-80" : ""}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Drag ${chart.title}`}
            title="Drag to reorder"
            className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground hover:text-foreground hover:bg-secondary cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div>
            <h3 className="font-semibold text-foreground">{chart.title}</h3>
            <p className="text-sm text-muted-foreground">{chart.type.toUpperCase()} chart</p>
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
      className={`flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm ${
        isHidden ? "text-muted-foreground bg-secondary/40" : "text-foreground hover:bg-secondary"
      } ${isDragging ? "bg-secondary/60 ring-2 ring-primary/20 opacity-70" : ""}`}
      onMouseEnter={() => onHover(chart.id)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Drag ${chart.title}`}
        title="Drag to reorder"
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/60 hover:text-muted-foreground hover:bg-secondary/60 cursor-grab active:cursor-grabbing"
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
  if (!dataset) {
    return (
      <div className="h-full overflow-y-auto p-6 bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <h1 className="text-2xl font-semibold text-foreground mb-2">Upload a file to generate insights</h1>
            <p className="text-muted-foreground">Charts and KPIs will appear here once a dataset is uploaded.</p>
          </div>
        </div>
      </div>
    );
  }

  const numericColumn = dataset.profile.columns.find((column) => column.role === "numeric");
  const categoricalColumn = dataset.profile.columns.find(
    (column) =>
      column.role === "categorical" &&
      !column.isIdLike &&
      !column.isTextLong &&
      column.cardinality <= 30
  );
  const dateColumn = dataset.profile.columns.find((column) => column.role === "datetime");

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

  const [chartOrder, setChartOrder] = useState<string[]>([]);
  const [hiddenChartIds, setHiddenChartIds] = useState<string[]>([]);
  const [hoveredChartId, setHoveredChartId] = useState<string | null>(null);

  useEffect(() => {
    if (!dashboardState) {
      setChartOrder([]);
      setHiddenChartIds([]);
      return;
    }
    setChartOrder(dashboardState.charts.map((chart) => chart.id));
    setHiddenChartIds(dashboardState.hiddenChartIds ?? []);
  }, [dashboardState?.datasetId]);

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
  }, [dashboardState?.charts]);

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
  const totalRowsValue = kpisById.get("total_rows") ?? dataset.rows.length;
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleToggleHidden = (chartId: string) => {
    setHiddenChartIds((prev) =>
      prev.includes(chartId) ? prev.filter((id) => id !== chartId) : [...prev, chartId]
    );
  };

  return (
    <div className="h-full max-h-[calc(100vh-3.5rem)] overflow-y-auto p-6 bg-surface">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">Dataset Dashboard</h1>
            <span className="text-xs text-muted-foreground">Dashboard v{dashboardState?.version ?? "-"}</span>
          </div>
        </div>


        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((metric) => (
                <div key={metric.title} className="bg-card rounded-xl p-5 border border-border shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <metric.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{metric.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.subtitle}</p>
                </div>
              ))}
            </div>

            {chartsWithData.length === 0 ? (
              <div className="bg-card rounded-xl p-6 border border-border text-center text-muted-foreground">
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
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Dashboard Structure</h3>
                  <span className="text-xs text-muted-foreground">{orderedCharts.length}</span>
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
