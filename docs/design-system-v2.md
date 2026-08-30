# TADA Design System v2 — Dashboard Redesign

Single source of truth for the dashboard redesign. Every agent working on this
branch (`feat/dashboard-redesign`) MUST follow this document. If something is
not specified here, follow the nearest shadcn/ui default — never invent a new
token, radius, or shadow.

## 0. The one rule

**shadcn tokens only.** Before this branch the codebase had three parallel
colour systems:

- `var(--color-*)` (hex) — ~493 references in `.tsx`
- `var(--dashboard-*)` (hex) — ~41 references
- shadcn HSL tokens (`--background`, `--card`, `--primary`, …) — used only by
  `src/shared/ui/*`

v2 collapses all three into the shadcn HSL layer. In component code you write
Tailwind semantic classes:

```
bg-background  bg-card  bg-muted  bg-popover  bg-primary  bg-sidebar
text-foreground  text-muted-foreground  text-primary  text-card-foreground
border-border  ring-ring
```

**Never** write `bg-[var(--color-surface)]`, `text-[#191c1e]`, `border-[rgba(...)]`,
or any arbitrary-value colour. Charts are the single exception — ECharts needs
literal colour strings, so `charts/chart-theme.ts` reads CSS variables at
runtime (see §7).

## 1. Design direction

Two references drive this:

- **Light** — soft warm-grey canvas, pure-white cards, hairline borders, almost
  no shadow. Separation comes from *colour contrast*, not elevation. Generous
  padding. Active nav item is a raised white pill.
- **Dark** — near-black canvas, one step lighter panel, borders as ~8% white.
  Same geometry, inverted. The accent is the only saturated thing on screen.

Shared traits to reproduce:

1. **Quiet by default, loud once.** Everything is neutral grey; the accent blue
   appears on exactly one element per view — the active nav pill, the primary
   button, the highlighted data mark. Never two accents competing.
2. **Rounded, roomy.** Large radii (14px cards, 10px controls, 999px pills),
   16–24px internal padding, 12–16px gaps.
3. **Hairlines, not shadows.** 1px borders at low contrast. Shadow only on
   things that genuinely float: popovers, dropdowns, drag previews, tooltips.
4. **Type does the hierarchy.** One large page title, small muted labels, and
   a big tabular number in each card. No decorative dividers.

## 2. Colour tokens

Defined in `src/index.css` as HSL triplets (no `hsl()` wrapper — Tailwind adds it).

### Light (`:root`)

| Token | HSL | Hex approx | Use |
|---|---|---|---|
| `--background` | `210 17% 96%` | `#F4F5F7` | app canvas, sidebar |
| `--foreground` | `220 13% 10%` | `#16181C` | primary text |
| `--card` | `0 0% 100%` | `#FFFFFF` | cards, raised pills, panels |
| `--card-foreground` | `220 13% 10%` | | |
| `--popover` | `0 0% 100%` | | menus, tooltips-on-light |
| `--popover-foreground` | `220 13% 10%` | | |
| `--primary` | `221 87% 55%` | `#2867F0` | accent — actions, active, highlight |
| `--primary-foreground` | `0 0% 100%` | | text on accent |
| `--secondary` | `210 16% 93%` | `#EBEDF0` | secondary button, chips |
| `--secondary-foreground` | `220 13% 20%` | | |
| `--muted` | `210 16% 93%` | `#EBEDF0` | segmented-control track, search field |
| `--muted-foreground` | `220 9% 46%` | `#6B7280` | labels, axis text, secondary copy |
| `--accent` | `210 16% 91%` | `#E7E9ED` | hover fill |
| `--accent-foreground` | `220 13% 15%` | | |
| `--destructive` | `0 72% 51%` | | |
| `--destructive-foreground` | `0 0% 100%` | | |
| `--border` | `220 13% 89%` | `#E1E4E8` | hairlines |
| `--input` | `220 13% 89%` | | |
| `--ring` | `221 87% 55%` | | focus ring = accent |
| `--sidebar-background` | `210 17% 96%` | | same as canvas — sidebar is NOT white |
| `--sidebar-foreground` | `220 9% 46%` | | inactive nav text |
| `--sidebar-primary` | `221 87% 55%` | | |
| `--sidebar-accent` | `0 0% 100%` | | the raised active pill |
| `--sidebar-accent-foreground` | `220 13% 10%` | | active nav text |
| `--sidebar-border` | `220 13% 89%` | | |

