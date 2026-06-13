"use client";

import { type Key, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  Check,
  Eye,
  Pencil,
  EyeOff,
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
} from "@dnd-kit/sortable";
import type { ChartConfig, KPIConfig, SerializedRow } from "@/shared/contracts";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  computeKpiValue,
  formatNumber as legacyFormatNumber,
  hasRenderableChartData,
  isChartVisible,
} from "@/features/dashboard/client/runtime";
import { calculateLayout } from "@/features/dashboard/client/layout";
import {
  promoteHiddenChart,
  reorderCharts,
  removeChart,
  setChartVisibility,
  toggleChartPinned,
  useDashboardStore,
  initializeDashboardStore,
  setActiveDashboard,
  getCachedDashboard,
  setDashboardList,
  restoreCachedDashboard,
} from "@/features/dashboard/client/store";
import {
  listDashboards,
  loadDashboard,
  createDashboard,
} from "@/shared/lib/api";
import CreateDashboardModal from "@/features/dashboard/components/CreateDashboardModal";
import { DashboardSwitcher } from "@/features/dashboard/components/DashboardSwitcher";
import { DashboardChartCard } from "@/features/dashboard/components/DashboardChartCard";
import { useTranslation } from "@/shared/i18n";
import type { DashboardListItem } from "@/shared/contracts";
import { BI_RULE_LIMITS } from "@/shared/contracts";
import {
  DASHBOARD_COLORS,
  formatAggregationLabel,
  resolveKpiIcon,
} from "@/features/dashboard/client/design";
import {
  detectCurrencySymbol,
  formatCurrency,
  formatDateIL,
  looksLikeCurrencyColumn,
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

/** Pick a KPI value font size that keeps long values from overflowing. */
function kpiValueSizeClass(value: string | number): string {
  const visibleLength = String(value).replace(BIDI_MARKS, "").length;
  if (visibleLength > 16) return "text-xl sm:text-2xl";
  if (visibleLength > 12) return "text-2xl sm:text-3xl";
  if (visibleLength > 9) return "text-3xl sm:text-4xl";
  return "text-4xl sm:text-5xl";
}

/** Non-primary KPI cards cycle through these soft mesh surfaces. */
const SECONDARY_MESH_CLASSES = [
  "mesh-blue",
  "mesh-teal",
  "mesh-violet",
] as const;

function KpiCard({
  icon: Icon,
  value,
  label,
  description,
  eyebrow,
  isPrimary = false,
  meshClassName,
}: {
  key?: Key;
  icon: LucideIcon;
  value: string | number;
  label: string;
  description: string;
  eyebrow: string;
  isPrimary?: boolean;
  meshClassName: string;
}) {
  const displayValue = formatMetric(value);

  return (
    <Card
      className={`dashboard-hover relative overflow-hidden rounded-[20px] border-0 shadow-premium ${meshClassName} ${
        isPrimary
          ? "text-white"
          : "border border-[var(--color-border)] text-[var(--color-text-primary)]"
      }`}
    >
      <CardContent className="relative flex min-h-[184px] flex-col justify-between overflow-hidden p-6">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isPrimary
                ? "bg-white/10 text-white"
                : "bg-[rgba(0,50,125,0.08)] text-[var(--color-accent)] dark:bg-white/10"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <p
            className={`truncate text-sm font-semibold ${
              isPrimary ? "text-white/70" : "text-[var(--color-text-secondary)]"
            }`}
          >
            {label}
          </p>
        </div>

        <div className="relative z-10 mt-4 min-w-0">
          <div
            className={`display-number truncate ${kpiValueSizeClass(
              displayValue,
            )} ${isPrimary ? "text-white" : "text-[var(--color-text-primary)]"}`}
          >
            {displayValue}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                isPrimary
                  ? "bg-white/10 text-white"
                  : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
              }`}
            >
              {eyebrow}
            </span>
          </div>

          <p
            className={`mt-3 line-clamp-2 max-w-[16rem] text-[12px] leading-5 ${
              isPrimary ? "text-white/70" : "text-[var(--color-text-secondary)]"
            }`}
          >
            {description}
          </p>
        </div>

        <Icon
          strokeWidth={1.5}
          className={`pointer-events-none absolute -bottom-5 -right-5 h-24 w-24 ${
            isPrimary
              ? "text-white/10"
              : "text-[rgba(0,50,125,0.06)] dark:text-white/[0.04]"
          }`}
        />
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center bg-card px-5" />
      <div className="grid grid-cols-1 gap-5 px-5 py-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={index}
            className="overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-card"
          >
            <CardContent className="p-6">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="mt-4 h-3 w-20 rounded-full" />
              <Skeleton className="mt-3 h-6 w-24 rounded-full" />
              <Skeleton className="mt-2 h-3 w-28 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex-1 px-5 pb-4">
        <Card className="h-full rounded-2xl border border-[var(--color-border)] bg-card">
          <Skeleton className="h-full w-full rounded-2xl" />
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
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          {title}
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {description}
        </p>
      </div>

      <div className="space-y-2">
        {charts.map((chart, index) => {
          const visible = isChartVisible(chart);
          const canHide = visibleCount > BI_RULE_LIMITS.minCharts;
          const canDelete = !visible || canHide;

          return (
            <div
              key={chart.id}
              className="rounded-[20px] bg-[var(--color-surface-muted)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Badge className="rounded-full border-0 bg-[#e6e8ea] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)] hover:bg-[#e6e8ea]">
                      {chart.type}
                    </Badge>
                    <Badge
                      className={`rounded-full border-0 px-2 py-0.5 text-[10px] font-semibold ${
                        visible
                          ? "bg-[rgba(0,50,125,0.12)] text-[var(--color-accent)] hover:bg-[rgba(0,50,125,0.12)]"
                          : "bg-[#e6e8ea] text-[var(--color-text-secondary)] hover:bg-[#e6e8ea]"
                      }`}
                    >
                      {visible ? "visible" : "hidden"}
                    </Badge>
                    {chart.pinned ? (
                      <Badge className="rounded-full border-0 bg-[#e6e8ea] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)] hover:bg-[#e6e8ea]">
                        pinned
                      </Badge>
                    ) : null}
                    {chart.chatbotGenerated ? (
                      <Badge className="rounded-full border-0 bg-[rgba(0,50,125,0.12)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)] hover:bg-[rgba(0,50,125,0.12)]">
                        suggested
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate font-display text-sm font-semibold text-[var(--color-text-primary)]">
                    {chart.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-[var(--color-text-secondary)]">
                    {chart.insight}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-[var(--color-text-muted)] hover:bg-card hover:text-[var(--color-text-primary)]"
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
                      className="h-8 w-8 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
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
                      className="h-8 w-8 rounded-full text-[var(--color-text-muted)] hover:bg-card hover:text-[var(--color-text-primary)]"
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
                    className="h-8 w-8 rounded-full text-[var(--color-text-muted)] hover:bg-card hover:text-[var(--color-text-primary)]"
                    onClick={() => removeChart(chart.id)}
                    disabled={!canDelete}
                    aria-label={`Remove ${chart.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {!visible && replaceTargetFor === chart.id ? (
                <div className="mt-3 rounded-[16px] bg-card p-3">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Replace one visible chart to show this view:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {replaceableCharts.map((candidate) => (
                      <Button
                        key={candidate.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full border border-transparent bg-[var(--color-surface-muted)] px-3 text-xs text-[var(--color-text-primary)] hover:bg-card"
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charts: ChartConfig[];
}) {
  const visibleCharts = charts.filter(isChartVisible);
  const hiddenCharts = charts.filter((chart) => !isChartVisible(chart));
  const pinnedCharts = charts.filter((chart) => chart.pinned);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[420px] border-0 bg-[var(--color-bg)] p-0 sm:max-w-[420px]"
      >
        <SheetHeader className="px-6 py-5 text-left">
          <SheetTitle className="font-display text-[var(--color-text-primary)]">
            Manage Views
          </SheetTitle>
          <SheetDescription>
            Keep the main canvas readable while saving alternate chart views.
          </SheetDescription>
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
  const rows = useDashboardStore((snapshot) => snapshot.rows);
  const charts = useDashboardStore((snapshot) => snapshot.charts);
  const kpiConfigs = useDashboardStore((snapshot) => snapshot.kpis);
  const fileName = useDashboardStore((snapshot) => snapshot.fileName);
  const [isManageViewsOpen, setIsManageViewsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
        (chart) => isChartVisible(chart) && hasRenderableChartData(chart, rows),
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
      value: formatMetric(computeKpiValue(kpi, rows), kpi.column),
      label: kpi.label,
      description: kpi.description,
      eyebrow: kpi.isPrimary
        ? "Primary KPI"
        : formatAggregationLabel(kpi.aggregation),
      isPrimary: kpi.isPrimary,
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
        })),
      ].slice(0, 4);
    }

    return backendCards;
  }, [kpiConfigs, rows]);

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

    const fetchDashboards = useCallback(async () => {
      try {
        const items = await listDashboards();
        setDashboardList(items);
      } catch {
        // silent
      }
    }, []);

    useEffect(() => {
      void fetchDashboards();
    }, [fetchDashboards]);

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
        <div className="flex shrink-0 flex-col gap-4 px-5 pb-5 pt-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="font-display text-[32px] font-black tracking-[-0.045em] text-[var(--color-text-primary)] sm:text-[36px]">
              {title}
            </div>
            <p className="mt-1.5 max-w-[52rem] truncate text-sm text-[var(--color-text-secondary)]">
              {subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--color-border)] bg-card px-4 text-sm font-medium text-[var(--color-text-secondary)]">
              <CalendarDays className="h-4 w-4 text-[var(--color-accent)]" />
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
              triggerClassName="h-10 rounded-full border border-[var(--color-border)] bg-card px-4 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
              contentClassName="rounded-[20px] border border-[var(--color-border)] bg-card shadow-[0_32px_64px_-42px_rgba(25,28,30,0.18)]"
              onSwitchDashboard={(dashboard) => {
                void handleSwitch(dashboard);
              }}
              onCreateDashboard={() => setCreateOpen(true)}
            />

            <Button
              type="button"
              onClick={() => setIsEditing((current) => !current)}
              variant="outline"
              aria-pressed={isEditing}
              className={`h-10 rounded-full border px-4 text-sm font-semibold transition ${
                isEditing
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                  : "border-[var(--color-border)] bg-card text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
              }`}
            >
              {isEditing ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t("dash.done")}
                </>
              ) : (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("dash.edit")}
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={() => setManageViewsOpen((current) => !current)}
              className={`h-10 rounded-full px-4 text-sm font-semibold text-white transition ${
                manageViewsOpen
                  ? "bg-[#191c1e]"
                  : "bg-[var(--color-accent)] hover:bg-[#0047ab]"
              }`}
              style={{
                boxShadow: `0 24px 48px -28px ${DASHBOARD_COLORS.primary}88`,
              }}
              variant="default"
              aria-label="Open manage views"
            >
              <LayoutPanelLeft className="mr-2 h-4 w-4" />
              {t("dash.manageViews")}
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
      <div className="flex h-full items-center justify-center bg-[var(--color-bg)] p-8">
        <Card className="flex flex-col items-center rounded-[24px] border-0 bg-card px-10 py-12 text-center shadow-[0_22px_52px_-38px_rgba(25,28,30,0.14)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[rgba(0,50,125,0.08)] text-[var(--color-accent)]">
            <LayoutPanelLeft className="h-7 w-7" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold text-[var(--color-text-primary)]">
            Upload a dataset to begin
          </h1>
          <p className="mt-3 max-w-sm text-base text-[var(--color-text-secondary)]">
            Your dashboard will render directly from centralized chart and KPI
            state.
          </p>
          <Button
            className="mt-8 rounded-full bg-[var(--color-accent)] px-5 hover:bg-[#0047ab]"
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
    <div className="flex min-h-full flex-col">
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <DashboardHeader
            isManageViewsOpen={isManageViewsOpen}
            setIsManageViewsOpen={setIsManageViewsOpen}
          />
          <ManageViewsSheet
            open={isManageViewsOpen}
            onOpenChange={setIsManageViewsOpen}
            charts={orderedCharts}
          />

          <div className="grid shrink-0 grid-cols-1 gap-5 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
            {kpiCards.map((card, index) => (
              <KpiCard
                key={card.id}
                icon={card.icon}
                value={card.value}
                label={card.label}
                description={card.description}
                eyebrow={card.eyebrow}
                isPrimary={card.isPrimary}
                meshClassName={
                  card.isPrimary
                    ? "mesh-navy"
                    : SECONDARY_MESH_CLASSES[
                        index % SECONDARY_MESH_CLASSES.length
                      ]
                }
              />
            ))}
          </div>

          <div className="px-5 pb-6">
            {layoutItems.length === 0 ? (
              <Card className="flex h-full min-h-[320px] items-center justify-center rounded-[24px] border-0 bg-card shadow-[0_22px_52px_-38px_rgba(25,28,30,0.14)]">
                <div className="flex flex-col items-center px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[rgba(0,50,125,0.08)] text-[var(--color-accent)]">
                    <LayoutPanelLeft className="h-7 w-7" />
                  </div>
                  <h2 className="mt-6 font-display text-2xl font-bold text-[var(--color-text-primary)]">
                    No visible charts
                  </h2>
                  <p className="mt-2 max-w-sm text-sm text-[var(--color-text-secondary)]">
                    Re-enable a hidden chart to bring the dashboard back into
                    view.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setIsManageViewsOpen((current) => !current)}
                    className="mt-6 h-10 rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-white hover:bg-[#0047ab]"
                  >
                    <LayoutPanelLeft className="mr-2 h-4 w-4" />
                    Manage Views
                  </Button>
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
                  <div className="grid h-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12 xl:gap-6">
                    {layoutItems.map((chart) => (
                      <div
                        key={chart.id}
                        className={
                          chart.colSpan === 12
                            ? "md:col-span-2 xl:col-span-12"
                            : chart.colSpan >= 8
                              ? "md:col-span-2 xl:col-span-8"
                              : chart.colSpan === 6
                                ? "md:col-span-2 xl:col-span-6"
                                : "md:col-span-1 xl:col-span-4"
                        }
                      >
                        <DashboardChartCard
                          chart={chart}
                          rows={rows}
                          isEditing={isEditing}
                        />
                      </div>
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
