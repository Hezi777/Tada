"use client";

import { type Key, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CalendarRange,
  Eye,
  EyeOff,
  GripVertical,
  Hash,
  LayoutPanelLeft,
  Pin,
  PinOff,
  Tag,
  Trash2,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
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
import type {
  ChartConfig,
  ChartSize,
  KPIConfig,
  SerializedRow,
} from "@/shared/contracts";
import type {
  CategoricalChartSeries,
  KpiTrend,
} from "@/features/dashboard/client/runtime";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  computeKpiTrend,
  computeKpiValue,
  formatNumber as legacyFormatNumber,
  hasRenderableChartData,
  isChartVisible,
} from "@/features/dashboard/client/runtime";
import {
  GRID_GAP,
  ROW_UNIT,
  TIERS,
  widgetDimensions,
  widgetSpans,
  type CanvasTier,
} from "@/features/dashboard/client/grid";
import { useCanvasTier } from "@/features/dashboard/client/use-canvas-tier";
import { useDashboardTrust } from "@/features/dashboard/client/use-dashboard-trust";
import type { DashboardDateRange } from "@/features/dashboard/client/trust";
import {
  promoteHiddenChart,
  removeChart,
  reorderWidgets,
  setChartVisibility,
  toggleChartPinned,
  useDashboardStore,
  initializeDashboardStore,
  setActiveDashboard,
  getCachedDashboard,
  setDashboardList,
  restoreCachedDashboard,
} from "@/features/dashboard/client/store";
import { loadDashboard, createDashboard } from "@/shared/lib/api";
import CreateDashboardModal from "@/features/dashboard/components/CreateDashboardModal";
import { DashboardSwitcher } from "@/features/dashboard/components/DashboardSwitcher";
import { DashboardChartCard } from "@/features/dashboard/components/DashboardChartCard";
import { GeneratingChartCard } from "@/features/dashboard/components/GeneratingChartCard";
import { DashboardTrustControls } from "@/features/dashboard/components/DashboardTrustControls";
import { AddChartTile } from "@/features/dashboard/components/AddChartTile";
import { onChartGenerating } from "@/features/dashboard/client/chart-effects";
import { useTranslation } from "@/shared/i18n";
import type { DashboardListItem } from "@/shared/contracts";
import { BI_RULE_LIMITS } from "@/shared/contracts";
import {
  formatAggregationLabel,
  resolveKpiIcon,
} from "@/features/dashboard/client/design";
import {
  detectCurrencySymbol,
  formatCurrency,
  formatDateIL,
  formatRatioAsPercent,
  looksLikeCurrencyColumn,
  looksLikeRatioColumn,
  metricPolarity,
} from "@/shared/lib/format";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";

function formatMetric(
  value: string | number,
  columnName?: string,
): string | number {
  if (typeof value === "string") {
    return value.trim() ? value : "-";
  }

  if (!Number.isFinite(value)) {
    return "-";
  }

  // Currency formatting for money-like KPI columns. The symbol comes from the
  // column name (e.g. "(₪)", "USD"); defaults to $ when none is stated.
  if (columnName && looksLikeCurrencyColumn(columnName)) {
    const symbol = detectCurrencySymbol(columnName) ?? "$";
    return formatCurrency(value, symbol, Math.abs(value) >= 100_000);
  }

  // A proportion stored as a fraction reads as a bug at KPI scale: an average
  // discount of 9% renders as "0.09", which looks like a broken number rather
  // than a small one.
  if (columnName && looksLikeRatioColumn(columnName, value)) {
    return formatRatioAsPercent(value);
  }

  return legacyFormatNumber(value) ?? value;
}

function getKpiIcon(kpi: KPIConfig) {
  return resolveKpiIcon(kpi);
}

/** Turn "q3_sales_report.xlsx" into "Q3 Sales Report" for default copy. */
function titleFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^./\\]+$/, "");
  const words = withoutExtension
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (words.length === 0) {
    return "Dashboard";
  }

  return words
    .map((word) =>
      /^[A-Za-z]+$/.test(word)
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word,
    )
    .join(" ");
}