### Dark (`.dark`)

| Token | HSL | Hex approx | Use |
|---|---|---|---|
| `--background` | `220 9% 5%` | `#0C0D0F` | app canvas |
| `--foreground` | `210 20% 98%` | `#F7F8FA` | primary text |
| `--card` | `220 8% 10%` | `#171A1C` | cards, panels |
| `--card-foreground` | `210 20% 98%` | | |
| `--popover` | `220 8% 12%` | `#1C1F22` | |
| `--popover-foreground` | `210 20% 98%` | | |
| `--primary` | `221 90% 66%` | `#5B8DF9` | accent, lifted for dark contrast |
| `--primary-foreground` | `220 20% 8%` | | |
| `--secondary` | `220 8% 15%` | `#232629` | |
| `--secondary-foreground` | `210 20% 94%` | | |
| `--muted` | `220 8% 14%` | `#212427` | segmented track, search field |
| `--muted-foreground` | `220 7% 58%` | `#8E939B` | |
| `--accent` | `220 8% 17%` | `#282B2F` | hover fill |
| `--accent-foreground` | `210 20% 94%` | | |
| `--border` | `220 8% 18%` | `#2A2D31` | hairlines |
| `--input` | `220 8% 20%` | | |
| `--ring` | `221 90% 66%` | | |
| `--sidebar-background` | `220 9% 5%` | | flush with canvas |
| `--sidebar-foreground` | `220 7% 58%` | | |
| `--sidebar-accent` | `220 8% 14%` | | active pill (lifted, not white) |
| `--sidebar-accent-foreground` | `210 20% 98%` | | |
| `--sidebar-border` | `220 8% 18%` | | |

### Chart tokens

Sequential accent ramp for multi-series, plus two special roles.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--chart-1` | `221 87% 55%` | `221 90% 66%` | primary series / highlighted mark |
| `--chart-2` | `199 89% 48%` | `199 89% 58%` | second series (cyan) |
| `--chart-3` | `250 80% 63%` | `250 85% 72%` | third (indigo) |
| `--chart-4` | `168 62% 45%` | `168 62% 55%` | fourth (teal) |
| `--chart-5` | `220 9% 60%` | `220 8% 45%` | "Other" bucket / slate |
| `--chart-neutral` | `220 13% 87%` | `220 8% 20%` | **default bar/area fill — unhighlighted** |
| `--chart-grid` | `220 13% 92%` | `220 8% 14%` | gridlines |
| `--chart-axis` | `220 9% 55%` | `220 7% 50%` | axis labels |

`--chart-neutral` is the important one: reproduce the reference behaviour where
**every bar is neutral grey and only the hovered/selected bar is accent blue.**

## 3. Geometry

```
--radius: 0.875rem;   /* 14px — cards, panels, modals */
```

Derived (Tailwind): `rounded-lg` = 14px, `rounded-md` = 12px, `rounded-sm` = 10px.

| Element | Radius |
|---|---|
| Card / panel / modal | `rounded-lg` (14px) |
| Button / input / select | `rounded-xl` (12px) |
| Nav pill, segmented item | `rounded-xl` (12px) |
| Chip, badge, status pill | `rounded-full` |
| Icon chip (card header) | `rounded-xl` (12px), 36×36 |
| Avatar | `rounded-full` |

Spacing scale — use only these: `2 / 3 / 4 / 5 / 6 / 8 / 10 / 12` (8px, 12px,
16px, 20px, 24px, 32px, 40px, 48px).

| Element | Value |
|---|---|
| Card padding | `p-5` (20px), `p-6` on large cards |
| Card grid gap | `gap-4` (16px) |
| Page horizontal padding | `px-6 lg:px-8` |
| Page top padding | `pt-6` |
| Sidebar width | 248px expanded, 64px collapsed |
| Sidebar padding | `px-3 py-4` |
| Nav item height | `h-10` |
| Control height | `h-9` (small), `h-10` (default) |

## 4. Shadows

Only three, all defined in `src/index.css` and exposed as Tailwind utilities:

```
--shadow-raised:  0 1px 2px 0 hsl(220 13% 10% / 0.04);          /* active nav pill, segmented item */
--shadow-overlay: 0 8px 24px -8px hsl(220 13% 10% / 0.12),
                  0 2px 6px -2px hsl(220 13% 10% / 0.06);        /* popover, dropdown, tooltip */
