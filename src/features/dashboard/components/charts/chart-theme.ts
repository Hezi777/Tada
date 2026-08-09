/** Single source of truth for the premium chart visual language. Shared by
 * every `charts/*` view so the live dashboard and the (separate) showcase
 * page render identical chart styling. */

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

/** Bright brand blue for primary data. */
export const ACCENT_BRIGHT = "#2f6df6";

/** Warm signal is reserved for comparison and selected marks. */
export const SIGNAL = "#f06449";

export const ECHARTS_TEXT = "#737985";
export const ECHARTS_INK = "#17191d";
export const ECHARTS_GRID = "#e7e9ed";
/** Muted gray dashed stroke for an optional comparison/previous series. */
export const COMPARISON_STROKE_COLOR = "var(--color-text-muted)";

// ── Size-class constants (docs/WIDGET_SIZING.md) ──
// Chart render classes are medium/large/xlarge; `small` renders a headline
// (KPI) substitution and never reaches these tables.

export type ChartRenderClass = "medium" | "large" | "xlarge";

/** Fixed donut ring radii in px per render class — never derived from the
 * container. Floors: outer Ø ≥ 96px, inner Ø ≥ 56px for a center label. */
export const DONUT_RADII: Record<
  "medium" | "large",
  { outer: number; inner: number }
> = {
  medium: { outer: 48, inner: 30 },
  // Ø160 leaves two fixed chip-legend rows inside the large plot box (232px).
  large: { outer: 80, inner: 50 },
};

/** Bar thickness cap per render class (replaces the fluid colSpan-derived
 * cap); the floor everywhere is 8px. */
export const MAX_BAR_SIZE: Record<ChartRenderClass, number> = {
  medium: 32,
  large: 48,
  xlarge: 56,
};

/** Bar category budgets per render class: KEPT categories (an Other bucket
 * adds one more when the data exceeds the budget), per the degradation
 * contract: reduce data, never shrink text. */
export const BAR_CATEGORY_BUDGET: Record<
  ChartRenderClass,
  { vertical: number; horizontal: number }
> = {
  medium: { vertical: 5, horizontal: 3 },
  large: { vertical: 8, horizontal: 8 },
  xlarge: { vertical: 12, horizontal: 12 },
};

/** Donut slice budgets (incl. the Other bucket). */
export const DONUT_SLICE_BUDGET: Record<"medium" | "large", number> = {
  medium: 5, // ring + top-3 label rows: 4 + Other
  large: 6, // BI_RULE_LIMITS.maxDonutSegments
};

/** Category-label truncation budgets (chars) per render class; full text
 * always available in the tooltip. Bidi-safe via `truncateLabel`. */
export const LABEL_TRUNCATION: Record<ChartRenderClass, number> = {
  medium: 12,
  large: 22,
  xlarge: 22,
};
