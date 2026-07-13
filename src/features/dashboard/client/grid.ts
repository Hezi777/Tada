import type { ChartConfig, ChartSize, ChartType, KPIConfig } from "@/shared/contracts";

export type WidgetType = "kpi" | ChartType;

/** Discrete {colSpan, rowSpan} preset per widget type + size, for the
 * Apple-widget adaptive grid (lg=4 cols, md=2, sm=1; row unit ~160px,
 * grid-auto-flow: row dense). */
export const WIDGET_SPAN_PRESETS: Record<
  WidgetType,
  Partial<Record<ChartSize, { colSpan: number; rowSpan: number }>>
> = {
  kpi: {
    small: { colSpan: 1, rowSpan: 1 },
    medium: { colSpan: 2, rowSpan: 1 },
    large: { colSpan: 2, rowSpan: 2 },
  },
  area: {
    small: { colSpan: 2, rowSpan: 1 },
    medium: { colSpan: 2, rowSpan: 2 },
    large: { colSpan: 4, rowSpan: 2 },
  },
  bar: {
    small: { colSpan: 2, rowSpan: 1 },
    medium: { colSpan: 2, rowSpan: 2 },
    large: { colSpan: 4, rowSpan: 2 },
  },
  scatter: {
    small: { colSpan: 2, rowSpan: 1 },
    medium: { colSpan: 2, rowSpan: 2 },
    large: { colSpan: 4, rowSpan: 2 },
  },
  donut: {
    medium: { colSpan: 2, rowSpan: 2 },
    large: { colSpan: 2, rowSpan: 3 },
  },
};

/** "kpi" for KPI widgets, otherwise the chart's type. */
export function widgetType(widget: ChartConfig | KPIConfig): WidgetType {
  return "type" in widget ? widget.type : "kpi";
}

/** Tailwind classes for col-span-N / row-span-N, written as static literals
 * so the JIT compiler can find them (no dynamic concatenation). Falls back
 * to the type's smallest available preset if a size has no preset (e.g.
 * donut "small"). */
const COL_SPAN_CLASSES: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  4: "col-span-4",
};

const ROW_SPAN_CLASSES: Record<number, string> = {
  1: "row-span-1",
  2: "row-span-2",
  3: "row-span-3",
};

const FALLBACK_SPAN = { colSpan: 2, rowSpan: 1 };

/** Resolve the {colSpan, rowSpan} -> Tailwind class string for a widget. */
export function spanClassesFor(type: WidgetType, size: ChartSize): string {
  const presets = WIDGET_SPAN_PRESETS[type];
  const preset =
    presets[size] ??
    presets.medium ??
    presets.large ??
    presets.small ??
    FALLBACK_SPAN;

  const colClass = COL_SPAN_CLASSES[preset.colSpan] ?? COL_SPAN_CLASSES[2];
  const rowClass = ROW_SPAN_CLASSES[preset.rowSpan] ?? ROW_SPAN_CLASSES[1];
  return `${colClass} ${rowClass}`;
}
