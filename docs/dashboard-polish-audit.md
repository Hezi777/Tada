# Dashboard Polish Audit — Findings & Fix Plan

Branch: `feat/ui-overhaul-fable5`. Scope: in-app screens only (Overview, Files,
Settings, chat panel, edit mode, chart generation/resize). Landing page is out
of scope. Audited via four parallel Sonnet agents that screenshotted real states
(light/dark, LTR/RTL) with Playwright and measured live px values.

## Root cause (the one thing to fix first)

**There is no shared token system.** Spacing, type sizes, elevation/shadow,
radii, and motion timing are all chosen inline per component. Every "violation"
below is a symptom. Coherence must come from tokens + shared variants, not
per-card tweaks. The Settings panel (`SettingsPanel.tsx`) is the cleanest
existing surface and is a good reference for the target rhythm.

## Prioritized findings (highest perceived-polish impact first)

### P0 — Foundational inconsistency (tokens)
| Issue | Evidence | Fix |
|---|---|---|
| No spacing scale; gaps mixed on one screen | KPI grid `gap-5` (20px) vs chart grid `gap-5`/`xl:gap-6` (24px), `Dashboard.tsx:881,958`; `p-6` vs `p-8` cards | 8px spacing scale; one section gap, one card padding |
| No real type scale | sizes in use: 10,11,12,13,14,17,22,30,36,48px; gap 22→36 (1.64×) | Codify role classes (display/h1/h2/card-title/label/body/metric); ~1.25 steps |
| ~8 hardcoded `rgba(25,28,30,…)` shadows bypass tokens; **no dark-mode shadow** → cards lose depth in dark | Agent D shadow map; `Card` base barely used as-is | Standardize on `shadow-soft/card/premium` tokens (already HSL/dark-aware); refactor consumers |
| 3 card radii (20/24/28) + menu radii (6/12/16); `popover.tsx` `rounded-md` outlier | Agent D radii map | One card radius (20), one menu radius |
| Motion timing varies (200 vs 300ms) | `FileManager.tsx:1151` 300ms vs `:718` 200ms | Motion tokens: ~200ms ease-out, reduced-motion safe |

### P1 — Hierarchy / F-pattern (Dashboard)
| Issue | Evidence | Fix |
|---|---|---|
| **Primary KPI value renders SMALLER than secondary** (size by string length, not role) | `$68,028` primary = 36px, `12,348` secondary = 48px; `kpiValueSizeClass` `Dashboard.tsx:245-252` | Role-based sizing: primary KPI largest, top-left; cap to fit |
| Empty-state headings 30/24/30px for same role | `Dashboard.tsx:845,908`, `FileManager.tsx:1118` | One `EmptyState` component |
| Badge/tag same role, two paddings | `Dashboard.tsx:418-439` (`px-2 py-0.5`) vs `DashboardChartCard.tsx:1003-1009` (`px-2.5 py-1`) | One badge treatment |

### P1 — Component consistency
| Issue | Evidence | Fix |
|---|---|---|
| 6+ inline "primary accent" buttons instead of a variant | `Dashboard.tsx:852`, `FileManager.tsx:1132`, `CreateDashboardModal.tsx:237`, `FloatingChat.tsx:269,343,420` | Use `Button` variant everywhere |
| **Destructive actions look like primary** (no destructive color) | Settings Account, FileManager/dashboard delete dialogs | `destructive` variant via token, applied to all deletes |
| 4 separate empty-state implementations | Dashboard×2, FileManager, FloatingChat | Shared `EmptyState` |
| Dark-mode breaks: white chips on dark cards, hardcoded badge bg, FAB ring color mismatch | `FileManager.tsx:745,793,835` `bg-white/80`; `Dashboard.tsx:418,425` `#e6e8ea`; `.fab-pulse-ring` `#00327d` vs dark accent | Token-based surfaces |
| Inputs h-11 vs h-10; textarea radius 8 vs 12 | Settings/CreateDashboardModal vs chat | Standardize input/textarea |

### P1 — Charts & edit mode — **SUPERSEDED by `docs/WIDGET_SIZING.md`**

