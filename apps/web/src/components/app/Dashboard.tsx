import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  CalendarRange,
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  Hash,
  LayoutPanelLeft,
  MoreHorizontal,
  Plus,
  Sigma,
  Tag,
  type LucideIcon,
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
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartConfig, KPIConfig, SerializedRow } from "@tada/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip as ShadTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  buildAreaSeries,
  buildGroupedSeries,
  buildScatterSeries,
  computeKpiValue,
  formatNumber as legacyFormatNumber,
  hasRenderableChartData,
} from "@/lib/dashboard-runtime";
import { calculateLayout, type LayoutItem } from "@/lib/chart-layout";
import {
  reorderCharts,
  updateChart,
  useDashboardStore,
  initializeDashboardStore,
  setActiveDashboard,
  getCachedDashboard,
  setDashboardList,
  restoreCachedDashboard,
} from "@/lib/dashboard-store";
import { listDashboards, loadDashboard, createDashboard } from "@/lib/api";
import { getIconComponent } from "@/components/app/CreateDashboardModal";
import CreateDashboardModal from "@/components/app/CreateDashboardModal";
import type { DashboardListItem } from "@tada/shared";

const donutPalette = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
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
  payload?: Array<{
    value?: number;
    color?: string;
    payload?: { label?: string };
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0];

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white px-[14px] py-[10px] shadow-[0_8px_20px_rgba(0,0,0,0.10)]">
      <p className="text-xs text-[var(--color-text-secondary)]">
        {point.payload?.label ?? label ?? "Value"}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: point.color ?? "#3B82F6" }}
        />
        <span className="text-sm font-bold text-[var(--color-text-primary)]">
          {formatMetric(point.value ?? 0)}
        </span>
      </div>
    </div>
  );
}

