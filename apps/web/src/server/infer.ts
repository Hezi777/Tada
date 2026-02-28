import type { Column, ColumnKind } from "./types";

type Row = Record<string, unknown>;

const IGNORE_NAME_TOKENS = ["id", "uuid", "key", "hash", "title", "name"];

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
  if (IGNORE_NAME_TOKENS.some((token) => lowerName.includes(token))) {
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
  const avgStringLength = stringCount === 0 ? 0 : stringLengthTotal / stringCount;

  if (uniqueRatio > 0.9 || avgStringLength > 30) {
    return "ignored";
  }

  const numericRatio = numericCount / nonEmptyCount;
  if (numericRatio >= 0.8) {
    return "numeric";
  }

  const dateRatio = dateCount / nonEmptyCount;
  if (dateRatio >= 0.8) {
    return "date";
  }

  const stringLike = stringCount / nonEmptyCount >= 0.8;
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

export function pickPrimaryColumns(columns: Column[]): {
  primaryNumeric: Column | null;
  primaryCategory: Column | null;
  primaryDate: Column | null;
} {
  const primaryNumeric = columns.find((column) => column.kind === "numeric") ?? null;
  const primaryCategory = columns.find((column) => column.kind === "categorical") ?? null;
  const primaryDate = columns.find((column) => column.kind === "date") ?? null;
  return { primaryNumeric, primaryCategory, primaryDate };
}
