# Widget Sizing — Size Classes, Degradation Contract, Per-Type Matrix

Single source of truth for how every dashboard widget (KPI + chart) is sized
and rendered. Supersedes the fluid-resize model (`layout.ts` 12-col engine,
`ResponsiveContainer` measurement, `@container` content gating) and the
"Charts & edit mode" workstream + "Medium chart width" decision point in
`docs/dashboard-polish-audit.md`.

Status: **implemented on `feat/widget-size-classes` in July 2026.** Sections
below document the design contract; use the current code and tests as the
implementation source of truth.

---

## 1. The model

Sizes are **discrete size classes with fixed dimensions** — the Apple
WidgetKit model. A widget never resizes; the app renders a **different view
per size class**. Apple's Small calendar widget is not a shrunken Large one;
it is different content designed for a constant frame.

Hard consequences (these are the contract, not guidelines):

1. **No runtime container measurement.** No `ResizeObserver` on charts, no
   `ResponsiveContainer`, no `@container` queries selecting chart content.
2. **No %-based chart dimensions.** Every chart receives numeric
   `width`/`height` props from a constants table (§3), never `"100%"`.
3. **No auto-height cells.** Rows are a fixed 160px unit; widgets occupy
   whole cells and snap. `grid-auto-flow: row dense` packs them.
4. **View selection by size class, not by measured width.** The `size` prop
   decides what renders. CSS `@sm:`/`@lg:` container gates on widget content
   are replaced by explicit per-class views.
5. **No free-form drag-resize.** Drag reorders; the S/M/L/XL control is the
   only size affordance. There are no resize handles.
6. **Uniform geometry.** A size class has ONE grid geometry for every widget
   type. If a chart type has no honest rendering at a class, it does not
   support that class — the stop is disabled, never faked with an invented
   substitution (owner decision, 2026-07-13).

The bug this replaces — charts hidden midway, layout breaking between sizes —
was the fluid architecture itself (donut % radii vs. variable-height legend,
`normalizeRow` reflowing spans by neighbor count, `min-h-[184px]` content
inside 160px cells). None of it is patched; it is deleted.

## 2. Size classes

Four classes on a 4-column grid (row unit **160px**, gap **20px** / `gap-5`):

| Class | Cells (cols × rows) | Shape | Role |
|---|---|---|---|
| **S**  | 1 × 1 | square    | Headline number. The KPI frame. |
| **M**  | 2 × 1 | landscape | Number + trend, or a minimal chart. |
| **L**  | 2 × 2 | square    | Standard chart with axes. |
| **XL** | 4 × 2 | wide      | Hero chart, full chrome and data budget. |

Per-type support (a dash = class not offered; the segmented control renders
that stop disabled with a tooltip, e.g. "Scatter needs Large"):

| Type    | S | M | L | XL |
|---------|---|---|---|----|
| kpi     | ✅ | ✅ | ✅ | —  |
| bar     | ✅ | ✅ | ✅ | ✅ |
| area    | ✅ | ✅ | ✅ | ✅ |
| donut   | —  | ✅ | ✅ | —  |
| scatter | —  | —  | ✅ | ✅ |

Rationale for the gaps, grounded in the rules DB:

- **donut@S** — a donut's honest single number is ambiguous (total vs. top
  share), and a ring below its Ø96px floor (§4) is chartjunk
  (`no_decorative_chartjunk`). Not offered.
- **donut@XL** — a donut encodes angle; width adds nothing but empty gutters
  (`prefer_position_over_angle_area`). Not offered.
- **scatter@S/M** — a scatter's insight is a 2D shape needing two labeled
  axes (`correlation_use_scatter`); there is no honest one-number or
  axis-free form. Not offered.
- **kpi@XL** — a lone number stretched across 4 columns violates
  `single_value_use_kpi_card`'s spirit (space without insight). Not offered.

### Persisted-size remap

Uniform geometry changes what the stored `size` values mean for charts
(currently `grid.ts` gives bar/area/scatter `small`=2×1, `medium`=2×2,
`large`=4×2). One-time remap on load (in `normalizeChartConfig`) or via
migration:

| Type | stored `small` | stored `medium` | stored `large` |
|---|---|---|---|
| kpi | S (unchanged) | M (unchanged) | L (unchanged) |
| bar / area / scatter | → **M** | → **L** | → **XL** |
| donut (was M=2×2, L=2×3) | — | → **L** | → **L** |

`ChartSizeSchema` gains `"xlarge"`. Per-type support is validated against the
support matrix (a `supportsSize(type, size)` helper in `grid.ts`), clamping
to the nearest supported class.

## 3. Dimensions — the constants table

Recharts v2 needs numeric pixel dimensions. They come from a lookup, never
from measurement.

**Canvas tiers.** One trait resolver at the dashboard canvas (analogous to
Apple's device family / trait collection) maps the available content width to
a discrete tier. This is the ONLY place layout is observed at runtime — a
single observer on the canvas element that snaps to a tier token; everything
below it receives constants. Charts never measure. Tiers key off the canvas
(not the viewport) because the collapsible sidebar changes available width
without a viewport change.

| Tier | Canvas width available | Columns | Chart content width | Canvas render width |
|---|---|---|---|---|
| t1 (compact) | < 660px | 1 | 280px | 100% |
| t2 (regular) | 660–1043px | 2 | 300px | 100% |
| t3 (wide) | 1044–1339px | 4 | 236px | 100% |
| t4 (xwide) | ≥ 1340px | 4 | 300px | 100% |

The canvas fills its available width using equal `minmax(0, 1fr)` columns.
The content widths above are conservative dimensions for chart internals, so
charts remain deterministic while cards use the full responsive column width.

Class geometry per tier (width × height, px; height = rows×160 + (rows−1)×20):

| Class | t1 | t2 | t3 | t4 |
|---|---|---|---|---|
| S  | 280×160 | 300×160 | 236×160 | 300×160 |
| M  | 280×160 ¹ | 620×160 | 492×160 | 620×160 |
| L  | 280×340 | 620×340 | 492×340 | 620×340 |
| XL | 280×340 ² | 620×340 ² | 1004×340 | 1260×340 |

¹ At t1 an M widget occupies the single column (1×1) and uses the S-side
data budget (§5) at the M view's layout.
² Below t3 there is no 4-column row, so XL renders its **L view** at L
geometry. The stored size is untouched; only the resolved view degrades.

**Chart plot box.** Inside the card, chrome is a fixed budget, so the plot
box is a constant too: `plotH = cardH − headerH − padV` where card padding is
24px horizontal (`px-6`), 16px top / 24px bottom of content, and:

| Class | Header budget | Plot height | Notes |
|---|---|---|---|
| M  | 44px (1-line title, no insight, no badges) | **96px** | |
| L  | 84px (2-line title + 1-line insight + badges) | **232px** | |
| XL | 84px (same as L) | **232px** | width is the upgrade |

Plot width = cell-span width − 48. These land in `grid.ts` as exported
constants (`WIDGET_DIMENSIONS[tier][class]`, `CHART_PLOT[class][tier]`);
values above are the spec defaults and may be tuned ±8px at implementation
time without re-approval, provided the invariants in §4 hold.

## 4. The degradation contract (all chart types inherit)

**Growing a widget adds chrome and data; shrinking removes them in a fixed
order. The message never changes — the number a Small widget shows must be
readable off the Large chart of the same config.**

Chrome elimination order, applied stepwise going DOWN from XL:

1. insight subtitle
2. legend / chip row
3. value axis — only when direct data labels replace it
   (`prefer_direct_labels_over_legend`, `restrained_gridlines_high_data_ink`)
4. gridlines
5. axis tick thinning — endpoints always survive
   (`consistent_date_axis_labels`)
6. the plot itself — replaced by the type's **headline substitution** (S), or
   the class is unsupported (§2)

The **title and the data's honesty** are never eliminated
(`descriptive_title_and_axis_labels`).

Legibility floors (from `minimum_font_size`, `wcag_contrast_for_chart_elements`):

- Chart text never renders below **11px**. When data doesn't fit at 11px,
  **reduce the data** (top-N + Other, coarser time granularity per
  `top_n_with_other_bucket` / `time_granularity_matches_range`) — never
  shrink text, never clip marks, never rotate labels
  (`avoid_rotated_axis_labels`).
- Bars: thickness ≥ 8px; per-class `maxBarSize` caps (M 32 / L 48 / XL 56)
  replace the `colSpan`-derived cap.
- Donut: outer Ø ≥ 96px; center label requires inner Ø ≥ 56px.
- Scatter: dot radius ≥ 3px.

**Substitution rule.** At S, ranking and trend charts render as a KPI —
`single_value_use_kpi_card` applied in reverse: when the frame can only carry
a KPI's worth of information, render a KPI. Substitute **only when the type
has an honest single number** (owner decision); otherwise the class is
unsupported.

## 5. Per-type matrix

Every supported (type × class) cell names a distinct view. No view is a
scaled version of another.

### kpi

| Class | View | Renders |
|---|---|---|
| S | `headline` | icon, value (role-sized), label, delta badge if trend exists. No sparkline, no breakdown. |
| M | `trend` | S + sparkline (fixed 40px height, numeric width from §3 — no `ResponsiveContainer`). |
| L | `detail` | M + breakdown row (eyebrow + point count — the current `@lg:` block, now gated by class). Primary-KPI hero illustration only at L. |

### bar

| Class | View | Data budget | Renders |
|---|---|---|---|
| S | `headline` | 1 | **Top category + its value** (owner decision): value, category name, context line "of {total}". The series is already value-sorted (`ranking_use_sorted_bar`), so this is `series[0]`. |
| M | `compact` | ≤ 5 + Other (vertical) / ≤ 3 + Other (horizontal) | Bars with direct value labels, **no value axis, no gridlines**, 1-line category labels. Orientation stays the rules-engine hint (`long_labels_use_horizontal_bar`), orthogonal to size. |
| L | `standard` | ≤ 8 with direct labels, else ≤ 10 with value axis (`DATA_LABEL_MAX_BARS` = 8) | Gridlines, category axis, tooltip. |
| XL | `expanded` | ≤ 12 (`CHART_LIMITS.bar`, `limit_categories_per_chart`) | Full chrome; `maxBarSize` 56 keeps sparse series from stretching (`top_n_with_other_bucket` handles dense ones). |

### area

| Class | View | Data budget | Renders |
|---|---|---|---|
| S | `headline` | 1 | **Latest period value + Δ% vs previous period** (owner decision): value, period label, delta badge. Reuses the `computeKpiTrend` shape. |
| M | `sparkline` | ≤ 24 points | Gradient area only — no y-axis, no gridlines; x labels at first/last point only. |
| L | `standard` | ≤ 60 points | Full axes (`Y_AXIS_WIDTH` 60), gridlines, tooltip. |
| XL | `expanded` | ≤ 100 points (`CHART_LIMITS.area`) | L + optional comparison series (`area_chart_for_totals_only` still limits to one primary series). |

Point budgets are met by time granularity, not truncation
(`time_granularity_matches_range`, `fill_missing_time_periods`).

### donut

| Class | View | Data budget | Renders |
|---|---|---|---|
| M | `ring` | ≤ 4 + Other | Landscape split: fixed ring (outer r 48px / inner r 30px) on the reading-start side, top-3 rows (swatch, label, %) beside it. **No chip legend, no center label.** |
| L | `standard` | ≤ 6 incl. Other (`BI_RULE_LIMITS.maxDonutSegments`, `pie_max_slices`) | Fixed ring (outer r 88px / inner r 55px), center total, chip legend below — the legend fits because both ring and chips have fixed heights now. |

Radii are **px constants per class**, replacing `DONUT_OUTER_RADIUS = "85%"`.

### scatter

| Class | View | Data budget | Renders |
|---|---|---|---|
| L | `standard` | ≤ 500 points (`CHART_LIMITS.scatter`) | Both numeric axes, gridlines, tooltip. |
| XL | `expanded` | ≤ 500 | Same chrome, wider plot; dot radius may step 3→4px. |

S/M stops disabled (owner decision — no correlation-KPI substitution).

## 6. RTL / Hebrew at small sizes

Grounded in the `israeli_data` category:

- Labels truncate at the **logical end** with an ellipsis, wrapped in bidi
  isolation (FSI/PDI via `src/shared/lib/format.ts`), so truncation never
  splits a bidi run mid-direction (`isolate_mixed_hebrew_english_labels`,
  `numbers_stay_ltr_in_rtl`). Full text lives in the tooltip
  (`truncate_labels_with_tooltip`).
- Truncation budgets are class constants: **M = 12 chars, L/XL = 22 chars**
  (22 is today's `truncateLabel(value, 22)`). Horizontal-bar y-axis width
  stays the fixed 128px.
- The donut@M ring sits at the reading-start side: left in LTR, right in RTL
  (`rtl_layout_for_hebrew_dashboards`); the grid itself flips via `dir`.
- Hebrew label rendering keeps original column names and Hebrew-capable fonts
  (`preserve_hebrew_column_names`, `hebrew_capable_fonts`).

## 7. Grounding — spec decision → rules DB

| Decision | Rule(s) |
|---|---|
| S substitution renders a KPI | `single_value_use_kpi_card` |
| Bar S shows the top (sorted) category | `ranking_use_sorted_bar` |
| Data budgets + Other bucket | `limit_categories_per_chart`, `top_n_with_other_bucket`, `pie_max_slices` |
| Point budgets via granularity | `time_granularity_matches_range`, `fill_missing_time_periods` |
| 11px floor, reduce-data-not-text | `minimum_font_size`, `avoid_rotated_axis_labels` |
| Value axis dropped iff direct labels | `prefer_direct_labels_over_legend`, `never_color_alone_for_meaning` |
| Minimal gridlines at small classes | `restrained_gridlines_high_data_ink` |
| Legend only where it fits, near data | `legend_near_data_or_top` |
| No donut@S / donut@XL | `no_decorative_chartjunk`, `prefer_position_over_angle_area` |
| No scatter below L | `correlation_use_scatter` |
| RTL truncation & bidi | `truncate_labels_with_tooltip`, `isolate_mixed_hebrew_english_labels`, `numbers_stay_ltr_in_rtl`, `rtl_layout_for_hebrew_dashboards` |

Verified: `data/bi-rules.json` is the versioned source of `bi_rules_chunks`
(seeded by `scripts/seed-bi-rules.mjs`; `retrieveBiRules` falls back to the
local file). Not verified from code: that the live DB rows currently match
the seed file byte-for-byte (assumed seeded per project state).

### Proposed rule additions (NOT ingested — owner review required)

The DB lacks size-class opinions. Proposed additions in the seed file's exact
format. They use the existing `BiRuleCategorySchema` values so no contract
change is needed; if you prefer a dedicated `size_class` category, extend the
zod enum in `src/shared/contracts/index.ts` first (the DB column is free
text — no migration needed). **Do not run `npm run seed:bi-rules` until
these are reviewed — they will shape every generated dashboard.**

```json
[
  {
    "rule_id": "size_class_selects_view",
    "category": "chart_selection",
    "content": "Every widget size class renders a view designed for that class's fixed frame; never render a scaled-down or cropped version of a larger view, and never derive a chart's dimensions from its container at runtime.",
    "action_if_fail": "use_size_class_view",
    "severity": "error"
  },
  {
    "rule_id": "small_size_substitutes_kpi",
    "category": "chart_selection",
    "content": "At the smallest widget size, ranking and trend charts render their honest headline number as a KPI card — the top sorted category with its value for rankings, the latest period value with delta versus the previous period for time series — instead of a miniature chart.",
    "action_if_fail": "substitute_kpi",
    "severity": "error"
  },
  {
    "rule_id": "unsupported_size_not_offered",
    "category": "chart_selection",
    "content": "A chart type that has no honest rendering at a size class must not offer that class: scatter plots require at least a large frame for two labeled axes, and donuts require at least a medium frame and gain nothing from extra width. Disable the size option rather than inventing a substitution to fill the grid.",
    "action_if_fail": "disable_size_option",
    "severity": "error"
  },
  {
    "rule_id": "default_size_class_by_role",
    "category": "chart_selection",
    "content": "Assign initial widget size classes by chart role: the primary time-series trend gets the extra-large frame, rankings and part-to-whole comparisons get large, supporting KPIs get small or medium; never generate a chart at a size class its type does not support.",
    "action_if_fail": "assign_size_by_role",
    "severity": "warning"
  },
  {
    "rule_id": "chrome_elimination_order",
    "category": "readability",
    "content": "When a chart renders at a smaller size class, remove chrome in a fixed order: insight text first, then the legend, then the value axis (only when direct data labels replace it), then gridlines, then axis tick density with endpoints kept; the title and the honesty of the data are never removed.",
    "action_if_fail": "apply_chrome_order",
    "severity": "warning"
  },
  {
    "rule_id": "legibility_floor_reduce_data",
    "category": "readability",
    "content": "When data does not fit a size class at the minimum legible font size (about 11px), reduce the data shown — top-N with an Other bucket or coarser time granularity — rather than shrinking text below the floor, clipping marks, or rotating labels.",
    "action_if_fail": "reduce_data_to_fit",
    "severity": "error"
  },
  {
    "rule_id": "minimum_mark_sizes",
    "category": "readability",
    "content": "Chart marks have absolute size floors regardless of frame: bars at least 8px thick, donut rings at least 96px outer diameter with a 56px inner diameter for any center label, scatter dots at least 3px radius; a frame that cannot honor the floors cannot host that chart form.",
    "action_if_fail": "enforce_mark_floors",
    "severity": "warning"
  },
  {
    "rule_id": "data_budget_per_size_class",
    "category": "readability",
    "content": "Cap the number of plotted elements by widget size class: compact chart frames hold about 5 categories or 24 time points, standard frames about 8-10 categories or 60 points, hero frames about 12 categories or 100 points; excess data folds into an Other bucket or a coarser granularity.",
    "action_if_fail": "apply_size_data_budget",
    "severity": "warning"
  },
  {
    "rule_id": "legend_only_when_it_fits",
    "category": "readability",
    "content": "Show a separate legend only at size classes with reserved fixed space for it; at compact sizes replace the legend with at most three direct label rows beside the chart, and never let a legend's height squeeze the plot below its minimum mark sizes.",
    "action_if_fail": "replace_legend_with_labels",
    "severity": "warning"
  },
  {
    "rule_id": "rtl_labels_truncate_logical_end",
    "category": "israeli_data",
    "content": "Truncate Hebrew and mixed-direction labels by logical characters at the logical end of the string, wrapped in bidi isolation so the ellipsis lands on the correct visual side; at compact widget sizes truncate to about 12 characters and always expose the full label in a tooltip.",
    "action_if_fail": "truncate_bidi_safe",
    "severity": "warning"
  }
]
```

## 8. Offenders — files violating the contract, with migration path

Every dimension below currently derives from a parent at runtime.

| # | File | Violation | Migration |
|---|---|---|---|
| 1 | `src/features/dashboard/client/layout.ts` | The fluid 12-col engine. `normalizeRow` re-inflates a chart's `colSpan` based on its row neighbors — a chart's size depends on other charts. `LayoutItem` threads this into every chart view. | **Delete the file.** `grid.ts` becomes the only geometry source. Chart views take `{ chart: ChartConfig; size: SizeClass; tier: CanvasTier }`. |
| 2 | `src/shared/ui/chart.tsx` (`ChartContainer`) | `ResponsiveContainer width="100%" height="100%"` inside an absolute-inset wrapper whose own comment admits it exists to suppress a resize feedback loop. | Add a fixed-dimension mode: accept numeric `width`/`height`, render the Recharts chart directly (no `ResponsiveContainer`). Dashboard path uses it exclusively; marketing mockup may keep the fluid path. |
| 3 | `src/features/dashboard/components/Dashboard.tsx` | (a) `calculateLayout`/`chartLayoutById` feed 12-col spans into chart internals; (b) `KpiSparkline` uses `ResponsiveContainer`; (c) `KpiCard` gates sparkline/breakdown on `@sm:`/`@lg:` container queries; (d) `KpiCard` content `min-h-[184px]` exceeds the 160px row unit (clipped today via `overflow-hidden`); (e) canvas grid uses fluid `1fr` columns. | Remove (a) entirely. Sparkline gets numeric dims from §3. Class-prop gating replaces container queries. Drop the `min-h`; per-class fixed content. Canvas becomes the tier-resolved fixed-width centered grid. |
| 4 | `src/features/dashboard/components/DashboardChartCard.tsx` | Consumes `LayoutItem`; header/insight gated by `@container`/`@sm:`; single header regardless of class. | Take `size`; render the per-class chrome budget of §3 (M: 1-line title only; L/XL: title + insight + badges). |
| 5 | `src/features/dashboard/components/charts/BarChartView.tsx` | `getMaxBarSize(chart.colSpan)` derives bar thickness from the fluid span; `className="h-full min-h-[160px]"` heights from parent flex. | `maxBarSize` from the class table (M 32/L 48/XL 56); numeric plot dims; add `headline` (S) and `compact` (M) views. |
| 6 | `src/features/dashboard/components/charts/AreaChartView.tsx` | `h-full min-h-[160px]` parent-derived height. | Numeric dims; add `headline` (S) and `sparkline` (M) views. |
| 7 | `src/features/dashboard/components/charts/ScatterChartView.tsx` | `h-full min-h-[160px]` parent-derived height. | Numeric dims; gate S/M stops off in the size control. |
| 8 | `src/features/dashboard/components/charts/DonutChartView.tsx` | The hidden-midway bug: `%`-based radii resolve against a container squeezed by a variable-height `flex-wrap` chip legend (`min-h-[180px] flex-1` + legend below). | Fixed px radii per class (§5); M = ring + 3 direct rows, L = ring + fixed-height chip legend. |
| 9 | `src/features/dashboard/components/charts/chart-theme.ts` | `DONUT_OUTER_RADIUS = "85%"` / `DONUT_INNER_RADIUS = "62%"` — the comment explicitly relies on `ResponsiveContainer` re-measurement. | Replace with `DONUT_RADII: Record<SizeClass, {outer, inner}>` px constants. |
| 10 | `src/features/dashboard/client/grid.ts` | Not a violator (fixed constants — keep) but encodes per-type geometry, contradicting uniform classes. | Rewrite presets to the uniform S/M/L/XL geometry + support matrix + `WIDGET_DIMENSIONS`/`CHART_PLOT` tables + tier resolver types. |
| 11 | `src/shared/contracts/index.ts` | `ChartSizeSchema` lacks `xlarge`; `LayoutItem` consumers assume `colSpan`. | Add `"xlarge"`; add support-matrix validation; remap persisted sizes (§2 table) in `normalizeChartConfig`/`normalizeKpiConfig`. |
| 12 | `src/features/dashboard/server/config.ts`, `server/chat.ts` | Generation and the chatbot assign sizes in the old vocabulary (`chat.ts` clamps `large → medium`; `config.ts` fallback sizes at :607–:775, :1022). | Assign by role per `default_size_class_by_role`; chatbot clamp becomes `xlarge → large`; validate with `supportsSize`. |
| 13 | `src/app/dev/charts/page.tsx` | Showcase builds `LayoutItem` mocks with `colSpan`. | Rebuild mocks as `(chart, size, tier)`; the showcase becomes the visual spec of the §5 matrix — one row per supported class per type. |
| 14 | `src/features/dashboard/components/GeneratingChartCard.tsx`, `AddChartTile.tsx` | `min-h-[260px]` + `h-full` inside fixed cells (harmless today only because both render at M=2×2=340px). | Drop `min-h`; they occupy an L cell (2×2) by definition. |

Migration order: 10 → 11 → 2 → 5/6/7/8/9 (parallel) → 4 → 3 → 12 → 13/14 →
delete 1. Verify with `npm run typecheck`, `npm run lint`, `npm run test`,
plus a Playwright pass over `/dev/charts` at each tier width.

## 9. Invariants checklist (review gate for any future chart PR)

- [ ] No `ResponsiveContainer`, `ResizeObserver`, `getBoundingClientRect`, or
      `%` dimension anywhere under `src/features/dashboard/components/charts/`.
- [ ] Every chart receives numeric `width`/`height` traceable to
      `WIDGET_DIMENSIONS`.
- [ ] Every (type × class) cell in §5 has a named view; adding a chart type
      means filling its row here first.
- [ ] The S headline number equals what the L chart of the same config shows
      as its top/latest element.
- [ ] No chart text below 11px; data reduced instead.
- [ ] Unsupported classes are disabled stops, never fallback-rendered.