function ChartEmptyState() {
  return (
    <div className="flex h-[180px] items-center justify-center px-6 text-center">
      <p className="text-sm text-[var(--color-text-muted)]">
        This chart does not have enough data to render.
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
  const [activeSlice, setActiveSlice] = useState<number | undefined>(undefined);

  if (chart.type === "area") {
    const series = buildAreaSeries(chart, rows);
    if (series.length === 0) {
      return <ChartEmptyState />;
    }

    return (
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={series}
            margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id={`area-${chart.id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#F1F5F9"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              fontSize={11}
              stroke="#94A3B8"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              fontSize={11}
              stroke="#94A3B8"
            />
            <Tooltip content={<DashboardTooltip />} cursor={false} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3B82F6"
              strokeWidth={2}
              fill={`url(#area-${chart.id})`}
              dot={false}
              activeDot={{
                r: 4,
                fill: "#3B82F6",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
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
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid
              vertical={false}
              stroke="#F1F5F9"
              strokeDasharray="3 3"
            />
            <XAxis
              type="number"
              dataKey="x"
              name={chart.columns[0]}
              axisLine={false}
              tickLine={false}
              fontSize={11}
              stroke="#94A3B8"
            />
            <YAxis
              type="number"
              dataKey="y"
              name={chart.columns[1]}
              axisLine={false}
              tickLine={false}
              fontSize={11}
              stroke="#94A3B8"
            />
            <Tooltip
              content={<DashboardTooltip />}
              cursor={{ stroke: "#DBEAFE", strokeDasharray: "3 3" }}
            />
            <Scatter data={series} fill="#3B82F6" />
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
    const total = series.reduce((sum, entry) => sum + entry.value, 0);
    return (
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={series}
              dataKey="value"
              nameKey="label"
              paddingAngle={3}
              innerRadius="60%"
              outerRadius="80%"
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
                      className="fill-[var(--color-text-primary)] text-[18px] font-bold"
                    >
                      {formatMetric(total)}
                    </tspan>
                  </text>
                )}
              />
            </Pie>
            <Tooltip content={<DashboardTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={series}
          margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#F1F5F9"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            fontSize={11}
            stroke="#94A3B8"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            fontSize={11}
            stroke="#94A3B8"
          />
          <Tooltip
            content={<DashboardTooltip />}
            cursor={{ fill: "#EFF6FF" }}
          />
          <Bar
            dataKey="value"
            fill="#3B82F6"
            fillOpacity={0.85}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

function deriveFallbackCards(rows: SerializedRow[]): Array<{
  id: string;
  icon: typeof Hash;
  value: string | number;
  label: string;
  description: string;
}> {
  const keys = Object.keys(rows[0] ?? {});
  const categoricalColumn =
    keys.find((key) =>
      rows.some((row) => typeof row[key] === "string" && row[key] !== ""),
    ) ?? null;
  const dateColumn =
    keys.find((key) =>
      rows.some(
        (row) =>
          typeof row[key] === "string" &&
          Number.isFinite(Date.parse(String(row[key]))),
      ),
    ) ?? null;

  const cards: Array<{
    id: string;
    icon: typeof Hash;
    value: string | number;
    label: string;
    description: string;
  }> = [];

  if (categoricalColumn) {
    const values = rows
      .map((row) => row[categoricalColumn])
      .filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      );
    const uniqueCount = new Set(values).size;
    const counts = new Map<string, number>();
    for (const value of values) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const topValue = Array.from(counts.entries()).sort(
      (left, right) => right[1] - left[1],
    )[0];

    cards.push({
      id: "unique_category_count",
      icon: Tag,
      value: uniqueCount,
      label: `${categoricalColumn} Categories`,
      description: "Unique values in the main category column",
    });

    if (topValue) {
      cards.push({
        id: "top_category_value",
        icon: Sigma,
        value: topValue[0],
        label: `Top ${categoricalColumn}`,
        description: "Most common value in your data",
      });
    }
  }

  if (dateColumn) {
    const dates = rows
      .map((row) => {
        const value = row[dateColumn];
        return typeof value === "string" && Number.isFinite(Date.parse(value))
          ? new Date(value)
          : null;
      })
      .filter((value): value is Date => Boolean(value))
      .sort((left, right) => left.getTime() - right.getTime());

    if (dates.length > 0) {
      const start = dates[0].toISOString().slice(0, 10);
      const end = dates[dates.length - 1].toISOString().slice(0, 10);
      cards.push({
        id: "date_range",
        icon: CalendarRange,
        value: start === end ? start : `${start} - ${end}`,
        label: "Date Range",
        description: "Coverage span in your dataset",
      });
    }
  }

  cards.push({
    id: "rows_loaded",
    icon: Hash,
    value: rows.length,
    label: "Rows Loaded",
    description: "Total dataset rows currently available",
  });

  return cards;
}

function KpiCard({
  icon: Icon,
  value,
  label,
  description,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  description: string;
}) {
  return (
    <Card className="dashboard-surface dashboard-hover shadow-none">
      <CardContent className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-[var(--color-text-secondary)]">
            {label}
          </p>
          <div className="mt-1.5 text-[22px] font-extrabold leading-none tracking-tight text-[var(--color-text-primary)]">
            {formatMetric(value)}
          </div>
          <p className="mt-1.5 truncate text-[11px] text-[var(--color-text-muted)]">
            {description}
          </p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#3B82F6]">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5" />
      <div className="grid grid-cols-1 gap-3 px-5 py-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="dashboard-surface">
            <CardContent className="px-4 py-3">
              <div className="h-3 w-20 animate-shimmer rounded bg-slate-100" />
              <div className="mt-3 h-6 w-24 animate-shimmer rounded bg-slate-100" />
              <div className="mt-2 h-3 w-28 animate-shimmer rounded bg-slate-100" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex-1 px-5 pb-4">
        <Card className="dashboard-surface h-full" />
      </div>
    </div>
  );
}

type ChartCardProps = {
  chart: LayoutItem;
  rows: SerializedRow[];
};

function ChartCard({ chart, rows }: ChartCardProps) {
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
        className={`dashboard-surface overflow-hidden p-0 shadow-none transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] ${
          chart.size === "large" ? "xl:col-span-2" : "xl:col-span-1"
        } ${isDragging ? "opacity-75" : ""}`}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 px-4 pb-0 pt-3">
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
              {chart.title}
            </h3>
            <p className="mt-1 line-clamp-1 text-[11px] text-[var(--color-text-muted)]">
              {chart.insight}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="rounded-[4px] border-0 bg-[var(--color-accent-light)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent-light)]">
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
                  className="h-7 w-7 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
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
        <CardContent className="px-4 pb-3 pt-2">
          <ChartContent chart={chart} rows={rows} />
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function ChartStructurePopover({
  charts,
  onClose,
}: {
  charts: ChartConfig[];
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-12 z-20 w-[280px] rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
      <div className="mb-2 flex items-center justify-between px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Chart Structure
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
            Dashboard order
          </p>
        </div>
      </div>

      <div className="dashboard-scroll max-h-[360px] space-y-2 overflow-y-auto pr-1">
        {charts.map((chart, index) => (
          <div
            key={chart.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  {chart.title}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {chart.type} • {chart.size}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
                onClick={() =>
                  updateChart(chart.id, { visible: !chart.visible })
                }
                aria-label={
                  chart.visible ? `Hide ${chart.title}` : `Show ${chart.title}`
                }
              >
                {chart.visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-[var(--color-border)] pt-3">
        <Button
          type="button"
          variant="ghost"
          className="h-9 w-full justify-center rounded-lg text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  );
}

export function Dashboard() {
  const datasetId = useDashboardStore((snapshot) => snapshot.datasetId);
  const rows = useDashboardStore((snapshot) => snapshot.rows);
  const charts = useDashboardStore((snapshot) => snapshot.charts);
  const kpiConfigs = useDashboardStore((snapshot) => snapshot.kpis);
  const fileName = useDashboardStore((snapshot) => snapshot.fileName);
  const [isStructureOpen, setIsStructureOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const orderedCharts = useMemo(
    () => [...charts].sort((left, right) => left.order - right.order),
    [charts],
  );
  const visibleCharts = useMemo(
    () =>
      orderedCharts.filter(
        (chart) => chart.visible && hasRenderableChartData(chart, rows),
      ),
    [orderedCharts, rows],
  );
  const layoutItems = useMemo(
    () => calculateLayout(visibleCharts),
    [visibleCharts],
  );
  const isLoading =
    Boolean(datasetId) && (kpiConfigs.length === 0 || charts.length === 0);

  const kpiCards = useMemo(() => {
    // Use all backend-generated KPIs (including AI primary) directly
    const backendCards = kpiConfigs.slice(0, 4).map((kpi) => ({
      id: kpi.id,
      icon: getKpiIcon(kpi),
      value: computeKpiValue(kpi, rows),
      label: kpi.label,
      description: kpi.description,
    }));

    // Only fill with fallback cards if backend returned fewer than 4
    if (backendCards.length < 4) {
      const fallbackCards = deriveFallbackCards(rows).filter(
        (fallback) => !backendCards.some((card) => card.id === fallback.id),
      );
      return [...backendCards, ...fallbackCards].slice(0, 4);
    }

    return backendCards;
  }, [kpiConfigs, rows]);

  // ── Dashboard Header with switcher ──

  function DashboardHeader({
    orderedCharts: headerCharts,
    isStructureOpen: structureOpen,
    setIsStructureOpen: setStructureOpen,
  }: {
    orderedCharts: ChartConfig[];
    isStructureOpen: boolean;
    setIsStructureOpen: (fn: (c: boolean) => boolean) => void;
  }) {
    const activeDashboardId = useDashboardStore((s) => s.activeDashboardId);
    const activeDashboardName = useDashboardStore((s) => s.activeDashboardName);
    const activeDashboardIcon = useDashboardStore((s) => s.activeDashboardIcon);
    const activeDashboardColor = useDashboardStore(
      (s) => s.activeDashboardColor,
    );
    const allDashboards = useDashboardStore((s) => s.dashboardList);

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);

    const fetchDashboards = useCallback(async () => {
      try {
        const items = await listDashboards();
        setDashboardList(items);
      } catch {
        // silent
      }
    }, []);

    useEffect(() => {
      if (dropdownOpen) {
        fetchDashboards();
      }
    }, [dropdownOpen, fetchDashboards]);

    async function handleSwitch(dash: DashboardListItem) {
      setDropdownOpen(false);

      // Try local cache first for instant switch
      const cached = getCachedDashboard(dash.id);
      if (cached) {
        restoreCachedDashboard(cached);
        return;
      }

      // Fallback to fetch
      try {
        const result = await loadDashboard(dash.id);
        if (!("empty" in result)) {
          initializeDashboardStore(result, result.dashboard);
          setActiveDashboard(result.dashboard);
        }
      } catch {
        // silent
      }
    }

    async function handleCreateDashboard(input: {
      name: string;
      icon: string;
      color: string;
    }) {
      setCreateOpen(false);
      setDropdownOpen(false);
      try {
        const created = await createDashboard(input);
        setActiveDashboard({
          id: created.id,
          name: created.name,
          icon: created.icon,
          color: created.color,
        });
      } catch {
        // silent
      }
    }

    const ActiveIcon = activeDashboardIcon
      ? getIconComponent(activeDashboardIcon)
      : null;

    return (
      <>
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5">
          <div className="font-display text-[20px] text-[var(--color-text-primary)]">
            Dashboard
          </div>
          <div className="flex items-center gap-2.5">
            {/* Dashboard switcher dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[#3B82F6] hover:text-[#3B82F6]"
              >
                {ActiveIcon && activeDashboardColor && (
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded"
                    style={{ color: activeDashboardColor }}
                  >
                    <ActiveIcon className="h-3 w-3" />
                  </span>
                )}
                <span className="max-w-[160px] truncate">
                  {activeDashboardName ?? fileName ?? "No dashboard"}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg">
                  {allDashboards.map((dash) => {
                    const DI = getIconComponent(dash.icon);
                    const isActive = dash.id === activeDashboardId;
                    return (
                      <button
                        key={dash.id}
                        type="button"
                        onClick={() => handleSwitch(dash)}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                          isActive
                            ? "bg-blue-50 font-medium text-[#3B82F6]"
                            : "text-[var(--color-text-primary)] hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: dash.color + "18",
                            color: dash.color,
                          }}
                        >
                          <DI className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 truncate">{dash.name}</span>
                        {isActive && (
                          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]" />
                        )}
                      </button>
                    );
                  })}
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setCreateOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--color-text-muted)] transition-colors hover:bg-slate-50 hover:text-[#3B82F6]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                    New Dashboard
                  </button>
                </div>
              )}
            </div>

            {/* Chart structure button */}
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setStructureOpen((current) => !current)}
                className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
                aria-label="Open chart structure"
              >
                <LayoutPanelLeft className="h-4 w-4" />
              </Button>
              {structureOpen ? (
                <ChartStructurePopover
                  charts={headerCharts}
                  onClose={() => setStructureOpen(() => false)}
                />
              ) : null}
            </div>
          </div>
        </div>
        <CreateDashboardModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreateDashboard}
        />
      </>
    );
  }

  if (!datasetId) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--color-bg)] p-8">
        <Card className="dashboard-surface px-10 py-12 text-center shadow-none">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Upload a dataset to begin
          </h1>
          <p className="mt-3 text-base text-[var(--color-text-secondary)]">
            Your dashboard will render directly from centralized chart and KPI
            state.
          </p>
          <Button
            className="mt-8 rounded-lg bg-[var(--color-accent)] px-5 hover:bg-[#1D4ED8]"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Choose a file
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <DashboardHeader
            orderedCharts={orderedCharts}
            isStructureOpen={isStructureOpen}
            setIsStructureOpen={setIsStructureOpen}
          />

          <div className="grid shrink-0 grid-cols-1 gap-3 px-5 py-3 md:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((card) => (
              <KpiCard
                key={card.id}
                icon={card.icon}
                value={card.value}
                label={card.label}
                description={card.description}
              />
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden px-5 pb-4">
            {layoutItems.length === 0 ? (
              <Card className="dashboard-surface flex h-full items-center justify-center shadow-none">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                    No visible charts
                  </h2>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    Re-enable a hidden chart to bring the dashboard back into
                    view.
                  </p>
                </div>
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

                  const nextVisible = arrayMove(
                    visibleIds,
                    activeIndex,
                    overIndex,
                  );
                  const nextIds = orderedCharts.map((chart) => chart.id);
                  let visibleIndex = 0;
                  const reorderedIds = nextIds.map((id) =>
                    visibleIds.includes(id) ? nextVisible[visibleIndex++] : id,
                  );
                  reorderCharts(reorderedIds);
                }}
              >
                <SortableContext
                  items={layoutItems.map((chart) => chart.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid h-full grid-cols-1 gap-3 xl:grid-cols-2">
                    {layoutItems.map((chart) => (
                      <ChartCard key={chart.id} chart={chart} rows={rows} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </>
      )}
    </div>
  );
}