--shadow-drag:    0 16px 40px -12px hsl(220 13% 10% / 0.22);     /* drag preview only */
```

Dark mode: same variables, alpha raised (`0.4` / `0.6`), colour `220 20% 2%`.

**Cards get no shadow.** A card is `bg-card border border-border rounded-lg`.

## 5. Typography

Fonts stay as-is (`--font-satoshi` / `--font-assistant`, RTL-aware).

| Role | Classes |
|---|---|
| Page title | `text-3xl font-semibold tracking-tight text-foreground` |
| Section heading | `text-lg font-semibold tracking-tight` |
| Card title | `text-sm font-medium text-foreground` |
| Card KPI number | `text-3xl font-semibold tracking-tight tabular-nums` |
| Label / meta | `text-xs font-medium text-muted-foreground` |
| Body | `text-sm text-muted-foreground` |
| Nav item | `text-sm font-medium` |
| Breadcrumb | `text-sm text-muted-foreground`, active segment `text-foreground` |

All numeric output uses `tabular-nums`. Currency/date formatting stays with the
existing helpers in `src/shared/lib/format.ts` — do not touch that logic.

## 6. Component patterns

### 6.1 Sidebar

```
bg-sidebar, no shadow, 1px border-sidebar-border on the inline edge
├ brand row       h-14, logo 28px + wordmark text-base font-semibold
├ search field    h-10 rounded-xl bg-muted, Search icon start, no border
├ nav group       label: text-xs font-medium text-muted-foreground px-3 pb-2
│  └ nav item     h-10 rounded-xl px-3 gap-3
│     inactive:   text-sidebar-foreground, hover:bg-accent hover:text-foreground
│     active:     bg-sidebar-accent text-sidebar-accent-foreground shadow-raised
│                 icon text-primary
└ footer          avatar + email, hairline top border
```

Drop the current left accent bar on the active item — the raised pill *is* the
active state. Collapsed mode: pill becomes 40×40 centred, tooltip on hover.

### 6.2 Topbar

```
h-14, bg-background, border-b border-border, px-6
├ breadcrumb: [home icon] › Dashboard › <active pill>
│   chevron: ChevronRight h-4 w-4 text-muted-foreground/60
│   active pill: rounded-xl bg-muted px-2.5 py-1 text-sm font-medium text-foreground
└ right: theme toggle, actions — h-9 w-9 rounded-xl ghost buttons
```

### 6.3 Page header

```
px-6 lg:px-8 pt-6 pb-5
├ h1  text-3xl font-semibold tracking-tight
└ segmented control (view/range switcher), see 6.4
```

### 6.4 Segmented control

```
track: inline-flex gap-1 rounded-xl bg-muted p-1
item:  h-8 rounded-lg px-3.5 text-sm font-medium text-muted-foreground
       hover:text-foreground
active: bg-card text-foreground shadow-raised
```

### 6.5 Card

```
bg-card border border-border rounded-lg p-5
├ header  flex items-center gap-3
│   icon chip: h-9 w-9 rounded-xl bg-muted grid place-items-center,
│              icon h-4 w-4 text-muted-foreground
│   title:     text-sm font-medium text-foreground
│   actions:   ghost icon buttons, opacity-0 group-hover:opacity-100
├ KPI      text-3xl font-semibold tabular-nums, mt-4
└ body     chart / table, mt-4
```

Hover on an interactive card: `hover:border-foreground/15` only. No lift, no
shadow, no scale.

### 6.6 Buttons

Use the shadcn `Button` variants; align them to the tokens:

| Variant | Style |
|---|---|
| `default` | `bg-primary text-primary-foreground hover:bg-primary/90` |
| `secondary` | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| `outline` | `border border-border bg-card hover:bg-accent` |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` |
| `destructive` | `bg-destructive text-destructive-foreground` |

