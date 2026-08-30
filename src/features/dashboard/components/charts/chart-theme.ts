/** Single source of truth for the premium chart visual language. Shared by
 * every `charts/*` view so the live dashboard and the (separate) showcase
 * page render identical chart styling.
 *
 * This is the ONE file allowed to resolve design tokens to literal colour
 * strings — ECharts needs literal values, not CSS variables. Tokens are read
 * from `getComputedStyle(document.documentElement)` at runtime so both
 * themes render correctly, cached per theme, and invalidated whenever the
 * `dark` class on `<html>` changes. */
import { useSyncExternalStore } from "react";

// ── Light-theme fallbacks (used on the server and before hydration) ──
// Mirrors the `:root` block in `src/index.css`.
const LIGHT_FALLBACKS: Record<string, string> = {
  "--chart-1": "221 87% 55%",
  "--chart-2": "199 89% 48%",
  "--chart-3": "250 80% 63%",
  "--chart-4": "168 62% 45%",
  "--chart-5": "220 9% 60%",
  "--chart-neutral": "220 13% 87%",
  "--chart-grid": "220 13% 92%",
  "--chart-axis": "220 9% 55%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "220 13% 10%",
  "--border": "220 13% 89%",
  "--foreground": "220 13% 10%",
  "--muted-foreground": "220 9% 46%",
};

let cachedIsDark: boolean | null = null;
let cachedTokens: Record<string, string> | null = null;
let observerStarted = false;
const themeSubscribers = new Set<() => void>();

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function readToken(name: string): string {
  if (typeof document === "undefined") {
    return LIGHT_FALLBACKS[name] ?? "0 0% 0%";
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || LIGHT_FALLBACKS[name] || "0 0% 0%";
}

/** Starts (once) a MutationObserver on `<html class>` so cached tokens are
 * invalidated — and subscribers (see `useChartColors`) notified to
 * re-render — whenever the app toggles between light and dark. */
function ensureObserver() {
  if (observerStarted || typeof document === "undefined") return;
  observerStarted = true;
  const observer = new MutationObserver(() => {
    const nowDark = isDarkMode();
    if (nowDark !== cachedIsDark) {
      cachedTokens = null;
      cachedIsDark = nowDark;
      for (const notify of themeSubscribers) notify();
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

function tokens(): Record<string, string> {
  ensureObserver();
  const nowDark = isDarkMode();
  if (cachedTokens && cachedIsDark === nowDark) {
    return cachedTokens;
  }
  cachedIsDark = nowDark;
  cachedTokens = {
    "--chart-1": readToken("--chart-1"),
    "--chart-2": readToken("--chart-2"),
    "--chart-3": readToken("--chart-3"),
    "--chart-4": readToken("--chart-4"),
    "--chart-5": readToken("--chart-5"),
    "--chart-neutral": readToken("--chart-neutral"),
    "--chart-grid": readToken("--chart-grid"),
    "--chart-axis": readToken("--chart-axis"),
    "--popover": readToken("--popover"),
    "--popover-foreground": readToken("--popover-foreground"),
    "--border": readToken("--border"),
    "--foreground": readToken("--foreground"),
    "--muted-foreground": readToken("--muted-foreground"),
  };
  return cachedTokens;
}

/** Resolves a CSS custom property (an HSL triplet, unwrapped) to a literal
 * `hsl(...)` colour string usable by ECharts. */
function token(name: string): string {
  return `hsl(${tokens()[name] ?? readToken(name)})`;
}

function subscribeToTheme(onStoreChange: () => void): () => void {
  ensureObserver();
  themeSubscribers.add(onStoreChange);
  return () => themeSubscribers.delete(onStoreChange);
}

type ChartColors = ReturnType<typeof computeChartColors>;
let cachedColors: ChartColors | null = null;
let cachedColorsForTokens: Record<string, string> | null = null;

/** Resolves live theme colours, returning the SAME object reference while
 * the underlying tokens haven't changed — required so `useSyncExternalStore`
 * (see `useChartColors`) doesn't treat every render as a new snapshot. */
function chartColors(): ChartColors {
  const currentTokens = tokens();
  if (cachedColors && cachedColorsForTokens === currentTokens) {
    return cachedColors;
  }
  cachedColorsForTokens = currentTokens;
  cachedColors = computeChartColors();
  return cachedColors;
}

function computeChartColors() {
  return {
    /** Ordered categorical ramp — donut slices only (design-system-v2 §7.2). */
    categorical: [
      token("--chart-1"),
      token("--chart-2"),
      token("--chart-3"),
      token("--chart-4"),
      token("--chart-5"),
    ],
    /** Accent — the ONE highlighted mark (hover/selected/leader). */
    accent: token("--chart-1"),
    /** Default, unhighlighted bar/area/scatter fill. */
    neutral: token("--chart-neutral"),
    grid: token("--chart-grid"),
    axis: token("--chart-axis"),
    popover: token("--popover"),
    popoverForeground: token("--popover-foreground"),
    border: token("--border"),
    foreground: token("--foreground"),
    mutedForeground: token("--muted-foreground"),
  };
}

/** React hook: live-resolved chart colours that re-render the caller when
 * the `dark` class on `<html>` toggles (via `useSyncExternalStore` on the
 * MutationObserver above). Use this instead of calling `chartColors()`
 * directly from a component so theme changes actually repaint the chart. */
export function useChartColors() {
  return useSyncExternalStore(subscribeToTheme, chartColors, () =>
    chartColors(),
  );
}

/** Shared ECharts tooltip chrome matching design-system-v2 §7.5: popover
 * surface, hairline border, rounded, floating shadow, tabular-nums values via
 * the caller's `valueFormatter`. Call from inside a component render so
 * colours track the live theme (see `useChartColors`). */
export function tooltipStyle(colors: ReturnType<typeof chartColors>) {
  return {
    backgroundColor: colors.popover,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: [8, 12],
    extraCssText:
      "box-shadow: 0 8px 24px -8px hsl(220 13% 10% / 0.12), 0 2px 6px -2px hsl(220 13% 10% / 0.06); font-variant-numeric: tabular-nums;",
    textStyle: { color: colors.foreground, fontSize: 12 },
  };
}

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
  medium: { vertical: 5, horizontal: 5 },
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
