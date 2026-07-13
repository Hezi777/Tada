import sharp from "sharp";
import path from "node:path";
import os from "node:os";

const downloads = path.join(os.homedir(), "Downloads");
const outDir = path.join(process.cwd(), "public/illustrations/kpi");

const MAP = {
  "Generated Image June 14, 2026 - 2_43PM.jpg": "kpi-revenue.png",
  "Generated Image June 14, 2026 - 2_43PM (1).jpg": "kpi-customers.png",
  "Generated Image June 14, 2026 - 2_43PM (2).jpg": "kpi-conversion.png",
  "Generated Image June 14, 2026 - 2_43PM (3).jpg": "kpi-time.png",
  "Generated Image June 14, 2026 - 2_43PM (4).jpg": "kpi-orders.png",
  "Generated Image June 14, 2026 - 2_43PM (5).jpg": "kpi-growth.png",
  "Generated Image June 14, 2026 - 2_43PM (6).jpg": "kpi-system.png",
  "Generated Image June 14, 2026 - 2_43PM (7).jpg": "kpi-region.png",
  "Generated Image June 14, 2026 - 2_43PM (8).jpg": "kpi-comparison.png",
  "Generated Image June 14, 2026 - 2_43PM (9).jpg": "kpi-count.png",
  "Generated Image June 14, 2026 - 2_43PM (10).jpg": "kpi-daterange.png",
  "Generated Image June 14, 2026 - 2_43PM (11).jpg": "kpi-target.png",
  "Generated Image June 14, 2026 - 2_44PM.jpg": "kpi-payment.png",
  "Generated Image June 14, 2026 - 2_44PM (1).jpg": "kpi-security.png",
  "Generated Image June 14, 2026 - 2_45PM.jpg": "kpi-average.png",
};

// Strict color-distance key: only pixels close in RGB to the background
// color itself get keyed out. Dark navy/blue shading on the icons (e.g. the
// conversion funnel's shadowed cone) has similar luminance to the near-black
// background but a very different hue, so it stays opaque. The background
// color is sampled per-image from a corner pixel since render output can
// drift slightly from the requested #0A0A0F.
const DIST_LOW = 10; // color distance at/below this is fully transparent
const DIST_HIGH = 22; // color distance at/above this is fully opaque

// Second tier: the soft drop shadow some renders bake onto the background
// plane is a neutral gray gradient, fading from the background color toward
// the object — too far from the background color (in tier 1) to be keyed,
// but it's not part of the object either. Key it out too, but only for
// low-saturation (neutral gray) pixels, so saturated object shading (e.g.
// the funnel's dark navy cone) is left untouched.
const SAT_THRESHOLD = 12; // max(r,g,b) - min(r,g,b) below this is "neutral"
const SHADOW_LUM_LOW = 14; // neutral luminance at/below this is fully transparent
const SHADOW_LUM_HIGH = 130; // neutral luminance at/above this is fully opaque

for (const [src, dest] of Object.entries(MAP)) {
  const srcPath = path.join(downloads, src);
  const destPath = path.join(outDir, dest);

  const img = sharp(srcPath).ensureAlpha();
  const { data, info } = await img
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // Sample the background color from a corner pixel.
  const bg = { r: data[0], g: data[1], b: data[2] };

  for (let i = 0; i < width * height; i++) {
    const idx = i * channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const dist = Math.sqrt(
      (r - bg.r) ** 2 + (g - bg.g) ** 2 + (b - bg.b) ** 2,
    );

    let keyAmount;
    if (dist <= DIST_LOW) {
      keyAmount = 1;
    } else if (dist >= DIST_HIGH) {
      keyAmount = 0;
    } else {
      keyAmount = (DIST_HIGH - dist) / (DIST_HIGH - DIST_LOW);
    }

    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    if (saturation < SAT_THRESHOLD) {
      const luminance = (r + g + b) / 3;
      let shadowAmount;
      if (luminance <= SHADOW_LUM_LOW) {
        shadowAmount = 1;
      } else if (luminance >= SHADOW_LUM_HIGH) {
        shadowAmount = 0;
      } else {
        shadowAmount =
          (SHADOW_LUM_HIGH - luminance) / (SHADOW_LUM_HIGH - SHADOW_LUM_LOW);
      }
      keyAmount = Math.max(keyAmount, shadowAmount);
    }

    let alpha = Math.round((1 - keyAmount) * 255);
    // Snap near-zero alpha to fully transparent — at very low alpha the
    // decontamination division below blows up small color differences.
    if (alpha < 15) alpha = 0;
    data[idx + 3] = alpha;

    // Decontaminate edge pixels: remove the background color mixed into
    // the color by the original compositing.
    if (alpha > 0 && alpha < 255) {
      const a = alpha / 255;
      data[idx] = Math.min(255, Math.max(0, Math.round((r - bg.r * (1 - a)) / a)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.round((g - bg.g * (1 - a)) / a)));
      data[idx + 2] = Math.min(255, Math.max(0, Math.round((b - bg.b * (1 - a)) / a)));
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .resize(512, 512)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(destPath);

  console.log(`${src} -> ${dest}`);
}
