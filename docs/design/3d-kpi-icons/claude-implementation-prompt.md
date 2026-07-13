# Claude Code prompt — wire up KPI illustrations

Use this once you've generated some/all of the PNGs from
`nano-banana-prompts.md` and saved them into
`public/illustrations/kpi/` using the filenames from `README.md`
(`kpi-revenue.png`, `kpi-customers.png`, etc.).

Paste everything below the line into a new Claude Code session on this
branch.

---

We generated a set of 3D illustration icons for KPI cards, saved under
`public/illustrations/kpi/` (see `docs/design/3d-kpi-icons/README.md` for
the full filename → category mapping). Only some of the 15 files may
exist yet — handle missing files gracefully.

Goal: in `src/features/dashboard/components/Dashboard.tsx`, the `KpiCard`
component currently renders the resolved Lucide `Icon` twice — a small
badge (top-left) and a large, very faint "watermark" copy
(`absolute -bottom-5 -right-5 h-24 w-24 ...`, `text-white/10` or
`text-[rgba(0,50,125,0.06)]`). Replace that watermark with the matching
illustration PNG (via `next/image`) at a larger size and higher opacity,
positioned similarly (bottom-right, partially bleeding off the card edge,
like MatDash's "Welcome Back" hero graphic). Keep the small top-left badge
icon as the Lucide icon — that's a functional UI element, not decoration.

Implementation:

1. In `src/features/dashboard/client/design.ts`, extend the existing
   `KPI_ICON_RULES` and `AGGREGATION_ICON_MAP` so each entry also carries
   an illustration filename (e.g. add an `illustration: "kpi-revenue.png"`
   field alongside each `icon`). Add a `resolveKpiIllustration(kpi)`
   export mirroring `resolveKpiIcon`'s matching logic, returning a path
   under `/illustrations/kpi/...` (or `null` if you'd rather fall back to
   no illustration for categories without a generated asset yet).

2. In `Dashboard.tsx`, `KpiCard`: replace the faint watermark `<Icon />`
   with an `<Image>` pointing at the resolved illustration path, sized
   roughly `h-28 w-28` to `h-36 w-36` (larger than the current `h-24 w-24`
   watermark since these are full-color illustrations, not faint
   outlines), positioned `absolute -bottom-4 -right-4` (adjust so it
   doesn't overlap the KPI value text — check against `min-h-[184px]`
   card height). Keep `pointer-events-none`.

3. Since the illustrations have light/cream bodies, they should read fine
   on both the dark `mesh-navy` primary card and the lighter secondary
   mesh cards — but actually render a couple of KPI cards in the browser
   (light and dark mode) and adjust size/position/opacity if anything
   looks cramped or low-contrast.

4. If `resolveKpiIllustration` returns `null` for a given KPI (file not
   generated yet), fall back to the current faint Lucide-icon watermark
   so the layout doesn't break for un-illustrated categories.

5. Run `npm run typecheck` and `npm run lint` when done.

Don't touch chart styling, the sidebar, or anything outside `KpiCard` /
`design.ts` for this task.
