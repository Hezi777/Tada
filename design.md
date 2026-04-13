# Design System: Tada

## 1. Visual Theme & Atmosphere

Tada is a premium AI-powered business intelligence tool for everyday Israeli

business owners. The design language is editorial and data-forward — the kind

of interface that makes a business owner feel in control the moment they open it.

Think Bloomberg Terminal rebuilt by a Scandinavian design studio.

The system is built on a single, commanding Royal Blue (`#00327d`) that anchors

every interactive moment. Everything else steps back. The canvas is almost white.

The cards are pure white. Depth is created through surface color shifts, never

borders. The result is a UI that breathes — data has room to be understood,

not just displayed.

Manrope handles all numbers and headlines with geometric authority. Inter handles

everything else with quiet precision. Together they create a dual-voice system:

Manrope speaks, Inter whispers.

The defining characteristic of Tada's visual language is **generous roundness**.

Every element is soft. Nothing is sharp. Pill buttons, rounded cards, smooth inputs.

This is not corporate BI software — it is a premium consumer product that happens

to display business data.

**Key Characteristics:**

- Royal Blue (`#00327d`) as the single chromatic accent — no competing colors

- Surface hierarchy through background color shifts — 1px borders are forbidden

- Manrope for all display numbers and headlines — weight 700-800 at hero sizes

- Inter for all body, label, and UI text — weight 400-600

- Minimum border-radius of 8px on every element — sharp corners are forbidden

- Cards always at 20px radius — they feel like physical objects, not containers

- Pill-shaped buttons always — `border-radius: 9999px`, no exceptions

- One AI surface only — the chatbot FAB (bottom-right sparkle button)

- No dark chart panels inside white cards — chart backgrounds are always white

---

## 2. Color Palette & Roles

### Primary

- **Royal Blue** (`#00327d`): The brand anchor. CTA button fill, active nav pill,

hero KPI card background, progress bars, focus borders, primary interactive

elements. Never used decoratively — only where action or emphasis is required.

- **Royal Blue Container** (`#0047ab`): Secondary blue for gradient CTAs.

Used only in combination with `#00327d` for button gradients at 135 degrees.

- **Pure White** (`#ffffff`): All card surfaces, input backgrounds, nav bar.

The primary content surface.

### Surface Hierarchy

These five tiers define all depth and separation. No borders permitted between sections.

- **surface** (`#f7f9fb`): Page canvas. The base layer everything sits on.

- **surface-container-low** (`#f2f4f6`): Sub-section backgrounds, table row

alternates, secondary zones.

- **surface-container** (`#eceef0`): Dividers expressed as background blocks,

input fills in read-only state.

- **surface-container-high** (`#e6e8ea`): Chart type badges, chips,

secondary tags, hover states on list rows.

- **surface-container-lowest** (`#ffffff`): Active cards, elevated components,

modal backgrounds.

### Text Colors

- **on-surface** (`#191c1e`): Primary text. Headings, card titles,

metric numbers, nav items.

- **on-surface-variant** (`#434653`): Secondary text. Subtitles,

metadata, input labels, placeholder content.

- **on-primary** (`#ffffff`): All text on Royal Blue backgrounds.

- **on-surface-disabled** (`#9ba3b2`): Disabled states, coming-soon labels.

### Status Colors

Status colors are used for trend indicators and badges only.

Never used for chart lines or decorative fills.

- **status-positive** (`#16a34a`): Upward trends (▲ prefix),

positive delta values. Tinted background at 10% opacity for badges.

- **status-negative** (`#dc2626`): Downward trends (▼ prefix),

negative delta values. Tinted background at 10% opacity for badges.

- **status-neutral** (`#6b7280`): Flat trends (→ prefix),

unchanged values.

### Dashboard Card Palette

Used exclusively for the tint area of dashboard gallery cards in the

Dashboards screen. All are extremely desaturated — almost white.

- **tint-blush** (`#fff0f0`): Warm rose tint

- **tint-sage** (`#f0fff4`): Cool green tint

- **tint-slate** (`#f0f4ff`): Cool blue tint

- **tint-lavender** (`#f5f0ff`): Soft purple tint

- **tint-amber** (`#fffbf0`): Warm yellow tint

Each dashboard card gets one tint assigned at creation.

Royal Blue chart icons inside at 20% opacity.

### Forbidden Colors

- No pure black (`#000000`) — use `on-surface` (`#191c1e`) instead

- No standard blue (`#0000ff`) — always Royal Blue tokens

- No red chart lines — red is reserved for `status-negative` only

- No multi-color accent systems — Royal Blue is the only chromatic accent

---

## 3. Typography Rules

### Font Families

- **Satoshi**: Display numbers, page titles, card titles, KPI metrics,

