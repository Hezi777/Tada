# Design/Visual Layer Audit

Scope: `src/index.css`, `tailwind.config.ts`, and all `.ts`/`.tsx` under `src/`. Read-only audit, no source files modified.

## 1. Design tokens (`src/index.css` `:root`)

**Finding:** Two parallel token systems coexist.

- **App tokens** (hex, used directly as `var(--color-*)` / arbitrary values): `--color-bg #f7f9fb`, `--color-surface #ffffff`, `--color-surface-muted #f2f4f6`, `--color-surface-subtle #eceef0`, `--color-border rgba(25,28,30,0.12)`, `--color-accent #00327d`, `--color-accent-secondary #0047ab`, `--color-accent-light #e7eef8`, `--color-text-primary #191c1e`, `--color-text-secondary #434653`, `--color-text-muted #9ba3b2`, plus chart tokens (`--color-chart-grid #eceef0`, `--color-chart-axis #6b7280`, `--color-chart-hover`, `--color-chart-cursor-line`) and a second "dashboard" family (`--dashboard-canvas #f1f2f4`, `--dashboard-paper #fcfcfd`, `--dashboard-paper-muted #f6f7f8`, `--dashboard-ink #15171a`, `--dashboard-hairline`, `--dashboard-brand #2867f0`, `--dashboard-signal #ff6b55`, `--dashboard-shadow`).
- **shadcn HSL tokens** (`--background 210 43% 98%`, `--foreground 217 30% 13%`, `--primary 216 100% 24%`, `--secondary`, `--muted`, `--accent`, `--destructive 0 84% 60%`, `--border 214 34% 88%`, `--ring`, `--card`, `--popover`, `--sidebar-*`, `--chart-1`..`--chart-5`) consumed via Tailwind's `hsl(var(--x))` pattern in `tailwind.config.ts`.
- Radius: single token, `--radius: 1.25rem` (20px), derived `md = radius - 2px`, `sm = radius - 4px`.
- Shadows: `--dashboard-shadow: 0 20px 60px -46px rgba(21,23,26,.28)` plus five more ad-hoc shadow utility classes (`.shadow-glow`, `.shadow-soft`, `.shadow-card`, `.shadow-premium`) each with their own hand-tuned offsets — none derived from a shared elevation scale.
- Fonts: `--font-satoshi`, `--font-assistant` (see §7).
- Motion tokens: `--motion-duration: 180ms`, `--motion-ease: cubic-bezier(0.4,0,0.2,1)` — used only by `.transition-ui`.
- Dark mode redefines the app-token hex values and the shadcn HSL values independently (both blocks present, correctly paired) in `.dark`.

**Inconsistency:** `--color-accent` (`#00327d`) and `--primary` (`hsl(216 100% 24%)` = `#00327d`) are the same visual color encoded twice in two different formats, defined and maintained separately. `--dashboard-brand` (`#2867f0`) is a *third*, visually distinct blue used only in the dashboard app shell/chat, not reconciled with `--color-accent`/`--primary` at all (`src/index.css:12,27,37`).

## 2. Type scale

**Finding:** `index.css` defines a documented 7-step semantic scale (`.t-display` 48px/900/-0.03em, `.t-h1` 30px/700/-0.02em, `.t-h2` 22px/700/-0.01em, `.t-card-title` 17px/600, `.t-label` 12px/600/uppercase, `.t-body` 14px/400, `.t-metric` 36px/800/tabular) — `src/index.css:200-251`. Tailwind's own scale is also used throughout: `text-sm` (133×), `text-xs` (75×), `text-lg` (27×), `text-base` (18×), `text-3xl` (15×), `text-4xl` (14×), `text-5xl` (13×), `text-2xl` (11×), `text-xl` (10×), `text-6xl` (2×), `text-7xl` (1×, `src/app/(marketing)/_components/Hero.tsx:226`).

