# 3D KPI Illustration Icons — Plan

Goal: give Tada's KPI cards a "hero illustration" treatment like MatDash's
"Welcome Back David" target/dart graphic — a small set of consistent 3D
illustrations, one per KPI category, generated with Nano Banana Pro
(Gemini 3 Pro Image) in Google AI Studio.

This folder has 3 files:

- `README.md` — this plan (categories, naming, integration)
- `nano-banana-prompts.md` — paste-ready prompts for AI Studio
- `claude-implementation-prompt.md` — paste-ready prompt for a future
  Claude Code session, once the images exist

## Workflow

1. Open Google AI Studio, pick Gemini 3 Pro Image (Nano Banana Pro).
2. Generate the **anchor image** first (`revenue`, prompt #1 in
   `nano-banana-prompts.md`). This sets the style baseline.
3. For every other category, attach the anchor image (and 1-2 prior
   results) as **reference images** and use the matching prompt — this is
   what keeps all 15 icons visually consistent (same material, lighting,
   palette).
4. Export each as a square PNG with transparent background, save into
   `public/illustrations/kpi/` using the filenames below.
5. Once all (or even just a handful) of files exist, paste the contents of
   `claude-implementation-prompt.md` into Claude Code to wire them into
   `KpiCard`.

## Categories (15)

These map 1:1 onto the existing KPI icon rules in
`src/features/dashboard/client/design.ts` (`KPI_ICON_RULES` and
`AGGREGATION_ICON_MAP`), so every KPI card that currently resolves to a
Lucide icon will also resolve to one of these illustrations.

| # | Slug (filename) | Maps to (current Lucide icon) | Used for |
|---|---|---|---|
| 1 | `kpi-revenue.png` | `DollarSign` | revenue, sales, billing, price, income |
| 2 | `kpi-customers.png` | `Users` | users, customers, members, accounts |
| 3 | `kpi-conversion.png` | `Percent` | conversion, rate, margin, share |
| 4 | `kpi-time.png` | `Clock3` | session, duration, latency, cycle time |
| 5 | `kpi-orders.png` | `ShoppingCart` | orders, cart, checkout, purchases |
| 6 | `kpi-growth.png` | `TrendingUp` | growth, trend, momentum (also primary-KPI fallback) |
| 7 | `kpi-security.png` | `ShieldCheck` | auth, compliance, approvals |
| 8 | `kpi-system.png` | `Gauge` | load, usage, capacity, utilization |
| 9 | `kpi-region.png` | `Globe2` | region, geo, market, country |
| 10 | `kpi-comparison.png` | `ArrowRightLeft` | LTV/CAC, balance, mix, comparisons |
| 11 | `kpi-count.png` | `Hash` | generic counts (default aggregation icon) |
| 12 | `kpi-daterange.png` | `CalendarRange` | date range aggregation |
| 13 | `kpi-average.png` | `Activity` | average aggregation |
| 14 | `kpi-target.png` | `Target` | min aggregation / goal-style KPIs |
| 15 | `kpi-payment.png` | `CreditCard` | mode aggregation / payment-style KPIs |

You don't have to generate all 15 in one go — start with `revenue`,
`customers`, `growth`, `orders` and `target` (the most common categories
in real datasets), confirm the look, then fill in the rest.

## Style direction (summary)

- Soft "claymorphism / glass" 3D render, single floating hero object,
  centered, square 1:1, transparent background.
- Light/white-dominant body material (so it reads on both the dark
  `mesh-navy` primary card and the lighter secondary mesh cards), with
  Tada brand colors as accents: royal blue `#00327D` → `#2F6DF6`, teal
  `#14B8A6`, green `#22C55E`, indigo `#6366F1`, sky `#7DD3FC`.
- Soft studio lighting, gentle ambient occlusion, subtle drop shadow
  baked into the image (so it floats above the card surface).
- No text, no logos, no people's faces — abstract objects only.

## Integration sketch

In `Dashboard.tsx`, `KpiCard` currently renders the Lucide `Icon` twice:
a small badge icon (top-left) and a large, very faint background
"watermark" icon (bottom-right, `text-white/10` or
`text-[rgba(0,50,125,0.06)]`). The plan is to **replace the watermark**
with the matching illustration PNG at higher opacity/size — same spot,
same idea as MatDash's hero graphic — while leaving the small badge icon
as-is (it's a UI element, not decoration).

Full details are in `claude-implementation-prompt.md`.
