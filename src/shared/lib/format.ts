// Israeli-first display formatting. Numbers/dates/currency stay LTR even
// inside RTL Hebrew text via Unicode bidi isolation (FSI/PDI).

const FSI = "⁨"; // FIRST STRONG ISOLATE
const PDI = "⁩"; // POP DIRECTIONAL ISOLATE
const LRI = "⁦"; // LEFT-TO-RIGHT ISOLATE

export function bidiIsolate(text: string): string {
  return `${FSI}${text}${PDI}`;
}

/** Force LTR rendering for numeric/date content embedded in RTL text. */
export function ltrIsolate(text: string): string {
  return `${LRI}${text}${PDI}`;
}

export function containsHebrew(text: string): boolean {
  return /[֐-׿]/.test(text);
}

/** 1234567.8 -> "1.2M"; keeps small numbers exact with separators. */
export function abbreviateNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${trimTrailingZero((value / 1_000_000_000).toFixed(1))}B`;
  }
  if (abs >= 1_000_000) {
    return `${trimTrailingZero((value / 1_000_000).toFixed(1))}M`;
  }
  if (abs >= 10_000) {
    return `${trimTrailingZero((value / 1_000).toFixed(1))}K`;
  }
  return formatNumber(value);
}

function trimTrailingZero(text: string): string {
  return text.replace(/\.0$/, "");
}

/** Thousands separators, max 2 decimals. */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Currency symbol before the number, no space, bidi-isolated. Defaults to $. */
export function formatCurrency(
  value: number,
  symbol = "$",
  abbreviate = false,
): string {
  const amount = abbreviate ? abbreviateNumber(value) : formatNumber(value);
  return ltrIsolate(`${symbol}${amount}`);
}

/** ₪ before the number, no space (Academy of the Hebrew Language). */
export function formatILS(value: number, abbreviate = false): string {
  return formatCurrency(value, "₪", abbreviate);
}

// Currency the column name explicitly states. Symbols match anywhere; codes
// and words use boundaries so "Europe"/"poundage" don't false-positive.
const CURRENCY_SYMBOL_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  symbol: string;
}> = [
  { pattern: /₪|\bils\b|\bnis\b|shekels?|שקל/i, symbol: "₪" },
  { pattern: /€|\beuros?\b|\beur\b/i, symbol: "€" },
  { pattern: /£|\bgbp\b|\bpounds?\b/i, symbol: "£" },
  { pattern: /\$|\busd\b|\bdollars?\b/i, symbol: "$" },
];

/** The currency a column name explicitly states (e.g. "Price (₪)" -> "₪"),
 * or null when it reads like money but names no currency. Callers default to $. */
export function detectCurrencySymbol(name: string): string | null {
  const normalizedName = name.replace(/[_-]+/g, " ");
  for (const { pattern, symbol } of CURRENCY_SYMBOL_PATTERNS) {
    if (pattern.test(normalizedName)) {
      return symbol;
    }
  }
  return null;
}

/** DD/MM/YYYY, the Israeli display convention. Accepts Date or ISO string. */
export function formatDateIL(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return ltrIsolate(`${day}/${month}/${date.getUTCFullYear()}`);
}

const CURRENCY_NAME_PATTERN =
  /price|revenue|profit|cost|amount|total|salary|sales|income|expense|מחיר|הכנסה|רווח|הוצאה|עלות|שכר|סכום|מכירות|תשלום/i;
const NON_CURRENCY_RATE_PATTERN =
  /margin|percentage|percent|pct|rate|ratio|שוליים|אחוז|שיעור|יחס/i;

/** Heuristic: does this column name look like money? */
export function looksLikeCurrencyColumn(name: string): boolean {
  return (
    CURRENCY_NAME_PATTERN.test(name) && !NON_CURRENCY_RATE_PATTERN.test(name)
  );
}

const RATIO_NAME_PATTERN =
  /discount|margin|percentage|percent|pct|rate|ratio|share|הנחה|שוליים|אחוז|שיעור|יחס/i;

/**
 * Heuristic: is this a proportion stored as a 0–1 fraction?
 *
 * Both halves are required. The name alone is not enough — a "conversion
 * rate" column may already be stored as 12.5, and multiplying that by 100
 * would be worse than leaving it alone. The magnitude alone is not enough
 * either, or every small average would sprout a percent sign. Only a
 * ratio-shaped name holding a ratio-shaped value gets converted.
 *
 * A true 100% lands exactly on 1 and is included; anything above is assumed
 * to be already expressed in percentage points.
 */
export function looksLikeRatioColumn(name: string, value: number): boolean {
  return RATIO_NAME_PATTERN.test(name) && Math.abs(value) <= 1;
}

/** `0.09` → `9%`. Sub-one-point values keep a decimal so they don't read as 0%. */
export function formatRatioAsPercent(value: number): string {
  const points = value * 100;
  const decimals = Math.abs(points) < 10 && !Number.isInteger(points) ? 1 : 0;
  return ltrIsolate(`${points.toFixed(decimals)}%`);
}

const LOWER_IS_BETTER_PATTERN =
  /discount|refund|churn|bounce|latency|cost|expense|error|defect|complaint|cancel|return|הנחה|זיכוי|נטישה|עלות|הוצאה|שגיאה|ביטול/i;

/**
 * Which direction is good news for this metric.
 *
 * Colouring every rise green is wrong for cost-like measures: a growing
 * average discount erodes margin, and painting that emerald tells the reader
 * the opposite of the truth. The arrow always shows the real direction; only
 * the colour flips.
 */
export function metricPolarity(name: string): "direct" | "inverse" {
  return LOWER_IS_BETTER_PATTERN.test(name) ? "inverse" : "direct";
}

/** Ellipsis-truncate long labels (full text belongs in a tooltip). */
export function truncateLabel(label: string, maxLength = 14): string {
  if (label.length <= maxLength) {
    return label;
  }
  // Truncate at the logical end and bidi-isolate the result so the ellipsis
  // renders on the correct visual side of RTL/mixed-direction labels.
  return bidiIsolate(`${label.slice(0, maxLength - 1)}…`);
}