**Inconsistency:**
- The `.t-*` semantic scale defined in `index.css` is essentially unused in `src/` components — grep finds no `t-display`/`t-h1`/`t-metric` class usage in `.tsx` files. It was designed ("non-breaking… so adopting these classes is non-breaking") but never adopted; components hand-roll `text-{size} font-{weight} tracking-[...]` combinations instead.
- On top of the two systems above, 17 distinct **arbitrary pixel/rem** text sizes bypass both scales: `text-[0.65rem]`, `text-[0.62rem]`, `text-[0.6rem]`, `text-[0.68rem]`, `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[15px]`, `text-[17px]`, `text-[32px]`, `text-[38px]`, `text-[52px]`, `text-[1.375rem]`, `text-[1.75rem]`, `text-[2.25rem]`, `text-[16vw]`. Many appear only once, e.g. `text-[38px]`/`text-[52px]` both on `src/features/dashboard/components/Dashboard.tsx:1107` in the same className, and `text-[16vw]` on `src/app/(marketing)/_components/Footer.tsx:39`.
- `text-7xl` (`Hero.tsx:226`) and `text-6xl` (2 uses) appear nowhere else — one-off display sizes not part of any other heading in the app.
- `leading-5` (1 use), `leading-relaxed` (1 use), `leading-tight` (1 use) are single-occurrence leading values sitting alongside the dominant `leading-8`/`leading-7`/`leading-snug`/`leading-none`/`leading-6`.

## 3. Spacing — arbitrary values

**Finding:** 318 total arbitrary-bracket utility usages across `src/` (rounded, shadow, text, spacing, tracking combined). Isolated to layout/sizing (`p/px/py/w/h/min-*/max-*/top/left/right/bottom/inset/gap`), 123 occurrences. Selected list (file:line → value):

- `src/app/(marketing)/_components/AnimatedDashboardMockup.tsx:39` → `w-[520px]` / `max-w-[520px]`
- `src/app/(marketing)/_components/AnimatedDashboardMockup.tsx:97` → `h-[68%]`
- `src/app/(marketing)/_components/Footer.tsx:33` → `gap-[2vw]`, `opacity-[0.13]`
- `src/app/(marketing)/_components/Footer.tsx:34` → `h-[13vw] w-[13vw]`
- `src/app/(marketing)/_components/Hero.tsx:216` → `h-[240vh]`
- `src/app/(marketing)/_components/Hero.tsx:224` → `top-[17vh]`
- `src/app/(marketing)/_components/Hero.tsx:246` → `top-[42vh]`
- `src/app/(marketing)/_components/Hero.tsx:249` → `w-[1000px] scale-[0.62]`
- `src/app/(marketing)/_components/Hero.tsx:251` → `h-[500px] rounded-[28px]`
- `src/app/(marketing)/_components/HowItWorks.tsx:64` → `h-[calc(100%-2rem)]`
- `src/app/(marketing)/_components/Separator.tsx:11` → `h-[1px] h-[23px] w-[1px] w-[250px]`
- `src/app/(product)/dashboard/page.tsx:47` → `w-[52rem] max-w-[52rem]`
- `src/app/(product)/dashboard/page.tsx:163-166` → `h-[280px] min-h-[280px]` (×4, one per KPI tile)
- `src/app/(product)/login/page.tsx:60` → `w-[45%]`
- `src/app/(product)/login/page.tsx:100` → `w-[420px] max-w-[420px]`
- `src/app/dev/charts/page.tsx:233` → `w-[1400px] max-w-[1400px]`
- `src/features/dashboard/components/AppShell.tsx:207,256` → `w-[248px]` (sidebar width, repeated literal)
- `src/features/dashboard/components/AppShell.tsx:295-296` → `pr-[248px] pl-[248px]` (content offset hand-synced to the sidebar width above — two separate literals that must stay equal)
- `src/features/dashboard/components/Dashboard.tsx:1110` → `w-[52rem] max-w-[52rem]` (duplicates the `/dashboard/page.tsx:47` value independently)
- `src/features/dashboard/components/Dashboard.tsx:1212` → `h-[320px] min-h-[320px]`
- `src/features/dashboard/components/Dashboard.tsx:447` → `h-[184px] min-h-[184px]`
- `src/features/dashboard/components/DashboardTrustControls.tsx:188` → `w-[min(72rem,calc(100vw-2rem))] h-[85vh] max-h-[85vh]`
- `src/features/dashboard/components/FileManager.tsx:149-151` → `h-[55%] h-[78%] h-[46%]`
- `src/features/dashboard/components/FloatingChat.tsx:528` → `h-[500px] w-[380px]`
- `src/shared/ui/alert-dialog.tsx:37` / `src/shared/ui/dialog.tsx:39` → `top-[50%] left-[50%]` centering hack (both files, identical, not shared)
- `src/shared/ui/select.tsx:76` / `dropdown-menu.tsx:48,66` → `min-w-[8rem]`, `min-w-[11rem]` — inconsistent floating-panel min-widths between two nearly-identical primitives

