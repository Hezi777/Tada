import type { Column, ColumnKind } from "./types";

type Row = Record<string, unknown>;

const IDENTIFIER_NAME_PATTERN = /(^|[_\s-])(id|uuid|key|hash)([_\s-]|$)/i;
const DIMENSION_NAME_PATTERN =
  /(^|[_\s-])(category|vendor|supplier|product|service|region|department|channel|status|type|name|title)([_\s-]|$)|קטגוריה|ספק|מוצר|אזור|מחלקה|ערוץ|סטטוס|שם|כותרת/i;

function isNonEmpty(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

function isFiniteNumberValue(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed);
  }
  return false;
}

function isDateLike(value: unknown): boolean {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime());
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }
    const digitsOnly = /^[0-9]+$/.test(trimmed);
    if (digitsOnly) {
      if (trimmed.length === 8) {
        const asNumber = Number(trimmed);
        return asNumber >= 19000101 && asNumber <= 21001231;
      }
      return false;
    }
    return Number.isFinite(Date.parse(trimmed));
  }
  return false;
}

function getColumnNames(rows: Row[]): string[] {
  if (rows.length === 0) {
    return [];
  }
  const orderedNames: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        orderedNames.push(key);
      }
    }
  }
  return orderedNames;
}

function classifyColumn(name: string, values: unknown[]): ColumnKind {
  const nonEmptyValues = values.filter(isNonEmpty);
  const nonEmptyCount = nonEmptyValues.length;
  if (nonEmptyCount === 0) {
    return "ignored";
  }

  const lowerName = name.toLowerCase();
  if (IDENTIFIER_NAME_PATTERN.test(lowerName)) {
    return "ignored";
  }

  let numericCount = 0;
  let dateCount = 0;
  let stringCount = 0;
  let stringLengthTotal = 0;
  const uniqueValues = new Set<string>();

  for (const value of nonEmptyValues) {
    if (isFiniteNumberValue(value)) {
      numericCount += 1;
    }
    if (isDateLike(value)) {
      dateCount += 1;
    }
    if (typeof value === "string") {
      stringCount += 1;
      stringLengthTotal += value.length;
    }
    uniqueValues.add(typeof value === "string" ? value : JSON.stringify(value));
  }

  const uniqueCount = uniqueValues.size;
  const uniqueRatio = uniqueCount / nonEmptyCount;
  const avgStringLength =
    stringCount === 0 ? 0 : stringLengthTotal / stringCount;

  // Dates are naturally near-unique, so they must be detected before the
  // high-uniqueness "ignored" heuristic. Numeric dominance wins ties (e.g.
  // plain integers that happen to parse as dates).
  const numericRatio = numericCount / nonEmptyCount;
  const dateRatio = dateCount / nonEmptyCount;
  if (dateRatio >= 0.8 && numericRatio < 0.8) {
    return "date";
  }

  if (numericRatio >= 0.8) {
    return "numeric";
  }

  const stringLike = stringCount / nonEmptyCount >= 0.8;
  if (
    stringLike &&
    DIMENSION_NAME_PATTERN.test(name) &&
    uniqueCount <= 50 &&
    avgStringLength <= 30
  ) {
    return "categorical";
  }

  if (uniqueRatio > 0.9 || avgStringLength > 30) {
    return "ignored";
  }

  if (stringLike && uniqueRatio <= 0.2 && uniqueCount <= 50) {
    return "categorical";
  }

  return "ignored";
}

export function inferColumns(rows: Row[]): Column[] {
  const names = getColumnNames(rows);
  return names.map((name) => {
    const values = rows.map((row) => row[name]);
    return {
      name,
      kind: classifyColumn(name, values),
    };
  });
}