function deriveFallbackCards(rows: SerializedRow[]): Array<{
  id: string;
  icon: LucideIcon;
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
    icon: LucideIcon;
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
        icon: TrendingUp,
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
      const start = formatDateIL(dates[0]);
      const end = formatDateIL(dates[dates.length - 1]);
      cards.push({
        id: "date_range",
        icon: CalendarRange,
        value: start === end ? start : `${start} – ${end}`,
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

// Bidi isolation marks (FSI/PDI/LRI) wrap currency/number values for RTL
// safety but must not count toward the visible length used for sizing.
const BIDI_MARKS = /[⁦⁧⁨⁩]/g;

/**
 * Pick a KPI value font size by ROLE (primary vs secondary), not string
 * length. The primary KPI is the largest (top-left, F-pattern); secondary
 * KPIs are smaller. Very long values still step down a size so they don't
 * overflow the card. The small size class caps everything a step lower —
 * a 1×1 cell can't host display sizes.
 */
function kpiValueSizeClass(
  value: string | number,
  isPrimary: boolean,
  isSmall = false,
): string {
  const visibleLength = String(value).replace(BIDI_MARKS, "").length;
  if (isSmall) {
    const base = "display-number font-black tracking-tight tabular-nums";
    return visibleLength > 9 ? `${base} text-2xl` : `${base} text-3xl`;
  }
  if (isPrimary) {
    // The primary metric carries the hierarchy, but still steps down for long
    // currency values so it remains on one line.
    const base = "display-number font-black tracking-tight tabular-nums";
    if (visibleLength > 10) return `${base} text-2xl sm:text-3xl`;
    if (visibleLength > 7) return `${base} text-3xl sm:text-4xl`;
    return `${base} text-4xl sm:text-5xl`;
  }
  return visibleLength > 11 ? "t-metric text-2xl sm:text-3xl" : "t-metric";
}

/** Brand-blue accent used for the sparkline stroke. */
const KPI_SPARKLINE_ACCENT = "#2f6df6";

/** Fixed sparkline strip height inside medium/large KPI cards. */
const KPI_SPARKLINE_HEIGHT = 40;

function KpiSparkline({
  data,
  width,
  height,
}: {
  data: CategoricalChartSeries;
  width: number;
  height: number;
}) {
  const values = data.map((entry) => entry.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x =
        data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
      const y = height - 3 - ((value - min) / range) * (height - 6);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={KPI_SPARKLINE_ACCENT}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The arrow always reports the real direction of travel. The colour reports
 * whether that direction is good news, which is not the same question: for a
 * cost-like measure (discount, refunds, churn, latency) a rise is a loss, and
 * painting it emerald tells the reader the opposite of the truth.
 */
function KpiDeltaBadge({
  deltaPct,
  columnName,
}: {
  deltaPct: number;
  columnName?: string;
}) {
  const rising = deltaPct >= 0;
  const ArrowIcon = rising ? ArrowUp : ArrowDown;
  const inverse = columnName ? metricPolarity(columnName) === "inverse" : false;
  const isGoodNews = inverse ? !rising : rising;

  return (
    <span
      /* Tinted fill rather than a hairline outline. At this size an outlined
         pill reads as another piece of card chrome; a filled one reads as a
         value, which is what it is. Kept at /10 so it stays quiet next to the
         number it belongs to. */
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        isGoodNews
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-destructive/10 text-destructive"
      }`}
    >
      <ArrowIcon className="h-3 w-3" strokeWidth={2.5} />
      {Math.abs(deltaPct).toFixed(1)}%
    </span>
  );
}

/**
 * A "large" KPI card without a trend has nothing to fill its second row
 * (no sparkline, no breakdown) — collapse it to "medium" so the card's
 * height matches its actual content instead of leaving a hole. Cards that
 * do have a trend, or are already medium/small, render at their configured
 * size unchanged.
 */
function kpiPresentationSize(size: ChartSize, trend: KpiTrend | null): ChartSize {
  if (!trend && size === "large") {
    return "medium";
  }
  return size;
}

export function KpiCard({
  icon: Icon,
  value,
  label,
  eyebrow,
  isPrimary = false,
  trend,
  chrome,
  size = "medium",
  tier = "t4",
  columnName,
}: {
  key?: Key;
  icon: LucideIcon;
  value: string | number;
  label: string;
  eyebrow: string;
  isPrimary?: boolean;
  trend: KpiTrend | null;
  /** Source column, used to pick number format and delta polarity. */
  columnName?: string;
  /** Edit-mode chrome (drag handle + size control), rendered top-right. */
  chrome?: React.ReactNode;
  /** Size class selects the VIEW (docs/WIDGET_SIZING.md §5), it never
   * scales one: small = value+label(+delta) stack, medium = landscape with
   * a side sparkline, large = rich stack with full-width sparkline,
   * breakdown row, and (primary only) the hero illustration. */
  size?: ChartSize;
  tier?: CanvasTier;
}) {
  const displayValue = formatMetric(value, columnName);
  const cardWidth = widgetDimensions(size, tier).width;

  // Spec §6.5: every KPI card variant shares the same neutral surface and
  // icon chip — "quiet by default, loud once" means the accent lives on the
  // eyebrow badge (Badge default variant), not on the card chrome.
  const surfaceClass = "border-border bg-card text-card-foreground";
  const iconBoxClass = "bg-muted text-muted-foreground";
  const valueColor = "text-foreground";
  const labelColor = "text-muted-foreground";

  const statusBadge = trend ? (
    <KpiDeltaBadge deltaPct={trend.deltaPct} columnName={columnName} />
  ) : (
    <Badge
      variant={isPrimary ? "default" : "secondary"}
      className="shrink-0 text-[10px] uppercase tracking-wide"
    >
      {eyebrow}
    </Badge>
  );

  if (size === "small") {
    /*
      1×1, laid out per §6.5: a header row of icon chip + title, then the
      value beneath it. The earlier arrangement put the icon and the delta on
      the top row and the label under the value, which left the delta sitting
      diagonally opposite the number it modifies — the reader had to travel
      the full card to pair them. Value and delta now share a baseline, and
      the label reads as the card's title where the spec puts it.
    */
    return (
      <Card
        className={`relative h-full overflow-hidden rounded-lg ${surfaceClass}`}
      >
        {chrome}
        {/* Centred, not space-between: the row height is fixed by the grid, so
            justifying to the edges pushed ~90px of air between the title and
            the number and read as two unrelated things. Grouping them with the
            spec's mt-4 and centring the group keeps the card's own proportions
            regardless of how tall the row happens to be. */}
        <CardContent className="relative flex h-full flex-col justify-center overflow-hidden p-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBoxClass}`}
            >
              <Icon className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <p className={`min-w-0 truncate text-sm font-medium ${valueColor}`}>
              {label}
            </p>
          </div>
          <div className="mt-4">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span
                className={`truncate ${kpiValueSizeClass(displayValue, isPrimary, true)} ${valueColor}`}
              >
                {displayValue}
              </span>
              {statusBadge}
            </div>
            {/* Without this the delta is a bare percentage against an unstated
                period, which can look like it contradicts the chart insight
                below it. Stating the basis costs one line. */}
            {trend ? (
              <p className={`mt-1 truncate text-[11px] leading-snug ${labelColor}`}>
                {trend.basis}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (size === "medium") {
    // 2×1 landscape: value+label on the reading-start side, fixed-size
    // sparkline beside them. The old vertical stack overflowed the 160px row
    // (the min-h-[184px] clip this view replaces).
    const sparklineWidth = Math.floor((cardWidth - 40) * 0.45);
    return (
      <Card
        className={`relative h-full overflow-hidden rounded-lg ${surfaceClass}`}
      >
        {chrome}
        <CardContent className="relative flex h-full flex-col justify-between overflow-hidden p-5">
          <div className="flex items-start justify-between gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBoxClass}`}
            >
              <Icon className="h-4 w-4" strokeWidth={2.25} />
            </div>
            {statusBadge}
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div
                className={`truncate ${kpiValueSizeClass(displayValue, isPrimary, !isPrimary)} ${valueColor}`}
              >
                {displayValue}
              </div>
              <p
                className={`mt-1 truncate text-sm font-medium leading-snug ${labelColor}`}
              >
                {label}
              </p>
            </div>
            {trend ? (
              <div className="shrink-0 overflow-hidden">
                <KpiSparkline
                  data={trend.sparkline}
                  width={sparklineWidth}
                  height={KPI_SPARKLINE_HEIGHT}
                />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 2×2 large: value, context, and an optional full-width sparkline.
  const sparklineWidth = cardWidth - 40 + 8;
  return (
    <Card
      className={`relative h-full overflow-hidden rounded-lg ${surfaceClass}`}
    >
      {chrome}
      <CardContent className="relative flex h-full flex-col justify-between overflow-hidden p-5">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBoxClass}`}
          >
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </div>
          {isPrimary ? null : statusBadge}
        </div>

        <div className="mt-4">
          <div className="flex items-end justify-between gap-2">
            <div
              className={`min-w-0 flex-1 ${kpiValueSizeClass(displayValue, isPrimary)} ${valueColor}`}
            >
              {displayValue}
            </div>
            {isPrimary ? (
              <Badge variant="default" className="mb-1 text-[11px]">
                {eyebrow}
              </Badge>
            ) : null}
          </div>

          <p className={`mt-2 text-sm font-medium leading-snug ${labelColor}`}>
            {label}
          </p>

          {trend ? (
            <div className="mt-3 -mx-1 overflow-hidden">
              <KpiSparkline
                data={trend.sparkline}
                width={sparklineWidth}
                height={KPI_SPARKLINE_HEIGHT}
              />
            </div>
          ) : null}
        </div>

        {trend ? (
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs font-medium text-muted-foreground">
              {eyebrow}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {trend.sparkline.length} pts
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

type DragHandleProps = {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
};

/**
 * Sortable wrapper for a single Apple-widget (KPI or chart). Grid spans come
 * from `grid.ts` as fixed constants per (size class, tier) — content inside
 * selects its view from the same class, never from measured width.
 * Chrome (drag handle + size control, and for charts the pencil) is rendered
 * by `children` via the render-prop so each widget type keeps its own chrome
 * layout/position.
 */
function SortableWidget({
  id,
  size,
  tier,
  children,
}: {
  id: string;
  size: ChartSize;
  tier: CanvasTier;
  children: (drag: DragHandleProps) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const spans = widgetSpans(size, tier);
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: `span ${spans.cols}`,
    gridRow: `span ${spans.rows}`,
  };

  return (
    <div ref={setNodeRef} style={style} className="premium-transition relative">
      {children({ attributes, listeners })}
    </div>
  );
}

/** Responsive canvas grid. The tier still controls column count and widget
 * content density, while `minmax(0, 1fr)` lets the canvas use all available
 * width without introducing a horizontal scrollbar. */
function canvasGridStyle(tier: CanvasTier): React.CSSProperties {
  const { columns } = TIERS[tier];
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gridAutoRows: `${ROW_UNIT}px`,
    gridAutoFlow: "row dense",
    gap: GRID_GAP,
    width: "100%",
  };
}

function DashboardSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center bg-card px-5" />
      <div className="grid grid-cols-1 gap-5 px-5 py-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={index}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <CardContent className="p-5">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="mt-4 h-3 w-20 rounded-full" />
              <Skeleton className="mt-3 h-6 w-24 rounded-full" />
              <Skeleton className="mt-2 h-3 w-28 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex-1 px-5 pb-4">
        <Card className="h-full rounded-lg border border-border bg-card">
          <Skeleton className="h-full w-full rounded-lg" />
        </Card>
      </div>
    </div>
  );
}

function ManageViewsSection({
  title,
  description,
  charts,
  allCharts,
  visibleCount,
}: {
  title: string;
  description: string;
  charts: ChartConfig[];
  allCharts: ChartConfig[];
  visibleCount: number;
}) {
  const [replaceTargetFor, setReplaceTargetFor] = useState<string | null>(null);
  const replaceableCharts = allCharts.filter(
    (chart) => isChartVisible(chart) && chart.order !== 0 && !chart.pinned,
  );

  if (charts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-2">
        {charts.map((chart, index) => {
          const visible = isChartVisible(chart);
          const canHide = visibleCount > BI_RULE_LIMITS.minCharts;
          const canDelete = !visible || canHide;

          return (
            <div key={chart.id} className="rounded-lg bg-muted p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {chart.type}
                    </Badge>
                    <Badge
                      variant={visible ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {visible ? "visible" : "hidden"}
                    </Badge>
                    {chart.pinned ? (
                      <Badge variant="secondary" className="text-[10px]">
                        pinned
                      </Badge>
                    ) : null}
                    {chart.chatbotGenerated ? (
                      <Badge variant="default" className="text-[10px]">
                        suggested
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-foreground">
                    {chart.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {chart.insight}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
                    onClick={() => toggleChartPinned(chart.id)}
                    aria-label={
                      chart.pinned
                        ? `Unpin ${chart.title}`
                        : `Pin ${chart.title}`
                    }
                  >
                    {chart.pinned ? (
                      <PinOff className="h-4 w-4" />
                    ) : (
                      <Pin className="h-4 w-4" />
                    )}
                  </Button>

                  {visible ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={() => setChartVisibility(chart.id, false)}
                      disabled={!canHide}
                      aria-label={`Hide ${chart.title}`}
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
                      onClick={() => {
                        if (visibleCount < BI_RULE_LIMITS.maxCharts) {
                          promoteHiddenChart(chart.id);
                          return;
                        }

                        setReplaceTargetFor((current) =>
                          current === chart.id ? null : chart.id,
                        );
                      }}
                      aria-label={`Show ${chart.title}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
                    onClick={() => removeChart(chart.id)}
                    disabled={!canDelete}
                    aria-label={`Remove ${chart.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {!visible && replaceTargetFor === chart.id ? (
                <div className="mt-3 rounded-lg bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Replace one visible chart to show this view:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {replaceableCharts.map((candidate) => (
                      <Button
                        key={candidate.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() => {
                          promoteHiddenChart(chart.id, candidate.id);
                          setReplaceTargetFor(null);
                        }}
                      >
                        {candidate.title}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ManageViewsSheet({
  open,
  onOpenChange,
  charts,
  isEditing,
  onEditingChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charts: ChartConfig[];
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  const visibleCharts = charts.filter(isChartVisible);
  const hiddenCharts = charts.filter((chart) => !isChartVisible(chart));
  const pinnedCharts = charts.filter((chart) => chart.pinned);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[420px] p-0 sm:max-w-[420px]"
      >
        <SheetHeader className="px-6 py-5 text-start">
          <SheetTitle>Customize dashboard</SheetTitle>
          <SheetDescription>
            Reorder or choose which insights appear on the dashboard.
          </SheetDescription>
          <Button
            type="button"
            variant={isEditing ? "default" : "outline"}
            className="mt-4 w-full"
            onClick={() => {
              onEditingChange(!isEditing);
              onOpenChange(false);
            }}
          >
            {isEditing ? "Finish reordering" : "Reorder dashboard"}
          </Button>
        </SheetHeader>

        <div className="dashboard-scroll h-full space-y-6 overflow-y-auto px-6 py-5">
          <ManageViewsSection
            title="On Dashboard"
            description="These charts are currently on the main canvas."
            charts={visibleCharts}
            allCharts={charts}
            visibleCount={visibleCharts.length}
          />
          <ManageViewsSection
            title="Saved but Hidden"
            description="Bring these views back when you need them."
            charts={hiddenCharts}
            allCharts={charts}
            visibleCount={visibleCharts.length}
          />
          <ManageViewsSection
            title="Pinned"
            description="Pinned charts stay off limits for automatic replacements."
            charts={pinnedCharts}
            allCharts={charts}
            visibleCount={visibleCharts.length}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Dashboard() {
  const { t } = useTranslation();
  const datasetId = useDashboardStore((snapshot) => snapshot.datasetId);
  const charts = useDashboardStore((snapshot) => snapshot.charts);
  const kpiConfigs = useDashboardStore((snapshot) => snapshot.kpis);
  const columns = useDashboardStore((snapshot) => snapshot.columns);
  const fileName = useDashboardStore((snapshot) => snapshot.fileName);
  const [isManageViewsOpen, setIsManageViewsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingChart, setIsGeneratingChart] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [dateRange, setDateRange] = useState<DashboardDateRange | null>(null);
  const { rows } = useDashboardTrust(dateRange);

  useEffect(() => onChartGenerating(setIsGeneratingChart), []);
  useEffect(() => setDateRange(null), [datasetId]);

  const orderedCharts = useMemo(
    () => [...charts].sort((left, right) => left.order - right.order),
    [charts],
  );
  const visibleCharts = useMemo(
    () =>
      orderedCharts.filter(
        (chart) => isChartVisible(chart) && hasRenderableChartData(chart, rows),
      ),
    [orderedCharts, rows],
  );
  const isLoading =
    Boolean(datasetId) && (kpiConfigs.length === 0 || charts.length === 0);

  const kpiCards = useMemo(() => {
    // Use all backend-generated KPIs (including AI primary) directly
    const backendCards = kpiConfigs.slice(0, 4).map((kpi) => ({
      id: kpi.id,
      icon: getKpiIcon(kpi),
      value: formatMetric(computeKpiValue(kpi, rows), kpi.column),
      label: kpi.label,
      description: kpi.description,
      eyebrow: kpi.isPrimary
        ? "Primary KPI"
        : formatAggregationLabel(kpi.aggregation),
      isPrimary: kpi.isPrimary,
      columnName: kpi.column,
      // Real comparison: current period vs. the immediately preceding
      // equal-length period, derived from the dataset's date column. Never
      // fabricated — null when there's no date basis or too few periods.
      trend: computeKpiTrend(kpi, rows, columns),
    }));

    // Only fill with fallback cards if backend returned fewer than 4
    if (backendCards.length < 4) {
      const fallbackCards = deriveFallbackCards(rows).filter(
        (fallback) => !backendCards.some((card) => card.id === fallback.id),
      );
      return [
        ...backendCards,
        ...fallbackCards.map((fallback, index) => ({
          ...fallback,
          eyebrow: index === 0 ? "Fallback KPI" : "Reference Metric",
          isPrimary: false,
          columnName: undefined as string | undefined,
          trend: null,
        })),
      ].slice(0, 4);
    }

    return backendCards;
  }, [kpiConfigs, rows, columns]);

  // KPI cards backed by a persisted KPIConfig participate in the sortable
  // Apple-widget canvas (drag-to-reorder + size control). Fallback cards
  // (sparse datasets with <4 backend KPIs, no backing config) render fixed
  // at medium size, after the sortable widgets.
  const sortableKpiCards = useMemo(
    () =>
      kpiCards
        .map((card) => ({
          card,
          config: kpiConfigs.find((kpi) => kpi.id === card.id),
        }))
        .filter(
          (
            entry,
          ): entry is { card: (typeof kpiCards)[number]; config: KPIConfig } =>
            Boolean(entry.config),
        ),
    [kpiCards, kpiConfigs],
  );
  const fallbackKpiCards = useMemo(
    () =>
      kpiCards.filter((card) => !kpiConfigs.some((kpi) => kpi.id === card.id)),
    [kpiCards, kpiConfigs],
  );

  // Unified widget order: KPIs (by their own `order`) first, then visible
  // charts (by their own `order`). Drag-to-reorder re-derives both sequences
  // from the combined drop order via `reorderWidgets`.
  const sortedKpiEntries = useMemo(
    () =>
      [...sortableKpiCards].sort(
        (left, right) => left.config.order - right.config.order,
      ),
    [sortableKpiCards],
  );
  const widgetIds = useMemo(
    () => [
      ...sortedKpiEntries.map((entry) => entry.card.id),
      ...visibleCharts.map((chart) => chart.id),
    ],
    [sortedKpiEntries, visibleCharts],
  );

  // The canvas trait resolver selects content density and column spans. The
  // grid itself remains fluid within the available dashboard width.
  const { ref: canvasRef, tier } = useCanvasTier<HTMLDivElement>();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setIsInteracting(false);
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }
      const oldIndex = widgetIds.indexOf(String(active.id));
      const newIndex = widgetIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) {
        return;
      }
      reorderWidgets(arrayMove(widgetIds, oldIndex, newIndex));
    },
    [widgetIds],
  );

  function DashboardHeader({
    isManageViewsOpen: manageViewsOpen,
    setIsManageViewsOpen: setManageViewsOpen,
  }: {
    isManageViewsOpen: boolean;
    setIsManageViewsOpen: (fn: (c: boolean) => boolean) => void;
  }) {
    const activeDashboardId = useDashboardStore((s) => s.activeDashboardId);
    const activeDashboardName = useDashboardStore((s) => s.activeDashboardName);
    const activeDashboardIcon = useDashboardStore((s) => s.activeDashboardIcon);
    const allDashboards = useDashboardStore((s) => s.dashboardList);
    const title =
      activeDashboardName ??
      (fileName ? titleFromFileName(fileName) : "Dashboard");
    const subtitle = fileName
      ? `Generated from ${fileName}`
      : "Upload a dataset to generate charts and KPIs";

    const [createOpen, setCreateOpen] = useState(false);

    async function handleSwitch(dash: DashboardListItem) {
      // Try local cache first for instant switch
      const cached = getCachedDashboard(dash.id);
      if (cached) {
        restoreCachedDashboard(cached);
        setActiveDashboard(dash);
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
      try {
        const created = await createDashboard(input);
        setActiveDashboard({
          id: created.id,
          name: created.name,
          icon: created.icon,
          color: created.color,
        });
        setDashboardList([
          created,
          ...allDashboards.filter((dashboard) => dashboard.id !== created.id),
        ]);
      } catch {
        // silent
      }
    }

    return (
      <>
        <div className="flex shrink-0 flex-col gap-5 px-6 pb-5 pt-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-1.5 max-w-[52rem] truncate text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="tabular-nums">
                {rows.length.toLocaleString()} {t("dash.rows")}
              </span>
            </div>

            <DashboardSwitcher
              dashboards={allDashboards}
              activeDashboardId={activeDashboardId}
              activeDashboardName={activeDashboardName}
              activeDashboardIcon={activeDashboardIcon}
              fallbackLabel={fileName ?? "No dashboard"}
              triggerClassName="h-9 rounded-xl border border-border bg-card px-4 text-[13px] text-foreground hover:bg-accent hover:text-foreground"
              contentClassName="rounded-lg border border-border bg-popover shadow-overlay"
              onSwitchDashboard={(dashboard) => {
                void handleSwitch(dashboard);
              }}
              onCreateDashboard={() => setCreateOpen(true)}
            />

            <Button
              type="button"
              onClick={() => setManageViewsOpen((current) => !current)}
              variant={manageViewsOpen ? "secondary" : "default"}
              size="lg"
              aria-label="Customize dashboard"
            >
              <LayoutPanelLeft className="me-2 h-4 w-4" />
              Customize
            </Button>
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
      <div className="flex h-full items-center justify-center bg-background p-8">
        <Card className="px-10 py-12">
          <EmptyState
            icon={<LayoutPanelLeft className="h-7 w-7" />}
            title="Upload a dataset to begin"
            description="Your dashboard will render directly from centralized chart and KPI state."
            action={
              <Button
                variant="primary-accent"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Choose a file
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <DashboardHeader
            isManageViewsOpen={isManageViewsOpen}
            setIsManageViewsOpen={setIsManageViewsOpen}
          />
          <div className="px-5 pb-4">
            <DashboardTrustControls
              range={dateRange}
              onRangeChange={setDateRange}
            />
          </div>
          <ManageViewsSheet
            open={isManageViewsOpen}
            onOpenChange={setIsManageViewsOpen}
            charts={orderedCharts}
            isEditing={isEditing}
            onEditingChange={setIsEditing}
          />

          <div ref={canvasRef} className="px-5 pb-6">
            {widgetIds.length === 0 && fallbackKpiCards.length === 0 ? (
              <Card className="transition-ui flex h-full min-h-[320px] items-center justify-center px-6 hover:shadow-premium">
                <EmptyState
                  icon={<LayoutPanelLeft className="h-7 w-7" />}
                  title="No visible charts"
                  description="Re-enable a hidden chart to bring the dashboard back into view."
                  action={
                    <Button
                      type="button"
                      variant="primary-accent"
                      onClick={() =>
                        setIsManageViewsOpen((current) => !current)
                      }
                    >
                      <LayoutPanelLeft className="mr-2 h-4 w-4" />
                      Manage Views
                    </Button>
                  }
                />
              </Card>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={() => setIsInteracting(true)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={widgetIds}
                  strategy={rectSortingStrategy}
                >
                  <div style={canvasGridStyle(tier)}>
                    {sortedKpiEntries.map(({ card, config }) => {
                      // The primary KPI honours its configured size like any
                      // other. Forcing it to "medium" overrode the dashboard's
                      // own composition: a 2×1 primary beside three 1×1 tiles
                      // is five column-units on a four-column canvas, which
                      // pushed a tile onto the next row and stranded the
                      // fourth column. Primacy is carried by the value's type
                      // scale, not by the tile's footprint.
                      const presentationSize = kpiPresentationSize(
                        config.size,
                        card.trend,
                      );
                      return (
                      <SortableWidget
                        key={card.id}
                        id={card.id}
                        size={presentationSize}
                        tier={tier}
                      >
                        {(drag) => (
                          <KpiCard
                            icon={card.icon}
                            value={card.value}
                            label={card.label}
                            eyebrow={card.eyebrow}
                            isPrimary={card.isPrimary}
                            trend={card.trend}
                            columnName={card.columnName}
                            size={presentationSize}
                            tier={tier}
                            chrome={
                              isEditing ? (
                                <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
                                  <div
                                    {...drag.attributes}
                                    {...drag.listeners}
                                    className="widget-drag-handle flex h-7 w-7 cursor-grab items-center justify-center rounded-full bg-card/90 text-[var(--color-text-muted)] shadow-card backdrop-blur active:cursor-grabbing"
                                    aria-label={`Drag to move ${card.label}`}
                                  >
                                    <GripVertical className="h-3.5 w-3.5" />
                                  </div>
                                </div>
                              ) : null
                            }
                          />
                        )}
                      </SortableWidget>
                      );
                    })}
                    {visibleCharts.map((chart) => (
                      <SortableWidget
                        key={chart.id}
                        id={chart.id}
                        size={chart.size}
                        tier={tier}
                      >
                        {(drag) => (
                          <DashboardChartCard
                            chart={chart}
                            rows={rows}
                            tier={tier}
                            isEditing={isEditing}
                            isInteracting={isInteracting}
                            dragHandleProps={drag}
                          />
                        )}
                      </SortableWidget>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {fallbackKpiCards.length > 0 ? (
              <div className="mt-5" style={canvasGridStyle(tier)}>
                {fallbackKpiCards.map((card) => {
                  const presentationSize = "medium";
                  const spans = widgetSpans(presentationSize, tier);
                  return (
                    <div
                      key={card.id}
                      style={{
                        gridColumn: `span ${spans.cols}`,
                        gridRow: `span ${spans.rows}`,
                      }}
                    >
                      <KpiCard
                        icon={card.icon}
                        value={card.value}
                        label={card.label}
                        eyebrow={card.eyebrow}
                        isPrimary={card.isPrimary}
                        trend={card.trend}
                        size={presentationSize}
                        tier={tier}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
            {isGeneratingChart ? (
              <div className="mt-5" style={canvasGridStyle(tier)}>
                <div
                  style={{
                    gridColumn: `span ${widgetSpans("large", tier).cols}`,
                    gridRow: `span ${widgetSpans("large", tier).rows}`,
                  }}
                >
                  <GeneratingChartCard />
                </div>
              </div>
            ) : null}
            {isEditing && !isGeneratingChart ? (
              <div className="mt-5" style={canvasGridStyle(tier)}>
                <div
                  style={{
                    gridColumn: `span ${widgetSpans("large", tier).cols}`,
                    gridRow: `span ${widgetSpans("large", tier).rows}`,
                  }}
                >
                  <AddChartTile />
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