hero headlines. The voice of data. Available via Fontshare

(https://www.fontshare.com/fonts/satoshi).

Weights used: 700 and 800 only for display sizes, 600 for headlines.

- **Inter**: Nav items, body text, labels, metadata, input text,

button text, badge text. The engine of readability.

Available via Google Fonts.

- **Numeric rendering**: All metric numbers use

`font-variant-numeric: tabular-nums` to prevent layout shift.

### Type Scale

| Role | Font | Size | Weight | Usage |

|------|------|------|--------|-------|

| display-xl | Manrope | 48px / 3rem | 800 | Hero KPI on primary card |

| display-lg | Manrope | 36px / 2.25rem | 700 | Standard KPI numbers |

| display-md | Manrope | 28px / 1.75rem | 700 | Page titles |

| headline-lg | Manrope | 22px / 1.375rem | 600 | Section titles |

| headline-md | Manrope | 18px / 1.125rem | 600 | Card titles |

| title-md | Inter | 15px / 0.9375rem | 600 | Nav active items, form labels |

| body-md | Inter | 14px / 0.875rem | 400 | Primary body, list items, input text |

| body-sm | Inter | 13px / 0.8125rem | 400 | Card subtitles, secondary descriptions |

| label-md | Inter | 12px / 0.75rem | 500 | Badge text, chip text |

| label-sm | Inter | 11px / 0.6875rem | 400 | Metadata, timestamps, axis labels |

### Principles

- **Numbers are Manrope, always.** Any numeric metric, KPI, percentage,

or count uses Manrope regardless of size.

- **Trend indicators** use `label-md` Inter in the appropriate status color

with a directional prefix glyph (▲ ▼ →) and `tabular-nums`.

- **Uppercase tracking** is used only for card category labels and

table column headers — `font-size: 11px`, `letter-spacing: 0.08em`,

`text-transform: uppercase`, `color: on-surface-variant`.

- **No bold body text** for decoration — weight 600+ in Inter is reserved

for interactive labels and form titles only.

---

## 4. Shape & Roundedness

Tada uses generous, consistent rounding. This is non-negotiable and defines

the product's premium consumer character.

### Border Radius Tokens

| Token | Value | Usage |

|-------|-------|-------|

| radius-xs | 6px | Internal nested elements only |

| radius-sm | 8px | Input fields, small chips, badge pills, table row hover |

| radius-md | 12px | Dropdowns, tooltips, small utility cards |

| radius-lg | 16px | Appearance preview tiles, inner card sections |

| radius-xl | 20px | All standard cards, dashboard gallery cards, section containers |

| radius-2xl | 24px | Hero chart cards, modal dialogs |

| radius-full | 9999px | All buttons, all pills, avatars, toggle switches, FAB |

### Rules

- **No element may have a border-radius below 6px** — ever

- **All buttons are radius-full** — pill shaped, no exceptions

- **All cards are radius-xl minimum** — hero cards use radius-2xl

- **Nested elements step down one level** — a card (radius-xl)

contains inner elements at radius-lg maximum

- **Input fields are radius-sm** — softer than default browser styling,

not pill-shaped

---

## 5. Spacing & Layout

### Spacing Scale

| Token | Value | Usage |

|-------|-------|-------|

| space-xs | 4px | Icon-to-label gap, inline element spacing |

| space-sm | 8px | Internal badge padding, tight list gaps |

| space-md | 16px | Input internal padding, icon padding |

| space-lg | 24px | Card internal padding (standard) |

| space-xl | 32px | Page padding, gap between cards in grid |

| space-2xl | 48px | Section breaks, major layout divisions |

### Page Layout

- **Max content width**: 1280px, centered

- **Page background**: `surface` (`#f7f9fb`)

- **Page padding**: `space-xl` (32px) horizontal, `space-xl` (32px) vertical

below the nav

- **Card grid gap**: `space-xl` (32px) — cards must breathe

### The Breathing Rule

Cards must never feel cramped.

- Standard cards: `space-lg` (24px) internal padding minimum

- Hero chart cards: `space-xl` (32px) internal padding

- Gap between cards: `space-xl` (32px) minimum — never less

- Gap between KPI cards: `space-xl` (32px)

### Dashboard Bento Grid

The main dashboard uses a 12-column grid with intentional asymmetry.

**KPI Row**: 4 equal cards. First card always gets Royal Blue hero treatment.

**Main bento row**:

- Left zone (col 1–8, ~65% width): Hero chart card — tall, dominant,

full area chart. No chat bar inside.

- Right zone (col 9–12, ~35% width): Two stacked cards —

top: secondary chart, bottom: metric card.

**Bottom row**: 3 equal cards — mixed chart types,

dot matrix / spark line / ratio bar.

---

## 6. Navigation

### Top Navigation Bar

- **Height**: 64px fixed

- **Background**: `surface-container-lowest` (`#ffffff`)

- **No bottom border** — the `surface` (`#f7f9fb`) page background

creates natural separation

- **Left**: "T" square icon (Royal Blue `#00327d`, 32px, radius-sm)

+ "Tada" wordmark, `headline-md` Manrope, `on-surface`

- **Center**: Nav links — Dashboards, Files (future), Settings.

`body-md` Inter, `on-surface-variant` when inactive.

**Active state**: solid `on-surface` (`#191c1e`) pill background,

`on-primary` (`#ffffff`) text, `radius-full`, 32px height,

16px horizontal padding. No underline. No border. Just the pill.

- **Right**: Search input (ghost, `surface-container-low` fill,

radius-full, 200px wide), notification bell icon, user avatar (36px circle)

- **No sidebar** — this is a top-nav only product

---

## 7. Components

### KPI Cards

Four cards in a row, equal width.

**Hero KPI (card 1 only)**:

- Background: Royal Blue (`#00327d`)

- Number: `display-xl` Manrope, `on-primary` white

- Label: `label-sm` Inter uppercase, `on-primary` at 70% opacity

- Trend: `label-md` Inter, white pill badge with status color tint

- Border-radius: `radius-xl` (20px)

- Three-dot menu: top-right, white icon

**Standard KPI (cards 2–4)**:

- Background: `surface-container-lowest` (`#ffffff`)

- Number: `display-lg` Manrope, `on-surface`

- Label: `label-sm` Inter uppercase, `on-surface-variant`

- Trend: `label-md` Inter, `status-positive` or `status-negative`

with directional glyph prefix

- Border-radius: `radius-xl` (20px)

- Three-dot menu: top-right, `on-surface-variant` icon

### Chart Cards

- Background: `surface-container-lowest` (`#ffffff`)

- Border-radius: `radius-xl` (20px), hero chart uses `radius-2xl` (24px)

- Internal padding: `space-xl` (32px)

- **Header**: Card title (`headline-md` Manrope, `on-surface`) top-left.

Subtitle (`body-sm` Inter, `on-surface-variant`) below title, 4px gap.

Chart type badge top-right. Three-dot menu far right.

- **Chart type badge**: `surface-container-high` (`#e6e8ea`) background,

`label-md` Inter uppercase, `on-surface-variant`, `radius-full`.

Examples: AREA · BAR · DONUT · SCATTER · DOT · SPARK

- **Chart area**: Always white background — no dark panels inside cards

- **Chart colors**: Royal Blue (`#00327d`) as the primary series color.

Lighter opacity variants (60%, 40%, 20%) for secondary series.

No other colors in charts.

- **No gridlines** — use `surface-container-low` as a subtle axis

background strip instead

- **No divider lines** inside cards — vertical spacing only

### Buttons

**Primary CTA**:

- Background: linear-gradient(135deg, `#00327d`, `#0047ab`)

- Text: `title-md` Inter, `on-primary` white

- Border-radius: `radius-full` (9999px)

- Height: 40px

- Padding: 0 20px

- Icon: left-aligned, 8px gap to text

- Hover: gradient reverses direction

**Secondary / Ghost**:

- Background: transparent

- Border: 1px `surface-container-high` (`#e6e8ea`)

- Text: `body-md` Inter, `on-surface`

- Border-radius: `radius-full`

- Height: 40px

- Hover: `surface-container-low` background fill

**Destructive**:

- Background: `status-negative` at 8% opacity

- Border: 1px `status-negative` at 30% opacity

- Text: `status-negative` (`#dc2626`)

- Border-radius: `radius-full`

- Never solid red fill

**FAB (Chatbot trigger)**:

- Background: Royal Blue (`#00327d`)

- Icon: sparkle/AI glyph, white

- Size: 52px circle, `radius-full`

- Position: fixed, bottom-right, 32px margin

- Hover: `#0047ab`, subtle scale(1.05)

### Input Fields

- Background: `surface-container-low` (`#f2f4f6`)

- Border: 1px `on-surface` at 12% opacity (ghost border)

- Border-radius: `radius-sm` (8px)

- Height: 40px

- Padding: 0 `space-md` (16px)

- Text: `body-md` Inter, `on-surface`

- Placeholder: `body-md` Inter, `on-surface-disabled`

- Label: `label-sm` Inter, `on-surface-variant`, above the field

- **Focus state**: border transitions to `#00327d` at 100% opacity, 2px

- **Read-only state**: `surface-container` fill, no focus behavior

- **Dropdown/Select**: same as input + chevron-down icon right-aligned

### Status Badges / Trend Pills

- Shape: `radius-full` pill

- Padding: 4px vertical, 10px horizontal

- Text: `label-md` Inter

- **Positive**: `status-positive` at 10% opacity background,

`status-positive` text, ▲ prefix

- **Negative**: `status-negative` at 10% opacity background,

`status-negative` text, ▼ prefix

- **Neutral**: `surface-container-high` background,

`on-surface-variant` text, → prefix

- Never solid saturated fills

### Dashboard Gallery Cards (Dashboards screen)

- Size: tall card, roughly 3:2 ratio

- Border-radius: `radius-xl` (20px)

- **Top zone (60% of card height)**: pastel tint background

(one of the dashboard tint palette colors). Ghost mini chart

icons in Royal Blue at 20% opacity arranged in a mini bento layout.

- **Bottom zone (40%)**: `surface-container-lowest` white.

Dashboard name: `headline-md` Manrope, `on-surface`.

Metadata: `label-sm` Inter, `on-surface-variant`.

- Three-dot menu: top-right, appears on hover

- Hover state: scale(1.02), shadow lifts (`on-surface` at 8% opacity,

blur 24px, Y-offset 8px)

- **On hover overlay**: "Open Dashboard" Royal Blue pill button

fades in centered over the card

**Create New card**:

- Same size as gallery cards

- Background: `surface-container-lowest`

- Border: 2px dashed `surface-container-high`

- Centered: large "+" icon (`on-surface-variant`),

"New Dashboard" label below in `body-md` Inter `on-surface-variant`

- Hover: border color transitions to Royal Blue `#00327d`,

"+" icon turns Royal Blue

### Settings Navigation (left column)

- Width: 200px

- Items: Account, Appearance, Billing

- Item height: 40px, `radius-sm` (8px)

- Inactive: `body-md` Inter, `on-surface-variant`, icon left

- **Active**: 3px left border in Royal Blue (`#00327d`),

`surface-container-low` background, `on-surface` text, icon in Royal Blue

- No full-color fill on active — left accent bar only

### Appearance Theme Selector

Three equal tile options: Light, Dark, System

- Tile size: roughly 120px wide, `radius-lg` (16px)

- Top area: mini UI preview screenshot

- Bottom: theme label centered, `label-md` Inter

- **Active**: 2px Royal Blue border, Royal Blue checkmark top-right corner

- Inactive: `surface-container-high` border

---

## 8. Elevation & Depth

Tada uses tonal layering, not shadows. Depth is a whisper, not a shout.

### The Layering Principle

Place `surface-container-lowest` (`#ffffff`) cards on a `surface`

(`#f7f9fb`) background. The contrast in lightness provides natural,

soft lift. No drop shadows needed for standard cards.

### When Shadows Are Permitted

Only for floating elements (dropdowns, modals, hover-lifted cards):

- Color: `on-surface` (`#191c1e`) at 4% opacity

- Blur: 32px

- Y-offset: 8px only

- No X-offset, no spread

### The Ghost Border Fallback

If a border is required for accessibility reasons:

- Color: `on-surface` at 12% opacity only

- **100% opaque borders are strictly forbidden**

---

## 9. Design Guardrails

### Always

- Use surface tiers to create hierarchy — never 1px solid borders

- Use Manrope for every number, metric, and KPI

- Give the first KPI card the full Royal Blue hero treatment

- Keep the FAB as the only AI surface — no embedded chat bars in cards

- Round every corner — minimum `radius-xs` (6px) on everything

- Use Royal Blue only where action or primary emphasis is needed

- Ensure all text on Royal Blue backgrounds uses white (`on-primary`)

- Space cards generously — `space-xl` (32px) gap minimum

### Never

- Never use 1px solid borders to separate sections

- Never use pure black (`#000000`) — use `on-surface` (`#191c1e`)

- Never use standard blue (`#0000ff`) — always Royal Blue tokens

- Never use red for chart lines — red is `status-negative` only

- Never add a second AI surface — the FAB is the only one

- Never use sharp corners — `border-radius` below 6px is forbidden

- Never use dark panels inside chart cards — chart backgrounds are white

- Never use multiple accent colors — Royal Blue is the only chromatic accent

- Never use solid saturated fills on status badges — tints only

- Never use glassmorphism — that component was removed from the system

- Never clutter — if a card is not a "Tada moment," move it to a secondary tab

---

## 10. Screen Inventory

| Screen | Route | Key Components |

|--------|-------|----------------|

| Dashboard | /dashboard | Top nav, KPI row (hero + 3 standard), bento chart grid, bottom metric row, chatbot FAB |

| Dashboards | /dashboards | Top nav, page title + action bar, upload drop zone, gallery card grid, create new ghost card, pagination |

| Settings | /settings | Top nav, two-column layout (settings nav + content), Account card, Appearance card, Billing card |