The fixes below patched symptoms of the fluid-resize architecture. That
architecture is being replaced by discrete size classes with fixed dimensions
(WidgetKit model); the donut overflow and clipping issues are eliminated
structurally, not clamped. There are no resize handles in the new model —
the S/M/L/XL control is the only size affordance. Do not implement this table.

| Issue | Evidence | ~~Fix~~ (superseded) |
|---|---|---|
| **Donut overflows card** at small width / tall height (only top half visible, legend pushed out) | fixed `innerRadius 58% / outerRadius 85%`, `DashboardChartCard.tsx:570-701` | ~~Clamp donut radius to `min(w,h)` / px ceiling~~ → fixed px radii per size class |
| **3-category bar clips a bar+label** at 4-col width | `XAxis minTickGap={18}`, margin left:0, `:798-869` | `interval={0}` for low cardinality (still valid; already shipped in `BarChartView`) |
| Donut tooltip overlaps the popped active slice | `:614-627` | Offset tooltip / reduce pop (still valid; shipped) |
| Full-width bar charts have big empty gutters (no `maxBarSize`) | `:798-869` | ~~width-aware `maxBarSize`~~ → per-size-class `maxBarSize` constants |
| Resize handles near-invisible (hover/focus only) | `DashboardChartCard.tsx:1069-1108` | ~~Persistent subtle affordance~~ → no resize handles exist in the size-class model |

### P2 — Interaction / flow
| Issue | Evidence | Fix |
|---|---|---|
| Add-chart popover opens upward, overlaps card above | `AddChartTile.tsx:55-71` | `side`/`collisionPadding` or centered sheet |
| 4 redundant "create dashboard" entry points | FileManager + DashboardSwitcher | One primary CTA; keep dropzone + switcher shortcut |
| Two "Save Changes" buttons for one save | `SettingsPanel.tsx:592,693` | One sticky save |
| Settings nav has no scroll-spy | `SettingsPanel.tsx:327` | IntersectionObserver active section |
| KPI/chart-card hover feedback too subtle/absent | Dashboard cards | Consistent card hover token |

### P2 — RTL / bidi
| Issue | Evidence | Fix |
|---|---|---|
| Bidi artifacts in English description blocks under RTL (leading periods, reversed counts) | Settings descriptions; "of 5 dashboards 0" | bidi-isolate dynamic values |

## Decision points (for the owner)
- ~~**Medium chart width (4→6 cols).**~~ **RESOLVED (2026-07-13) — superseded
  by `docs/WIDGET_SIZING.md`.** The 12-col 4/6/8 tier system (`layout.ts`) is
  deleted, not tuned. Widgets snap to uniform size classes on a 4-column cell
  grid (S 1×1, M 2×1, L 2×2, XL 4×2); rows can't come up short, so
  `normalizeRow` force-stretching no longer exists.

## Fix workstreams (execution order)

1. **WS1 — Tokens & primitives (FOUNDATION, first, sequential).** Add spacing /
   type / elevation / radii / motion tokens in `index.css`; theme shared
   primitives (`shared/ui/*`): `Button` (incl. destructive + primary-accent
   variant), `Card` (token shadows), inputs/textarea, popover/menu radius; add a
   shared `EmptyState`. Everything downstream consumes these.
2. **WS2 — Dashboard hierarchy** (`Dashboard.tsx`): role-based KPI sizing /
   F-pattern, unified gaps, adopt `EmptyState`, badge treatment.
3. **WS3 — Charts & edit mode** — **SUPERSEDED**: follow the migration path
   in `docs/WIDGET_SIZING.md` §8 instead (size-class views, fixed dimensions,
   delete `layout.ts`).
4. **WS4 — Files & Settings** (`FileManager.tsx`, `SettingsPanel.tsx`,
   `CreateDashboardModal.tsx`): destructive variants, one save, scroll-spy,
   dark-mode surfaces, reduce redundant CTAs.
5. **WS5 — Chat & quick-add** (`FloatingChat.tsx`, `AddChartTile.tsx`): popover
   placement, button variants, consistent feedback.

WS2–WS5 run in parallel after WS1 (disjoint files). Vision-QA loop closes it.