Sizes: `sm` = `h-8 px-3 rounded-lg`, `default` = `h-9 px-4 rounded-xl`,
`lg` = `h-10 px-5 rounded-xl`, `icon` = `h-9 w-9 rounded-xl`.
All buttons: `text-sm font-medium`, focus `ring-2 ring-ring ring-offset-2
ring-offset-background`.

### 6.7 Table

```
header row: text-xs font-medium text-muted-foreground, h-10, border-b border-border
body row:   h-14, border-b border-border last:border-0, hover:bg-muted/50
cell:       text-sm, numbers tabular-nums text-right
status pill: rounded-full border px-2.5 py-0.5 text-xs font-medium
             success: border-emerald-500/30 text-emerald-600 dark:text-emerald-400
             pending: border-amber-500/30 text-amber-600 dark:text-amber-400
             failed:  border-destructive/30 text-destructive
```

### 6.8 Overlays

Dialog / popover / dropdown / sheet: `bg-popover border border-border
rounded-lg shadow-overlay`. Dialog overlay: `bg-foreground/20
backdrop-blur-sm`. No coloured glows.

## 7. Charts

`charts/chart-theme.ts` is the only file allowed to resolve colours to literal
strings. It must read them from CSS variables at runtime so both themes work:

```ts
function token(name: string): string {
  return `hsl(${getComputedStyle(document.documentElement)
    .getPropertyValue(name).trim()})`;
}
```

Cache per theme and invalidate when the `dark` class changes.

Rules:

1. **Bars / area / scatter default to `--chart-neutral`.** The accent
   (`--chart-1`) is applied only to the hovered mark, the selected mark, or a
   single explicitly-highlighted category (max/latest). This is the signature
   move of both references — do not colour every bar blue.
2. **Donut** is the exception: it needs categorical separation, so it uses
   `--chart-1..5` in order.
3. Gridlines: horizontal only, 1px, `--chart-grid`, no vertical lines, no axis
   lines, no ticks.
4. Axis labels: 11px, `--chart-axis`, uppercase for the category axis on bar
   charts (matches the `JAN FEB MAR` reference), sentence case elsewhere.
5. Tooltip: `bg-popover` equivalent, `--border` hairline, `rounded-xl`,
   `shadow-overlay`, 12px text, arrow pointer, `tabular-nums` values.
6. Bar corner radius `[6, 6, 0, 0]` vertical / `[0, 6, 6, 0]` horizontal.
7. Keep every existing sizing constant (`MAX_BAR_SIZE`, `DONUT_RADII`,
   `BAR_CATEGORY_BUDGET`, `LABEL_TRUNCATION`, `DONUT_SLICE_BUDGET`) exactly as
   is — the widget-sizing contract in `docs/WIDGET_SIZING.md` is unchanged by
   this redesign.

## 8. Motion

- Transitions: `transition-colors duration-150` for hover/active. That's the
  default for nearly everything.
- Layout/enter animations: 180–220ms, `ease-out`.
- Everything must respect `prefers-reduced-motion` (`motion-reduce:transition-none`,
  or `useReducedMotion()` where framer-motion is already used).
- No scale-on-hover, no card lift, no glow pulses. Remove the `card-lift`
  keyframe usage.

## 9. Accessibility & RTL

- Contrast: body text ≥ 4.5:1, large text and muted labels ≥ 3:1. Check
  `text-muted-foreground` on `bg-card` in **both** themes.
- Focus: always visible — `focus-visible:ring-2 ring-ring ring-offset-2
  ring-offset-background`. Never `outline-none` without a replacement.
- The app is bilingual (en/he). Use logical properties everywhere:
  `ps-*/pe-*/ms-*/me-*`, `start-*/end-*`, `text-start/text-end`. Never
  `pl-/pr-/left-/right-` on anything that flips. Icons that imply direction
  (chevrons, arrows) must mirror in RTL — keep the existing `isRtl` handling.
- Hit targets ≥ 36×36.

## 10. Non-goals

Do not change: data flow, the zustand store, server modules, API routes,
i18n strings, `format.ts` logic, widget-sizing constants, or the marketing
pages under `src/app/(marketing)`. This is a presentation-layer redesign.
