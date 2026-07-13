import { DASHBOARD_COLORS } from "@/features/dashboard/client/design";

/** Single source of truth for the premium chart visual language. Shared by
 * every `charts/*` view so the live dashboard and the (separate) showcase
 * page render identical chart styling. */

/** Monochrome blue ramp (ordered/sequential data). */
export const CHART_PALETTE = DASHBOARD_COLORS.chartPalette;

/** Cohesive, blue-led but DISTINGUISHABLE palette for categorical part-to-whole
 * (donut slices). A pure blue ramp makes adjacent slices blend, so we keep blue
 * dominant but give each slice a clear hue/lightness step within a calm cool
 * family. Ordered most→least salient to match the value-sorted series. */
export const CATEGORICAL_PALETTE = [
  "#00327d", // deep brand blue
  "#2f6df6", // bright blue
  "#22b8cf", // cyan
  "#6366f1", // indigo
  "#5ec5a8", // teal-green
  "#94a3b8", // slate (good "Other" bucket)
] as const;

/** Muted text color for direct data labels on bars. */
export const CHART_LABEL_COLOR = "var(--color-text-secondary)";

/** Deep brand blue — used for the strongest accents (max bar, etc). */
export const ACCENT = "#00327d";

/** Bright accent — area stroke, scatter dots, gradients. */
export const ACCENT_BRIGHT = "#2f6df6";

/** Theme-aware faint hairline grid color. */
export const CHART_GRID_COLOR = "var(--color-chart-grid)";

/** Theme-aware muted axis tick color. */
export const CHART_AXIS_COLOR = "var(--color-chart-axis)";

/** Light ramp stop used for "ghost" bars / faint bar tracks. */
export const BAR_TINT_COLOR = "var(--color-accent-light)";

export const CHART_ANIMATION_DURATION = 400;
export const CHART_ANIMATION_EASING = "ease-out";

/** Shared cartesian axis width so margins/labels line up across charts. */
export const Y_AXIS_WIDTH = 60;

/** Shared margins for cartesian (area/bar) charts. */
export const CARTESIAN_MARGIN = { top: 12, right: 12, left: 0, bottom: 4 };

/** Margin for horizontal bar charts (extra left space for category labels). */
export const HORIZONTAL_BAR_MARGIN = { top: 4, right: 16, left: 8, bottom: 4 };

/** Margin for vertical bar charts (extra left space for Y-axis ticks). */
export const VERTICAL_BAR_MARGIN = { top: 12, right: 12, left: 8, bottom: 4 };

/** Royal-Blue brand gradient (top brighter, bottom deeper), used for area
 * fills and scatter dot gradients. */
export const GRADIENT_PRIMARY_STOPS: [string, string] = [
  ACCENT_BRIGHT,
  ACCENT,
];

/** Muted gray dashed stroke for an optional comparison/previous series. */
export const COMPARISON_STROKE_COLOR = "var(--color-text-muted)";

/** Builds a stable, chart-scoped gradient/filter id so multiple charts on
 * the same page never collide (SVG ids are global to the document). */
export function gradientId(chartId: string, name: string): string {
  return `chart-${chartId}-${name}`;
}

/** Soft accent glow applied to area strokes, bar fills, and scatter dots via
 * an `feDropShadow` filter — low blur + low opacity so it reads as a gentle
 * lift rather than a heavy halo, in both themes. */
export const CHART_GLOW_BLUR = 4;
export const CHART_GLOW_OPACITY = 0.35;

/** Categorical axes with few categories show every tick (no skipping); past
 * this count, fall back to gap-based tick thinning. */
export const LOW_CARDINALITY_THRESHOLD = 6;

/** Donut ring radii as percentages of the container's bounding box. Recharts
 * resolves these against the rendered <ResponsiveContainer> size on every
 * layout pass, so the ring always fits without needing a ResizeObserver. */
export const DONUT_OUTER_RADIUS = "85%";
export const DONUT_INNER_RADIUS = "62%";