**Inconsistency:** the recurring `w-[52rem]`/`max-w-[52rem]` pair is defined independently in two files (`(product)/dashboard/page.tsx:47` and `features/dashboard/components/Dashboard.tsx:1110`) rather than shared. The `AppShell.tsx` sidebar width (`w-[248px]`) is duplicated as `pr-[248px]`/`pl-[248px]` on the content wrapper instead of being one token — a layout bug waiting to happen if one changes without the other.

**Rounded-corner values are the starkest case.** `--radius` is `1.25rem` (20px) and Tailwind maps `rounded-lg` to it, yet the codebase bypasses that token constantly: `rounded-[20px]` appears **46 times** and `rounded-[1.25rem]` (the literal same value, written a second way) appears **11 times** — both duplicating what `rounded-lg` already gives for free. Long tail of one-off radii: `rounded-[24px]`(10), `rounded-[8px]`(7), `rounded-[16px]`(6), `rounded-[28px]`(4), `rounded-[18px]`(4), `rounded-[1.1rem]`(3), plus singletons `rounded-[21px]`, `rounded-[14px]`, `rounded-[2px]`, `rounded-[1.8rem]`, `rounded-[1.35rem]`, `rounded-[1.2rem]`, `rounded-t-[24px]`, `rounded-t-[10px]`.

## 4. Layout containers

**Finding:**
- Static/legal marketing pages (`about`, `terms`, `pricing`, `privacy`) all share the identical wrapper: `<main className="px-4 pb-24 pt-32 sm:px-6">` — consistent (`about/page.tsx:62`, `terms/page.tsx:104`, `pricing/page.tsx:89`, `privacy/page.tsx:78`).
- Marketing landing sections (`CTA`, `FAQ`, `Features`, `HowItWorks`) consistently use `py-24` for vertical section rhythm, all wrapped by a shared `container` div.
- `tailwind.config.ts` defines a global `container` (`center: true`, `padding: 2rem`, `2xl: 1400px`) but it's only referenced by a handful of marketing components (`HowItWorks`, `Features`, `CTA`, `FAQ`, `not-found`, plus `UploadScreen`, `SettingsPanel`, `DonutChartView` in the dashboard app) — most dashboard screens (`Dashboard.tsx`, `AppShell.tsx`, `FileManager.tsx`, `Sidebar.tsx`) never touch `container` and instead build their own max-widths ad hoc (`max-w-[52rem]`, `max-w-[420px]`, `max-w-[32rem]`, `max-w-[300px]`, etc. — 20 distinct predefined `max-w-*` values plus the arbitrary ones in §3).
- Hero (`Hero.tsx:216`) opts out of the container system entirely with a bespoke `h-[240vh]` scroll-driven section.

**Inconsistency:** no single max-width governs "page content." The marketing site uses Tailwind's `container` utility; the product/dashboard side ignores it and reinvents widths per-component (`w-[52rem]` twice, independently, per §3). There is no shared `--content-max-width` token.

## 5. Responsive breakpoints

**Finding — per marketing/product page:**

