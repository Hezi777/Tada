# Nano Banana 2 Prompts — KPI Illustration Set

## Best practices (Nano Banana / Gemini image models, June 2026)

- **Describe the scene in plain English, don't list keywords or JSON.**
  Google's own guidance: a narrative, descriptive paragraph almost always
  beats a tag list or structured spec for Gemini image models — its
  strength is language understanding, and conversational prompts get
  better results than comma-separated tokens. ([Google DeepMind prompt
  guide](https://deepmind.google/models/gemini-image/prompt-guide/),
  [Google Developers
  Blog](https://developers.googleblog.com/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/))
- **Be specific about each part's color, in one sentence per part.** The
  earlier rainbow-striped arrow happened because a list of "accent colors"
  (teal, green, indigo, sky blue) was given without saying *where* each
  one goes — the model spread them across one shape as bands. Instead,
  say e.g. "the arrow is a single solid royal-blue gradient shape" as its
  own sentence.
- **Consistency via reference images**: after the anchor (`revenue`) is
  done, attach it (plus 1-2 later results, and your style-reference photo
  if you have one) to every later prompt and add: *"Generate an image that
  matches the rendering style, material, lighting, and color palette of
  the attached reference image exactly, but change the subject to: ..."*
- **Iterate conversationally**: if a result is close but off, reply in
  the same chat with a small correction ("make the arrow a single solid
  blue, remove the stripes") instead of rewriting the whole prompt from
  scratch.
- **Resolution/aspect ratio**: ask for **square, 1:1, 2K** — these are
  small card decorations, not hero banners.
- **Background**: ask for a solid flat near-black (#0A0A0F) background
  instead of "transparent" — Gemini image models don't actually output
  alpha transparency; a "transparent" request just gets rendered as a
  literal checkerboard pattern baked into the pixels. A flat near-black
  background can be chroma-keyed out afterward (luminance-based), and any
  reflection spill from it onto glossy white/cream surfaces reads as
  natural gray shading/ambient occlusion rather than an off-palette color
  cast — unlike the magenta we tried first, which left a visible pink tint
  on white surfaces in several icons.
- **No literal glyphs**: never ask for currency symbols, %, #, or any
  text/numbers — the model renders these as garbled shapes. Represent
  numeric ideas with abstract forms (coins, arrows, rings, bars) instead.
- **One cohesive object**: ask for a single connected form. Prompts that
  describe 2-3 separate "floating" pieces tend to render as disjointed
  clutter.

## How to use

Each numbered block below is a full, ready-to-paste prompt — master style
+ subject combined into one message. Paste it as-is into AI Studio.

For #2 onward, you'll get more consistent results if you also attach the
accepted `kpi-revenue.png` (and any other accepted results) as reference
images and prepend this line to the prompt:

> Generate an image that matches the rendering style, material, lighting,
> and color palette of the attached reference image(s) exactly, but change
> the subject to the following:

---

## 1. `kpi-revenue.png` — Revenue / Sales (anchor image)

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is a stack of five or six coins, all rendered in solid gold.
> Give each coin a clearly raised rim around its flat circular face and a
> fine ridged, milled texture around its thin edge, the way a real coin
> looks — this should not look like a stack of poker chips or jar lids.
> Their faces are plain and blank. Standing in front of the coin stack,
> leaning against it, is a single arrow shape that curves smoothly upward
> and to the right, ending in a chunky triangular arrowhead — it overlaps
> the front of the coins so the two read as one combined object, not two
> separate things side by side. The arrow is one continuous shape rendered
> entirely in a solid royal-blue gradient (#00327D to #2F6DF6) — it should
> not have any other colors, bands, or stripes on it.

---

## 2. `kpi-customers.png` — Users / Customers

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is two rounded "person" avatar shapes — simple rounded
> head-and-shoulders blobs with no faces — overlapping closely so they
> form one combined silhouette. The front, larger figure is a solid
> royal-blue gradient. The figure behind it is solid white/cream.

---

## 3. `kpi-conversion.png` — Conversion / Rate

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is a single glossy funnel: a wide rounded rim at the top
> tapering down to a narrow spout at the bottom, the entire funnel body
> rendered in a solid royal-blue gradient. A single sphere sits inside the
> funnel's wide top opening, partly visible and touching the funnel's
> inner wall. That sphere is solid teal (#14B8A6) — the only other color
> in the image.

---

## 4. `kpi-time.png` — Time / Duration

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is a rounded alarm-clock body shaped like a thick cylinder
> with a completely blank face — no numbers, no tick marks. The body is
> solid white/cream. Two small rounded bell-bumps on top of the clock and
> the clock hands on its face are solid royal-blue gradient. A thin
> motion-trail arc wraps around the clock's upper-right edge and touches
> the body; render that trail arc in solid teal (#14B8A6) — the only
> accent color.

---

## 5. `kpi-orders.png` — Orders / Cart

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is a rounded 3D shopping basket with a solid white/cream
> body. Nested inside the basket are two small rounded cube-shaped
> packages, sitting against each other: one cube is solid royal-blue
> gradient and the other is solid teal (#14B8A6). The whole thing should
> read as one combined object.

---

## 6. `kpi-growth.png` — Growth / Trend

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is three rounded bar-chart blocks of increasing height,
> standing side by side and touching each other. The shortest bar is solid
> white/cream, the middle bar is solid sky-blue (#7DD3FC), and the tallest
> bar is solid royal-blue gradient — each bar is exactly one color, with
> no gradients or stripes mixing between bars. A single ribbon rises
> smoothly from the top of the shortest bar, runs across the tops of the
> other two, and ends above the tallest bar in a chunky arrowhead; render
> that ribbon entirely in solid royal-blue gradient.

---

## 7. `kpi-security.png` — Security / Compliance

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is a thick rounded shield with a solid white/cream body and a
> soft blue glow ring around its edge. Embossed on the shield's face is a
> bold, chunky checkmark made of two thick rounded bars meeting at an
> angle — not a typed character, a sculpted 3D shape. Render that
> checkmark in solid green (#22C55E), the only accent color.

---

## 8. `kpi-system.png` — System / Load / Capacity

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is a rounded speedometer dial — a thick semi-circular gauge —
> sitting on a small rounded base. The base is solid white/cream. The
> gauge arc itself is one smooth color gradient that sweeps from teal
> (#14B8A6) at the low end, through sky-blue (#7DD3FC), to royal-blue at
> the high end. A single needle points toward the high end, rendered in
> solid royal-blue gradient.

---

## 9. `kpi-region.png` — Region / Geo / Market

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is a rounded 3D globe — a sphere rendered in solid royal-blue
> gradient with a few smooth cream landmass shapes raised on its surface.
> A single chunky location-pin shape stands planted on top of the globe,
> its base merging into the sphere so the two read as one connected
> object. Render the pin in solid teal (#14B8A6) — the only accent color.

---

## 10. `kpi-comparison.png` — Comparison / Balance (LTV/CAC)

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is a rounded balance scale viewed slightly from above: a
> central pillar with two small rounded trays extending from it at
> slightly different heights. The pillar and trays are solid white/cream.
> One tray holds a small sphere rendered in solid royal-blue gradient; the
> other tray holds a small sphere rendered in solid teal (#14B8A6). These
> two spheres are the only colors besides the cream body.

---

## 11. `kpi-count.png` — Generic Count

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is a small stack of three rounded cubes arranged in a
> pyramid — two on the bottom, one on top — all touching each other. The
> two bottom cubes are solid white/cream. The top cube is solid royal-blue
> gradient. None of the cubes have any marks, symbols, or text on them.

---

## 12. `kpi-daterange.png` — Date Range

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is a thick rounded desk-calendar block with a solid
> white/cream body and two small cylindrical rings standing up above its
> top edge, like a desk calendar's binding. Across the top of the block
> runs a rounded header band rendered in solid royal-blue gradient. The
> face of the block shows a grid of small rounded square tiles — all solid
> white/cream, except two or three adjacent tiles that sit slightly raised
> and are rendered in solid teal (#14B8A6). None of the tiles have numbers
> on them.

---

## 13. `kpi-average.png` — Average / Activity

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is a rounded rectangular card with a solid white/cream body.
> Across its face runs a single continuous heartbeat/pulse line with one
> peak, sculpted as a thick rounded tube embedded in the card's surface,
> glowing softly at its peak. Render that pulse line in solid royal-blue
> gradient — the only color besides the cream card body.

---

## 14. `kpi-target.png` — Target / Goal

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is a rounded 3D dartboard viewed slightly from above, made of
> concentric rings that alternate between solid white/cream and solid
> royal-blue gradient — each ring is exactly one of those two colors, with
> no blending between them. A single dart is stuck in the center ring,
> touching the board. Render the dart's body in solid green (#22C55E) and
> its tail fins in solid teal (#14B8A6) — the only accent colors.

---

## 15. `kpi-payment.png` — Payment / Credit

> Generate a single 3D-rendered object that looks like a glossy
> injection-molded plastic toy or collectible figurine, photographed as
> studio product photography on a plain background. The whole object is
> thick, chunky, and rounded — no thin lines, no flat icon shapes, no
> sharp edges. The surface is smooth glossy plastic with bright white
> specular highlights and soft mirror-like reflections on every curved
> part. Light the scene with bright three-point studio lighting coming
> from the upper-left, casting soft rounded shadows on the object and a
> soft drop shadow on the ground beneath it. Frame it in an
> isometric-leaning 3/4 view, centered in the square frame and filling
> about 70% of it with even padding on all sides. The background must be
> a solid, flat, even near-black color (#0A0A0F), with no gradient, texture,
> or pattern of any kind — just one uniform flat color, since it will be
> removed afterward. Render as a square 1:1 PNG at 2K. Do not include any
> text, numbers, letters, currency symbols, percent signs, hash marks,
> logos, watermarks, or human faces — if the subject involves a number,
> currency, or percentage idea, represent it with an abstract shape (a
> coin, an arrow, a ring, a bar) instead of an actual character. The
> object should be a single connected form, not several separate floating
> pieces.
>
> The object is a thick rounded credit card with a solid royal-blue
> gradient body, tilted slightly so it clearly reads as a 3D object rather
> than a flat card. Embossed on its face are a small rounded chip
> rectangle, rendered in solid cream, and a stripe band near the top,
> rendered in solid teal (#14B8A6). These are the only additional colors,
> and there is no text or numbers anywhere on the card.
