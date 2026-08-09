import type {
  ChartConfig,
  ChartSize,
  ChartType,
  KPIConfig,
} from "@/shared/contracts";
import { WIDGET_SIZE_SUPPORT, supportsSize } from "@/shared/contracts";

export type WidgetType = "kpi" | ChartType;
export type SizeClass = ChartSize;

/**
 * Geometry single source of truth for widget content. The canvas itself is
 * fluid; these tier constants keep chart internals deterministic without
 * requiring every chart to measure its container.
 */

export const ROW_UNIT = 172;
export const GRID_GAP = 12;

/** Uniform grid geometry per size class — identical for every widget type. */
export const CLASS_SPANS: Record<SizeClass, { cols: number; rows: number }> = {
  small: { cols: 1, rows: 1 },
  medium: { cols: 2, rows: 1 },
  large: { cols: 2, rows: 2 },
  xlarge: { cols: 4, rows: 2 },
};

export { WIDGET_SIZE_SUPPORT, supportsSize };

/**
 * Canvas tiers — the web analog of Apple's device families. A single
 * observer on the canvas (the "trait resolver", `useCanvasTier`) maps the
 * available width to one of these; every widget dimension becomes a lookup.
 */
export type CanvasTier = "t1" | "t2" | "t3" | "t4";

export const TIERS: Record<CanvasTier, { columns: 1 | 2 | 4; cell: number }> = {
  // 280px fits a 320px viewport after the dashboard's 20px side padding.
  t1: { columns: 1, cell: 280 },
  t2: { columns: 2, cell: 300 },
  t3: { columns: 4, cell: 236 },
  t4: { columns: 4, cell: 300 },
};

export function resolveTier(availableWidth: number): CanvasTier {
  // The observed wrapper includes 20px horizontal padding on each side.
  if (availableWidth >= 1340) return "t4";
  if (availableWidth >= 1044) return "t3";
  if (availableWidth >= 660) return "t2";
  return "t1";
}

/**
 * The size class actually RENDERED at a tier. Below 4-column tiers an
 * xlarge widget renders its large view (the stored size is untouched); the
 * span clamp below handles the narrower columns.
 */
export function resolveRenderClass(
  size: SizeClass,
  tier: CanvasTier,
): SizeClass {
  if (size === "xlarge" && TIERS[tier].columns < 4) {
    return "large";
  }
  return size;
}

/** Grid spans for a widget at a tier (cols clamped to the tier's columns —
 * CSS would otherwise create implicit columns instead of clamping). */
export function widgetSpans(
  size: SizeClass,
  tier: CanvasTier,
): { cols: number; rows: number } {
  const span = CLASS_SPANS[resolveRenderClass(size, tier)];
  return { cols: Math.min(span.cols, TIERS[tier].columns), rows: span.rows };
}

/** Outer pixel dimensions of a widget card at a tier. */
export function widgetDimensions(
  size: SizeClass,
  tier: CanvasTier,
): { width: number; height: number } {
  const { cols, rows } = widgetSpans(size, tier);
  const { cell } = TIERS[tier];
  return {
    width: cols * cell + (cols - 1) * GRID_GAP,
    height: rows * ROW_UNIT + (rows - 1) * GRID_GAP,
  };
}

/** Horizontal card padding (px-6 on each side). */
export const CARD_PAD_X = 24;

/** Fixed chart plot heights per render class: card height minus the class's
 * fixed chrome budget (header + vertical padding). `small` has no plot —
 * it renders the type's headline (KPI) substitution. */
export const CHART_PLOT_HEIGHT: Record<Exclude<SizeClass, "small">, number> = {
  medium: 96,
  large: 232,
  xlarge: 232,
};

/** Fixed plot box for a chart widget. Everything Recharts renders into is
 * this constant box — numeric props, no ResponsiveContainer. */
export function chartPlotBox(
  size: Exclude<SizeClass, "small">,
  tier: CanvasTier,
): { width: number; height: number } {
  const render = resolveRenderClass(size, tier) as Exclude<SizeClass, "small">;
  return {
    width: widgetDimensions(size, tier).width - CARD_PAD_X * 2,
    height: CHART_PLOT_HEIGHT[render],
  };
}

/** "kpi" for KPI widgets, otherwise the chart's type. */
export function widgetType(widget: ChartConfig | KPIConfig): WidgetType {
  return "type" in widget ? widget.type : "kpi";
}