| File | Breakpoints used |
|---|---|
| `src/app/layout.tsx` | none |
| `src/app/not-found.tsx` | `sm:` |
| `src/app/(marketing)/layout.tsx` | none (client-only theme reset) |
| `src/app/(marketing)/page.tsx` | none (composition only) |
| `src/app/(marketing)/privacy/page.tsx` | `sm:` |
| `src/app/(marketing)/terms/page.tsx` | `sm:` |
| `src/app/(marketing)/about/page.tsx` | `sm:` `md:` |
| `src/app/(marketing)/_components/Hero.tsx` | `sm:` `lg:` |
| `src/app/(marketing)/_components/Features.tsx` | `sm:` `lg:` |
| `src/app/(marketing)/_components/HowItWorks.tsx` | `sm:` |
| `src/app/(marketing)/_components/Footer.tsx` | `sm:` |
| `src/app/(marketing)/_components/CTA.tsx` | `sm:` |
| `src/app/(marketing)/_components/Header.tsx` | `sm:` `md:` |
| `src/app/(marketing)/_components/FAQ.tsx` | `sm:` `lg:` |
| `src/app/(marketing)/pricing/page.tsx` | `sm:` `md:` |
| `src/app/(product)/dashboard/page.tsx` | `sm:` `md:` `lg:` `xl:` |
| `src/app/(product)/login/page.tsx` | `lg:` only |
| `src/app/(marketing)/_components/LinearReveal.tsx` | none |
| `src/app/(marketing)/_components/AnimatedDashboardMockup.tsx` | none |
| `src/app/(marketing)/_components/Separator.tsx` | none |
| `src/app/dev/charts/page.tsx`, `src/app/dev/portfolio/page.tsx` | none (dev-only routes) |

**Dashboard feature components:** `AppShell.tsx` (`sm:` `lg:`), `Dashboard.tsx` (`sm:` `lg:`), `FileManager.tsx` (`sm:` `md:` `xl:`), `SettingsPanel.tsx` (`sm:` `md:`), `FloatingChat.tsx` (`sm:` only, 3 uses total) do have some responsive coverage.

**Flag — zero responsive classes:** every file in `src/shared/ui/*` (the shadcn primitive layer: `card`, `popover`, `toaster`, `empty-state`, `scroll-area`, `label`, `tooltip`, `command`, `badge`, `table`, `separator`, `dropdown-menu`, `select`, `textarea`, `skeleton`) has no breakpoint prefixes — acceptable for atomic primitives, but also true of several full feature components that render real page real-estate: `ConfirmGenerationStep.tsx`, `AddChartTile.tsx`, `DashboardSwitcher.tsx`, `DashboardChartCard.tsx`, `Sidebar.tsx`, `GeneratingChartCard.tsx`, and every chart view (`EChart.tsx`, `AreaChartView.tsx`, `ScatterChartView.tsx`, `ChartEmptyState.tsx`, `ChartHeadline.tsx`, `BarChartView.tsx`, `DonutChartView.tsx`). `Sidebar.tsx` in particular is a persistent nav rail with a hardcoded width and no responsive behavior at all — it and `AppShell.tsx`'s hardcoded `w-[248px]`/`pl-[248px]`/`pr-[248px]` (§3) together suggest the dashboard shell was designed desktop-only and never adapted, unlike the marketing site.

## 6. Motion

**Finding:**
- CSS custom-property duration/easing pair: `--motion-duration: 180ms`, `--motion-ease: cubic-bezier(0.4,0,0.2,1)`, consumed only by `.transition-ui` (`src/index.css:255-263`).
- Tailwind transition-duration classes actually used in components: `duration-200` (19×), `duration-300` (10×), `duration-500` (1×), `duration-150` (1×) — i.e. most hover/interaction transitions don't go through `--motion-duration` (180ms) at all; they use ad hoc 150/200/300/500ms values instead, alongside `.transition-ui`'s 180ms and `.dashboard-hover`'s hardcoded `200ms cubic-bezier(0.4,0,0.2,1)` (`index.css:538-541`) and `.premium-hover`'s spring `320ms cubic-bezier(0.34,1.56,0.64,1)` (`index.css:802-806`). Four different duration values (150/180/200/300/320/500ms) are in play for what is nominally "the same" hover-state motion language.
- Only `ease-in-out` appears as a Tailwind class (4×); everything else uses either the default Tailwind ease, `cubic-bezier(0.4,0,0.2,1)` hardcoded inline in `index.css`, or framer-motion's custom `easeOut` object imported per marketing component (`Hero.tsx:195`, `HowItWorks.tsx:41`, `Features.tsx:317`, `CTA.tsx:19`, each with its own `{ duration: 0.6–0.7, delay, ...easeOut }`).
- `tailwind.config.ts` keyframes (`accordion-down/up`, `card-lift`, `fab-pulse`) are separate again, all `0.2s`–`2.5s` durations, unrelated to the `index.css` keyframe set (`float 6s`, `pulse-soft 3s`, `shimmer 2s`, `marquee`, `fade-in 0.5s` + 3 numbered delay variants, `bob 8s`, `type 2s steps(40,end)`, `tada-glow-spin 4s`, `tada-glow-breathe 3s`, `tada-reveal-fade`) — two independent animation registries (Tailwind config vs. raw CSS) with no cross-reference.
- Reduced-motion is only handled for `.transition-ui`, `.ai-glow-ring`/`.ai-glow-ring-soft`, and `.premium-hover`/`.premium-transition` — the framer-motion-driven marketing animations and the `.dashboard-hover`/`.mesh-*`/keyframe animations (`float`, `shimmer`, `bob`, `type`) have no `prefers-reduced-motion` guard.

