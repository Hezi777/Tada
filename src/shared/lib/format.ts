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
  for (const { pattern, symbol } of CURRENCY_SYMBOL_PATTERNS) {
    if (pattern.test(name)) {
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
  /price|revenue|cost|amount|total|salary|sales|income|expense|מחיר|הכנסה|הוצאה|עלות|שכר|סכום|מכירות|תשלום/i;

/** Heuristic: does this column name look like money? */
export function looksLikeCurrencyColumn(name: string): boolean {
  return CURRENCY_NAME_PATTERN.test(name);
}

/** Ellipsis-truncate long labels (full text belongs in a tooltip). */
export function truncateLabel(label: string, maxLength = 14): string {
  if (label.length <= maxLength) {
    return label;
  }
  return `${label.slice(0, maxLength - 1)}…`;
}