**Inconsistency:** `.transition-ui`'s advertised 180ms token is a minority pattern (15 uses) versus raw `duration-200`/`duration-300` (29 uses combined) — the token exists but isn't the actual convention in practice.

## 7. Fonts

**Finding:**
- **Satoshi** — loaded as a local variable font via `src/shared/fonts/satoshi` (not `next/font/google`), exposed as `--font-satoshi`. Used as the primary/display face: `font-family: var(--font-satoshi), var(--font-assistant), sans-serif` on `body` (`index.css:153`) and explicitly repeated in `.t-display`, `.t-h1`, `.t-h2`, `.t-metric`, and `.display-number` (`index.css:200-251`, `650`).
- **Assistant** — Google Font (`next/font/google`, subsets `hebrew`+`latin`, `display: swap`), loaded in `src/app/layout.tsx:12-16`, exposed as `--font-assistant`. Documented purpose: Hebrew glyph fallback so mixed Hebrew/English content doesn't render tofu (comment at `layout.tsx:9-11`) — a deliberate, well-reasoned choice, not an accident.
- `tailwind.config.ts` `fontFamily.sans`/`display`/`label` are all defined identically as `[--font-satoshi, --font-assistant, sans-serif]` — three named font roles that are actually one stack; `font-display` and `font-label` utility classes exist but resolve to exactly the same fonts as `font-sans`, so they add no differentiation in practice (only `.t-*` utility classes hardcode the stack directly instead of using the Tailwind class).

**Inconsistency:** none structurally wrong — the two-font system is intentional and well-commented — but the triplicated `fontFamily` config (`sans`/`display`/`label` all pointing at the same two fonts) is dead flexibility: no component appears to rely on `font-display` or `font-label` being different from `font-sans`.

## Verdict

There is a real design system underneath this — a documented color-token pair (app hex tokens + shadcn HSL tokens), a defined 7-step type scale, a named motion token, and a `.premium-card`/`.dashboard-surface` surface language with light/dark parity that was clearly designed with care. But it is not the system actually governing the UI. In practice:

- The `.t-*` type scale in `index.css` is essentially unused — components hand-write `text-{size} font-{weight}` combinations instead, then routinely escape even Tailwind's own scale with 17+ one-off arbitrary sizes (`text-[11px]`, `text-[38px]`, `text-[52px]`, `text-[16vw]`…).
- The `--radius` token is actively bypassed 57+ times via `rounded-[20px]`/`rounded-[1.25rem]` (the same 20px value, written two different ways) plus a dozen more one-off radii, when `rounded-lg` already does this for free.
- The `--motion-duration: 180ms` token is a minority convention; most transitions use ad hoc `duration-200`/`duration-300`, and there are two disconnected animation registries (Tailwind config keyframes vs. raw CSS keyframes).
- Layout is inconsistent by area: marketing pages share real containers and consistent `py-24`/`pt-32 pb-24` rhythm and reasonable responsive coverage; the dashboard/product shell hardcodes pixel widths (`w-[248px]` synced by hand to `pl-[248px]`/`pr-[248px]`) and several full feature components (`Sidebar.tsx`, all chart views) ship with zero responsive classes.
- Three visually-identical blues exist as separate tokens (`--color-accent` hex, `--primary` HSL, `--dashboard-brand`) never reconciled to one source of truth.

This reads as a system that was designed once, then outrun by feature work — every new component reached for a bracket literal instead of the token that already existed. It's not a pile of one-off decisions from scratch (the bones are legitimately good), but in its current state it functions as one: the tokens are decoration on top of what's actually a per-component, hand-tuned styling practice.
